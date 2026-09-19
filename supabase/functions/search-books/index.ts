import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
  language: string | null;
}

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

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  categories?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
  language?: string;
}

interface GoogleVolume {
  id: string;
  volumeInfo?: GoogleVolumeInfo;
}

// Chave usada pra comparar livros de fontes diferentes e evitar duplicata
// na lista final (título + primeiro autor, sem acento/pontuação/caixa).
function dedupeKey(title: string, author: string): string {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  return `${normalize(title)}|${normalize(author.split(',')[0] || '')}`;
}

async function searchGoogleBooks(query: string, apiKey: string): Promise<Book[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error('Google Books API error:', response.status, data);
    return [];
  }

  const items: GoogleVolume[] = data.items || [];

  return items
    .filter((item) => item.volumeInfo?.title)
    .map((item) => {
      const info = item.volumeInfo!;
      const isbn =
        info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ||
        info.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier ||
        null;
      const cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

      return {
        id: `google:${item.id}`,
        title: info.title || 'Título não encontrado',
        author: info.authors?.length ? info.authors.join(', ') : 'Autor desconhecido',
        description: info.description || 'Descrição não disponível',
        pages: info.pageCount || null,
        genre: info.categories?.[0] || 'Gênero não especificado',
        cover_url: cover ? cover.replace(/^http:/, 'https:') : null,
        isbn,
        language: info.language === 'pt' ? 'pt' : null,
      };
    });
}

async function searchOpenLibrary(query: string): Promise<Book[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,number_of_pages_median,subject,isbn,language`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'LeituraEncantada/1.0 (contato@leituraencantada.app)' },
  });
  const data = await response.json();

  if (!response.ok) {
    console.error('Open Library API error:', response.status, data);
    return [];
  }

  const docs: OpenLibraryDoc[] = (data.docs || []).filter((doc) => doc.title);

  return docs.map((doc) => {
    const isPortuguese = doc.language?.includes('por') ?? false;
    return {
      id: doc.key,
      title: doc.title || 'Título não encontrado',
      author: doc.author_name?.length ? doc.author_name.join(', ') : 'Autor desconhecido',
      description: 'Descrição não disponível',
      pages: doc.number_of_pages_median || null,
      genre: doc.subject?.[0] || 'Gênero não especificado',
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
      isbn: doc.isbn?.[0] || null,
      language: isPortuguese ? 'pt' : null,
    };
  });
}

// A busca da Open Library não traz sinopse - só a página da "obra"
// (works/{id}.json) tem isso. Só vale a pena buscar pros itens que vão
// sobrar depois da deduplicação (o Google Books já vem com descrição).
async function fillOpenLibraryDescription(book: Book): Promise<Book> {
  try {
    const workResponse = await fetch(`https://openlibrary.org${book.id}.json`, {
      headers: { 'User-Agent': 'LeituraEncantada/1.0 (contato@leituraencantada.app)' },
    });
    if (workResponse.ok) {
      const workData = await workResponse.json();
      if (typeof workData.description === 'string') {
        return { ...book, description: workData.description };
      }
      if (typeof workData.description?.value === 'string') {
        return { ...book, description: workData.description.value };
      }
    }
  } catch (error) {
    console.error('Error fetching work details for', book.id, error);
  }
  return book;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');

    // Busca nas duas fontes em paralelo. Open Library é gratuita e sem
    // chave, mas fraca em editoras/autoras nacionais pequenas; Google
    // Books cobre isso bem melhor, mas exige API key (sem ela, não busca
    // e a função segue só com a Open Library, sem quebrar a busca).
    const [googleResult, openLibraryResult] = await Promise.allSettled([
      googleApiKey ? searchGoogleBooks(query, googleApiKey) : Promise.resolve<Book[]>([]),
      searchOpenLibrary(query),
    ]);

    const googleBooks = googleResult.status === 'fulfilled' ? googleResult.value : [];
    if (googleResult.status === 'rejected') {
      console.error('Google Books search failed:', googleResult.reason);
    }

    const openLibraryBooks = openLibraryResult.status === 'fulfilled' ? openLibraryResult.value : [];
    if (openLibraryResult.status === 'rejected') {
      console.error('Open Library search failed:', openLibraryResult.reason);
    }

    const googleKeys = new Set(googleBooks.map((b) => dedupeKey(b.title, b.author)));
    const uniqueOpenLibraryBooks = openLibraryBooks.filter(
      (b) => !googleKeys.has(dedupeKey(b.title, b.author))
    );

    const enrichedOpenLibraryBooks = await Promise.all(
      uniqueOpenLibraryBooks.map((b) => fillOpenLibraryDescription(b))
    );

    const books = [...googleBooks, ...enrichedOpenLibraryBooks];

    // Prioriza edições em português sem excluir as demais.
    books.sort((a, b) => (a.language === 'pt' ? 0 : 1) - (b.language === 'pt' ? 0 : 1));

    if (books.length === 0 && googleResult.status === 'rejected' && openLibraryResult.status === 'rejected') {
      return new Response(JSON.stringify({ error: 'Falha ao buscar livros', books: [] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ books }), {
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
