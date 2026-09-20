import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_DAYS = 30;
const USER_AGENT = 'LeituraEncantada/1.0 (contato@leituraencantada.app)';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  publisher: string | null;
  published_date: string | null;
  language: string | null;
  source: 'catalog' | 'google_books' | 'open_library';
  catalog_id: string | null;
  google_books_id: string | null;
  open_library_id: string | null;
}

// --- ISBN: normalização, validação e conversão (mesma lógica de
// src/lib/isbn.ts - duplicada aqui porque a edge function roda isolada,
// sem acesso ao bundle do frontend). ---
function normalizeIsbn(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9X]/g, "");
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(isbn[i]);
  const checkDigit = isbn[9] === "X" ? 10 : Number(isbn[9]);
  sum += 10 * checkDigit;
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

function isValidIsbn(input: string): boolean {
  return isValidIsbn10(input) || isValidIsbn13(input);
}

function isbn10ToIsbn13(isbn10: string): string | null {
  if (!isValidIsbn10(isbn10)) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const checkDigit = (10 - (sum % 10)) % 10;
  return core + checkDigit;
}

// --- Catálogo próprio ---

async function findCatalogByIsbn(admin: ReturnType<typeof createClient>, isbn13: string | null, isbn10: string | null): Promise<Book | null> {
  if (isbn13) {
    const { data } = await admin.from('book_catalog').select('*').eq('isbn_13', isbn13).maybeSingle();
    if (data) return mapCatalogRow(data);
  }
  if (isbn10) {
    const { data } = await admin.from('book_catalog').select('*').eq('isbn_10', isbn10).maybeSingle();
    if (data) return mapCatalogRow(data);
  }
  return null;
}

async function findCatalogByText(admin: ReturnType<typeof createClient>, query: string): Promise<Book[]> {
  const pattern = `%${query}%`;
  const [byTitle, byAuthor] = await Promise.all([
    admin.from('book_catalog').select('*').ilike('title', pattern).limit(12),
    admin.from('book_catalog').select('*').ilike('authors', pattern).limit(12),
  ]);

  const rows = [...(byTitle.data || []), ...(byAuthor.data || [])];
  const uniqueById = new Map(rows.map((row) => [row.id, row]));
  return Array.from(uniqueById.values()).map(mapCatalogRow);
}

interface CatalogRow {
  id: string;
  title: string;
  authors: string | null;
  description: string | null;
  page_count: number | null;
  genre: string | null;
  cover_url: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
  publisher: string | null;
  published_date: string | null;
  language: string | null;
  google_books_id: string | null;
  open_library_id: string | null;
}

function mapCatalogRow(row: CatalogRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.authors || 'Autor desconhecido',
    description: row.description || 'Descrição não disponível',
    pages: row.page_count,
    genre: row.genre || 'Gênero não especificado',
    cover_url: row.cover_url,
    isbn: row.isbn_13 || row.isbn_10,
    isbn_10: row.isbn_10,
    isbn_13: row.isbn_13,
    publisher: row.publisher,
    published_date: row.published_date,
    language: row.language,
    source: 'catalog',
    catalog_id: row.id,
    google_books_id: row.google_books_id,
    open_library_id: row.open_library_id,
  };
}

// --- Cache de busca externa (evita rechamar as APIs pra buscas repetidas
// mesmo quando ninguém adicionou o livro ainda) ---

async function getCache(admin: ReturnType<typeof createClient>, key: { normalizedQuery?: string; isbn?: string }): Promise<Book[] | null> {
  let query = admin.from('book_search_cache').select('response_data').gt('expires_at', new Date().toISOString()).limit(1);
  query = key.isbn ? query.eq('isbn', key.isbn) : query.eq('normalized_query', key.normalizedQuery!);
  const { data } = await query.maybeSingle();
  return data ? (data.response_data as unknown as Book[]) : null;
}

async function setCache(admin: ReturnType<typeof createClient>, entry: {
  searchQuery: string;
  normalizedQuery?: string;
  isbn?: string;
  provider: string;
  books: Book[];
}) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin.from('book_search_cache').insert({
    search_query: entry.searchQuery,
    normalized_query: entry.normalizedQuery || null,
    isbn: entry.isbn || null,
    provider: entry.provider,
    response_data: entry.books as unknown as Record<string, unknown>[],
    expires_at: expiresAt,
  });
}

async function logSearch(admin: ReturnType<typeof createClient>, entry: {
  userId: string | null;
  searchType: 'isbn' | 'title_author';
  query: string;
  resolvedBy: string;
}) {
  try {
    await admin.from('book_search_log').insert({
      user_id: entry.userId,
      search_type: entry.searchType,
      query: entry.query,
      resolved_by: entry.resolvedBy,
    });
  } catch (error) {
    console.error('Error logging search (non-fatal):', error);
  }
}

async function getUserId(req: Request, admin: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await admin.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// --- Google Books ---

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
    publisher?: string;
    publishedDate?: string;
    language?: string;
  };
}

