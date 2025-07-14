// Serviço para integração com Amazon Product Advertising API
// Nota: Para funcionar completamente, seria necess��rio um servidor backend
// pois a API da Amazon não pode ser chamada diretamente do frontend por questões de CORS

interface AmazonBookResult {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
  price?: string;
  amazon_url?: string;
  rating?: number;
  reviews_count?: number;
}

class AmazonBooksService {
  private accessKey = "AKPAASKTZU1752406905";
  private secretKey = "vx260nBYS74m3N9ivS5c4a1Q4QUL+X7osJx2IR9A";
  private region = "us-east-1";
  private endpoint = "webservices.amazon.com";

  // Busca real na API da Amazon através do backend
  async searchBooks(query: string): Promise<AmazonBookResult[]> {
    try {
      // Tentar usar a API real primeiro
      console.log("🔍 Trying backend API for Amazon search...");
      const realResults = await this.callBackendAPI(query);

      if (realResults && realResults.length > 0) {
        console.log(`✅ Backend returned ${realResults.length} results`);
        return realResults;
      }

      // Se backend não retornou resultados, usar fallback local
      console.log("⚠️ Backend returned no results, using local fallback");
      return this.getMockResults(query);
    } catch (error) {
      console.error("❌ Backend API failed:", error);

      // Em caso de erro, usar dados mockados como fallback
      console.log("📚 Using local mock data due to backend error");
      return this.getMockResults(query);
    }
  }

