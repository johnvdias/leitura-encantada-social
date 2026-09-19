import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Busca na Open Library: gratuita e sem necessidade de chave de API
    // (o Google Books exige uma chave de API do Google Cloud para ter
    // qualquer cota de uso - sem ela, toda chamada falha com "quota
    // exceeded", mesmo sendo a primeira do dia).
    // Limitado a 12: cada resultado dispara uma 2ª chamada (works/{id}.json)
    // pra buscar a sinopse, em paralelo - 20 deixaria a busca mais lenta
    // sem ganho real, já que o usuário só vê poucos resultados por vez.
    const openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,number_of_pages_median,subject,isbn,language`;

    const response = await fetch(openLibraryUrl, {
      headers: { 'User-Agent': 'LeituraEncantada/1.0 (contato@leituraencantada.app)' },
    });
    const data = await response.json();

    if (!response.ok) {
      console.error('Open Library API error:', response.status, data);
      return new Response(JSON.stringify({ error: 'Falha ao consultar a Open Library', books: [] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const docs: OpenLibraryDoc[] = (data.docs || []).filter((doc) => doc.title);

    // A busca (search.json) não traz sinopse - só a página da "obra"
    // (works/{id}.json) tem isso. Busca os detalhes de cada resultado em
    // paralelo; se uma falhar, cai no placeholder só pra aquele item.
    const books = await Promise.all(
      docs.map(async (doc) => {
        const isPortuguese = doc.language?.includes('por') ?? false;
        let description = 'Descrição não disponível';

        if (doc.key) {
          try {
            const workResponse = await fetch(`https://openlibrary.org${doc.key}.json`, {
              headers: { 'User-Agent': 'LeituraEncantada/1.0 (contato@leituraencantada.app)' },
            });
            if (workResponse.ok) {
              const workData = await workResponse.json();
              if (typeof workData.description === 'string') {
                description = workData.description;
              } else if (typeof workData.description?.value === 'string') {
                description = workData.description.value;
              }
            }
          } catch (error) {
            console.error('Error fetching work details for', doc.key, error);
          }
        }

        return {
          id: doc.key,
          title: doc.title || 'Título não encontrado',
          author: doc.author_name?.length ? doc.author_name.join(', ') : 'Autor desconhecido',
          description,
          pages: doc.number_of_pages_median || null,
          genre: doc.subject?.[0] || 'Gênero não especificado',
          cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
          isbn: doc.isbn?.[0] || null,
          language: isPortuguese ? 'pt' : null,
        };
      })
    );

    // Prioriza edições em português sem excluir as demais.
    books.sort((a, b) => (a.language === 'pt' ? 0 : 1) - (b.language === 'pt' ? 0 : 1));

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