function mapGoogleVolume(item: GoogleVolume): Book {
  const info = item.volumeInfo || {};
  const isbn13 = info.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_13')?.identifier || null;
  const isbn10 = info.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_10')?.identifier || null;
  const cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

  return {
    id: `google:${item.id}`,
    title: info.title || 'Título não encontrado',
    author: info.authors?.length ? info.authors.join(', ') : 'Autor desconhecido',
    description: info.description || 'Descrição não disponível',
    pages: info.pageCount || null,
    genre: info.categories?.[0] || 'Gênero não especificado',
    cover_url: cover ? cover.replace(/^http:/, 'https:') : null,
    isbn: isbn13 || isbn10,
    isbn_10: isbn10,
    isbn_13: isbn13,
    publisher: info.publisher || null,
    published_date: info.publishedDate || null,
    language: info.language || null,
    source: 'google_books',
    catalog_id: null,
    google_books_id: item.id,
    open_library_id: null,
  };
}

async function searchGoogleBooks(query: string, apiKey: string): Promise<Book[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    console.error('Google Books API error:', response.status, data);
    return [];
  }
  return (data.items || []).filter((item: { volumeInfo?: { title?: string } }) => item.volumeInfo?.title).map(mapGoogleVolume);
}

async function fetchGoogleBooksByIsbn(isbn: string, apiKey: string): Promise<Book | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    console.error('Google Books ISBN lookup error:', response.status, data);
    return null;
  }
  const item = (data.items || []).find((i: { volumeInfo?: { title?: string } }) => i.volumeInfo?.title);
  return item ? mapGoogleVolume(item) : null;
}

// --- Open Library ---

interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
  isbn?: string[];
  language?: string[];
}

async function searchOpenLibrary(query: string): Promise<Book[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,number_of_pages_median,subject,isbn,language`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await response.json();
  if (!response.ok) {
    console.error('Open Library API error:', response.status, data);
    return [];
  }

  const docs: OpenLibraryDoc[] = (data.docs || []).filter((doc: OpenLibraryDoc) => doc.title);
  return docs.map((doc) => {
    const isbns = doc.isbn || [];
    const isbn13 = isbns.find((i) => i.replace(/[^0-9X]/g, '').length === 13) || null;
    const isbn10 = isbns.find((i) => i.replace(/[^0-9X]/g, '').length === 10) || null;
    return {
      id: doc.key,
      title: doc.title || 'Título não encontrado',
      author: doc.author_name?.length ? doc.author_name.join(', ') : 'Autor desconhecido',
      description: 'Descrição não disponível',
      pages: doc.number_of_pages_median || null,
      genre: doc.subject?.[0] || 'Gênero não especificado',
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
      isbn: isbn13 || isbn10,
      isbn_10: isbn10,
      isbn_13: isbn13,
      publisher: null,
      published_date: null,
      language: doc.language?.includes('por') ? 'pt' : (doc.language?.[0] || null),
      source: 'open_library' as const,
      catalog_id: null,
      google_books_id: null,
      open_library_id: doc.key,
    };
  });
}

async function fillOpenLibraryDescription(book: Book): Promise<Book> {
  try {
    const workResponse = await fetch(`https://openlibrary.org${book.id}.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (workResponse.ok) {
      const workData = await workResponse.json();
      if (typeof workData.description === 'string') return { ...book, description: workData.description };
      if (typeof workData.description?.value === 'string') return { ...book, description: workData.description.value };
    }
  } catch (error) {
    console.error('Error fetching work details for', book.id, error);
  }
  return book;
}

// Busca por ISBN é tratada como busca de identificador (edição específica),
// não uma busca textual genérica - usa o endpoint dedicado da Open Library
// que devolve os dados da EDIÇÃO (editora, data, páginas, capa), diferente
// do endpoint de busca textual que só devolve dados da "obra".
async function fetchOpenLibraryByIsbn(isbn: string): Promise<Book | null> {
  try {
    const editionResponse = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (!editionResponse.ok) return null;
    const edition = await editionResponse.json();

    const [authorName, description] = await Promise.all([
      resolveFirstAuthorName(edition.authors),
      resolveDescription(edition),
    ]);

    const isbn13 = edition.isbn_13?.[0] || (isValidIsbn13(isbn) ? isbn : null);
    const isbn10 = edition.isbn_10?.[0] || (isValidIsbn10(isbn) ? isbn : null);

    return {
      id: edition.key,
      title: edition.title || 'Título não encontrado',
      author: authorName || 'Autor desconhecido',
      description: description || 'Descrição não disponível',
      pages: edition.number_of_pages || null,
      genre: 'Gênero não especificado',
      cover_url: edition.covers?.[0] ? `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg` : null,
      isbn: isbn13 || isbn10,
      isbn_10: isbn10,
      isbn_13: isbn13,
      publisher: edition.publishers?.[0] || null,
      published_date: edition.publish_date || null,
      language: null,
      source: 'open_library',
      catalog_id: null,
      google_books_id: null,
      open_library_id: edition.key,
    };
  } catch (error) {
    console.error('Error fetching Open Library edition for ISBN', isbn, error);
    return null;
  }
}

