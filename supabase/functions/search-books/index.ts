import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Search using Google Books API
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=pt&fields=items(id,volumeInfo(title,authors,description,pageCount,categories,imageLinks,industryIdentifiers))`;
    
    const response = await fetch(googleBooksUrl);
    const data = await response.json();

    if (!data.items) {
      return new Response(JSON.stringify({ books: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const books = data.items.map((item: any) => {
      const volumeInfo = item.volumeInfo;
      return {
        id: item.id,
        title: volumeInfo.title || 'Título não encontrado',
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido',
        description: volumeInfo.description || 'Descrição não disponível',
        pages: volumeInfo.pageCount || null,
        genre: volumeInfo.categories ? volumeInfo.categories[0] : 'Gênero não especificado',
        cover_url: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
        isbn: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || null
      };
    });

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