  // Dados mockados para demonstração
  private getMockResults(query: string): AmazonBookResult[] {
    const mockBooks: AmazonBookResult[] = [
      {
        id: "amazon-1",
        title: "Dom Casmurro",
        author: "Machado de Assis",
        description:
          "Um dos maiores clássicos da literatura brasileira, conta a história de Bentinho e Capitu.",
        pages: 256,
        genre: "Literatura Clássica",
        cover_url:
          "https://images-na.ssl-images-amazon.com/images/P/8525406627.01.L.jpg",
        isbn: "978-8525406620",
        price: "R$ 24,90",
        amazon_url: "https://amazon.com.br/dp/8525406627",
        rating: 4.5,
        reviews_count: 1247,
      },
      {
        id: "amazon-2",
        title: "O Cortiço",
        author: "Aluísio Azevedo",
        description:
          "Romance naturalista que retrata a vida em um cortiço carioca do século XIX.",
        pages: 304,
        genre: "Literatura Brasileira",
        cover_url:
          "https://images-na.ssl-images-amazon.com/images/P/8594318200.01.L.jpg",
        isbn: "978-8594318206",
        price: "R$ 19,90",
        amazon_url: "https://amazon.com.br/dp/8594318200",
        rating: 4.2,
        reviews_count: 856,
      },
      {
        id: "amazon-3",
        title: "Quarto de Despejo",
        author: "Carolina Maria de Jesus",
        description:
          "Diário de uma catadora de papel que vivia na favela do Canindé, em São Paulo.",
        pages: 200,
        genre: "Biografia",
        cover_url:
          "https://images-na.ssl-images-amazon.com/images/P/8508132040.01.L.jpg",
        isbn: "978-8508132041",
        price: "R$ 32,90",
        amazon_url: "https://amazon.com.br/dp/8508132040",
        rating: 4.8,
        reviews_count: 2134,
      },
      {
        id: "amazon-4",
        title: "Pequeno Príncipe",
        author: "Antoine de Saint-Exupéry",
        description:
          "Uma das obras mais traduzidas e vendidas do mundo, sobre amizade e humanidade.",
        pages: 96,
        genre: "Infantil",
        cover_url:
          "https://images-na.ssl-images-amazon.com/images/P/8595081512.01.L.jpg",
        isbn: "978-8595081512",
        price: "R$ 16,90",
        amazon_url: "https://amazon.com.br/dp/8595081512",
        rating: 4.9,
        reviews_count: 3247,
      },
      {
        id: "amazon-5",
        title: "Memórias Póstumas de Brás Cubas",
        author: "Machado de Assis",
        description:
          "Romance inovador narrado por um defunto autor, marco do Realismo brasileiro.",
        pages: 224,
        genre: "Literatura Clássica",
        cover_url:
          "https://images-na.ssl-images-amazon.com/images/P/8520925922.01.L.jpg",
        isbn: "978-8520925928",
        price: "R$ 27,90",
        amazon_url: "https://amazon.com.br/dp/8520925928",
        rating: 4.4,
        reviews_count: 967,
      },
    ];

    // Filtrar resultados baseados na query
    const filteredBooks = mockBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase()) ||
        book.genre.toLowerCase().includes(query.toLowerCase()),
    );

    // Se não houver filtros específicos, retornar livros populares
    return filteredBooks.length > 0 ? filteredBooks : mockBooks.slice(0, 3);
  }

  // Função para chamar o backend que integra com a Amazon API
  private async callBackendAPI(query: string): Promise<AmazonBookResult[]> {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    const url = `${backendUrl}/api/amazon/search?query=${encodeURIComponent(query)}`;

    console.log(`🌐 Calling backend: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log(`📡 Backend response status: ${response.status}`);

      // Sempre tenta ler como JSON primeiro
      let data;
      try {
        data = await response.json();
        console.log(`📦 Backend response data:`, data);
      } catch (parseError) {
        console.error(`Failed to parse response as JSON:`, parseError);
        throw new Error(`Backend returned invalid JSON: ${response.status}`);
      }

      // Verificar se a resposta indica erro
      if (!response.ok) {
        const errorMessage =
          data?.message ||
          data?.error ||
          `Backend API error: ${response.status}`;
        console.error(`Backend error response:`, data);
        throw new Error(errorMessage);
      }

      if (data.success && data.books && Array.isArray(data.books)) {
        console.log(
          `✅ Successfully got ${data.books.length} books from ${data.source || "unknown"} source`,
        );
        return data.books;
      } else {
        throw new Error(data.message || "Invalid response format from backend");
      }
    } catch (error) {
      console.error("❌ Backend API call failed:", error);
      throw error;
    }
  }

  // Função legacy mantida para referência
  private async callAmazonAPI(query: string): Promise<AmazonBookResult[]> {
    // Esta implementação foi movida para o backend
    // Use callBackendAPI() em vez desta função
    throw new Error(
      "Use callBackendAPI() - Amazon API is now handled by backend",
    );
  }

  // Converter resultado da Amazon para formato interno
  private mapAmazonResultToBook(amazonItem: any): AmazonBookResult {
    return {
      id: `amazon-${amazonItem.ASIN}`,
      title: amazonItem.ItemInfo?.Title?.DisplayValue || "",
      author: amazonItem.ItemInfo?.ByLineInfo?.Contributors?.[0]?.Name || "",
      description:
        amazonItem.ItemInfo?.Features?.DisplayValues?.join(" ") || "",
      pages: amazonItem.ItemInfo?.ContentInfo?.PagesCount?.DisplayValue || null,
      genre: "Livro", // Seria extraído dos metadados
      cover_url: amazonItem.Images?.Primary?.Large?.URL || null,
      isbn: amazonItem.ItemInfo?.ExternalIds?.ISBNs?.[0]?.DisplayValue || null,
      price: amazonItem.Offers?.Listings?.[0]?.Price?.DisplayAmount || null,
      amazon_url: amazonItem.DetailPageURL || null,
      rating: null, // Seria obtido de outra API
      reviews_count: null,
    };
  }
}

export const amazonBooksService = new AmazonBooksService();
export type { AmazonBookResult };

// Instruções para implementação completa:
/*
IMPLEMENTAÇÃO BACKEND NECESSÁRIA:

1. Criar endpoint no backend (ex: /api/amazon/search)
2. Instalar aws4 para assinar requests: npm install aws4
3. Implementar autenticação Amazon PA-API:


const aws4 = require('aws4');

app.get('/api/amazon/search', async (req, res) => {
  const { query } = req.query;
  
  const request = {
    method: 'POST',
    url: 'https://webservices.amazon.com/paapi5/searchitems',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    },
    body: JSON.stringify({
      Keywords: query,
      Resources: ['Images.Primary.Large', 'ItemInfo.Title', ...],
      SearchIndex: 'Books',
      Marketplace: 'www.amazon.com.br',
      PartnerTag: 'seu-partner-tag',
      PartnerType: 'Associates'
    })
  };
  
  // Assinar request com AWS4
  aws4.sign(request, {
    accessKeyId: process.env.AMAZON_ACCESS_KEY,
    secretAccessKey: process.env.AMAZON_SECRET_KEY
  });
  
  // Fazer chamada para Amazon
  const response = await fetch(request.url, request);
  const data = await response.json();
  
  res.json(data);
});


4. Atualizar frontend para chamar o backend em vez do mock
*/