async function resolveFirstAuthorName(authors: { key?: string }[] | undefined): Promise<string | null> {
  const authorKey = authors?.[0]?.key;
  if (!authorKey) return null;
  try {
    const response = await fetch(`https://openlibrary.org${authorKey}.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch {
    return null;
  }
}

interface OpenLibraryEdition {
  description?: string | { value?: string };
  works?: { key?: string }[];
}

async function resolveDescription(edition: OpenLibraryEdition): Promise<string | null> {
  if (typeof edition.description === 'string') return edition.description;
  if (typeof edition.description?.value === 'string') return edition.description.value;

  const workKey = edition.works?.[0]?.key;
  if (!workKey) return null;
  try {
    const response = await fetch(`https://openlibrary.org${workKey}.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const work = await response.json();
    if (typeof work.description === 'string') return work.description;
    if (typeof work.description?.value === 'string') return work.description.value;
    return null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');

    const trimmedQuery = query.trim();
    const normalizedIsbn = normalizeIsbn(trimmedQuery);
    const isIsbnSearch = isValidIsbn(normalizedIsbn);

    let books: Book[] = [];
    let resolvedBy = 'not_found';

    if (isIsbnSearch) {
      const isbn13 = isValidIsbn13(normalizedIsbn) ? normalizedIsbn : isbn10ToIsbn13(normalizedIsbn);
      const isbn10 = isValidIsbn10(normalizedIsbn) ? normalizedIsbn : null;

      const catalogHit = await findCatalogByIsbn(admin, isbn13, isbn10);
      if (catalogHit) {
        books = [catalogHit];
        resolvedBy = 'catalog';
      } else {
        const cacheKey = isbn13 || isbn10!;
        const cached = await getCache(admin, { isbn: cacheKey });
        if (cached) {
          books = cached;
          resolvedBy = 'cache';
        } else {
          const olBook = await fetchOpenLibraryByIsbn(isbn13 || isbn10!);
          if (olBook) {
            books = [olBook];
            resolvedBy = 'open_library';
          } else if (googleApiKey) {
            const gBook = await fetchGoogleBooksByIsbn(isbn13 || isbn10!, googleApiKey);
            if (gBook) {
              books = [gBook];
              resolvedBy = 'google_books';
            }
          }
          if (books.length > 0) {
            await setCache(admin, { searchQuery: trimmedQuery, isbn: cacheKey, provider: resolvedBy, books });
          } else {
            resolvedBy = 'not_found';
          }
        }
      }
    } else {
      const catalogHits = await findCatalogByText(admin, trimmedQuery);
      if (catalogHits.length > 0) {
        books = catalogHits;
        resolvedBy = 'catalog';
      } else {
        const normalizedQuery = trimmedQuery.toLowerCase();
        const cached = await getCache(admin, { normalizedQuery });
        if (cached) {
          books = cached;
          resolvedBy = 'cache';
        } else {
          const [googleResult, openLibraryResult] = await Promise.allSettled([
            googleApiKey ? searchGoogleBooks(trimmedQuery, googleApiKey) : Promise.resolve<Book[]>([]),
            searchOpenLibrary(trimmedQuery),
          ]);

          const googleBooks = googleResult.status === 'fulfilled' ? googleResult.value : [];
          if (googleResult.status === 'rejected') console.error('Google Books search failed:', googleResult.reason);

          const openLibraryBooks = openLibraryResult.status === 'fulfilled' ? openLibraryResult.value : [];
          if (openLibraryResult.status === 'rejected') console.error('Open Library search failed:', openLibraryResult.reason);

          const dedupeKey = (title: string, author: string) => {
            const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return `${normalize(title)}|${normalize(author.split(',')[0] || '')}`;
          };

          const googleKeys = new Set(googleBooks.map((b) => dedupeKey(b.title, b.author)));
          const uniqueOpenLibraryBooks = openLibraryBooks.filter((b) => !googleKeys.has(dedupeKey(b.title, b.author)));
          const enrichedOpenLibraryBooks = await Promise.all(uniqueOpenLibraryBooks.map(fillOpenLibraryDescription));

          books = [...googleBooks, ...enrichedOpenLibraryBooks];
          books.sort((a, b) => (a.language === 'pt' ? 0 : 1) - (b.language === 'pt' ? 0 : 1));

          if (books.length > 0) {
            resolvedBy = 'external_api';
            await setCache(admin, { searchQuery: trimmedQuery, normalizedQuery, provider: 'combined', books });
          } else {
            resolvedBy = 'not_found';
          }
        }
      }
    }

    const userId = await getUserId(req, admin);
    await logSearch(admin, {
      userId,
      searchType: isIsbnSearch ? 'isbn' : 'title_author',
      query: trimmedQuery,
      resolvedBy,
    });

    return new Response(JSON.stringify({ books, resolved_by: resolvedBy }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-books function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
