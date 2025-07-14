const express = require("express");
const cors = require("cors");
const aws4 = require("aws4");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração da Amazon PA-API para marketplace brasileiro
const AMAZON_CONFIG = {
  accessKeyId: process.env.AMAZON_ACCESS_KEY,
  secretAccessKey: process.env.AMAZON_SECRET_KEY,
  region: "us-east-1", // Para PA-API, sempre use us-east-1
  service: "ProductAdvertisingAPI",
  host: "webservices.amazon.com",
  partnerTag: process.env.AMAZON_PARTNER_TAG,
  partnerType: "Associates",
  marketplace: "www.amazon.com.br",
};

// Verificar se credenciais estão configuradas
function validateCredentials() {
  const missing = [];
  if (!AMAZON_CONFIG.accessKeyId) missing.push("AMAZON_ACCESS_KEY");
  if (!AMAZON_CONFIG.secretAccessKey) missing.push("AMAZON_SECRET_KEY");
  if (!AMAZON_CONFIG.partnerTag) missing.push("AMAZON_PARTNER_TAG");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

// Função para buscar livros na Amazon
async function searchAmazonBooks(keywords) {
  // Validar credenciais antes de fazer a requisição
  validateCredentials();

  const requestBody = {
    Keywords: keywords,
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.ContentInfo",
      "ItemInfo.Features",
      "ItemInfo.ExternalIds",
      "Offers.Listings.Price",
    ],
    SearchIndex: "Books",
    Marketplace: "www.amazon.com.br",
    PartnerTag: AMAZON_CONFIG.partnerTag,
    PartnerType: "Associates",
    ItemCount: 10,
  };

  const options = {
    method: "POST",
    host: "webservices.amazon.com",
    path: "/paapi5/searchitems",
    region: "us-east-1",
    service: "ProductAdvertisingAPI",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    },
    body: JSON.stringify(requestBody),
  };

  // Assinar a requisição com AWS4
  aws4.sign(options, {
    accessKeyId: AMAZON_CONFIG.accessKeyId,
    secretAccessKey: AMAZON_CONFIG.secretAccessKey,
    region: AMAZON_CONFIG.region,
    service: "ProductAdvertisingAPI",
  });

  try {
    const url = `https://${options.host}${options.path}`;

    console.log(`Making request to Amazon API: ${url}`);
    console.log(`Request headers:`, JSON.stringify(options.headers, null, 2));

    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });

    console.log(`Amazon API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Amazon API error response:`, errorText);
      throw new Error(
        `Amazon API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    console.log(`Amazon API response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("Error calling Amazon API:", error);
    throw error;
  }
}

// Função para mapear resultados da Amazon para formato do frontend
function mapAmazonResults(amazonResponse) {
  if (!amazonResponse.SearchResult || !amazonResponse.SearchResult.Items) {
    return [];
  }

  return amazonResponse.SearchResult.Items.map((item) => {
    const itemInfo = item.ItemInfo || {};
    const images = item.Images || {};
    const offers = item.Offers || {};
    const customerReviews = item.CustomerReviews || {};

    return {
      id: `amazon-${item.ASIN}`,
      title: itemInfo.Title?.DisplayValue || "Título não disponível",
      author:
        itemInfo.ByLineInfo?.Contributors?.[0]?.Name || "Autor não disponível",
      description:
        itemInfo.Features?.DisplayValues?.join(" ") ||
        "Descrição não disponível",
      pages: itemInfo.ContentInfo?.PagesCount?.DisplayValue || null,
      genre: "Livro",
      cover_url:
        images.Primary?.Large?.URL || images.Primary?.Medium?.URL || null,
      isbn: itemInfo.ExternalIds?.ISBNs?.[0]?.DisplayValue || null,
      price: offers.Listings?.[0]?.Price?.DisplayAmount || null,
      amazon_url: item.DetailPageURL || null,
      rating: customerReviews.StarRating?.DisplayValue
        ? parseFloat(customerReviews.StarRating.DisplayValue)
        : null,
      reviews_count: customerReviews.Count?.DisplayValue
        ? parseInt(customerReviews.Count.DisplayValue)
        : null,
    };
  });
}

// Dados simulados para fallback quando a API da Amazon falha
function getMockAmazonBooks(query) {
  const mockBooks = [
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
        "Diário de uma catadora de papel que vivia na favela do Canindé, em S��o Paulo.",
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

  return filteredBooks.length > 0 ? filteredBooks : mockBooks.slice(0, 3);
}

// Endpoint para buscar livros
app.get("/api/amazon/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        error: "Query parameter is required",
      });
    }

    console.log(`=== Amazon Search Request ===`);
    console.log(`Query: "${query}"`);
    console.log(
      `Credentials configured: ${!!(AMAZON_CONFIG.accessKeyId && AMAZON_CONFIG.secretAccessKey && AMAZON_CONFIG.partnerTag)}`,
    );

    let books = [];
    let source = "fallback";

    // Tentar usar a API real da Amazon primeiro
    if (
      AMAZON_CONFIG.accessKeyId &&
      AMAZON_CONFIG.secretAccessKey &&
      AMAZON_CONFIG.partnerTag
    ) {
      try {
        console.log("Trying real Amazon API...");
        const amazonResponse = await searchAmazonBooks(query);
        const mappedResults = mapAmazonResults(amazonResponse);

        if (mappedResults && mappedResults.length > 0) {
          books = mappedResults;
          source = "amazon_api";
          console.log(`✅ Found ${books.length} books from Amazon API`);
        }
      } catch (apiError) {
        console.log("⚠️ Amazon API failed, using fallback data");
        console.error("API Error:", apiError.message);
      }
    }

    // Garantir que sempre temos dados para retornar
    if (books.length === 0) {
      books = getMockAmazonBooks(query);
      source = "fallback";
      console.log(`📚 Using ${books.length} mock books for query "${query}"`);
    }

    // Log final
    console.log(`🎯 Returning ${books.length} books from source: ${source}`);

    res.json({
      success: true,
      query: query,
      count: books.length,
      books: books,
      source: source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Critical error in /api/amazon/search:", error);

    // Mesmo com erro crítico, tentar retornar dados mock
    try {
      const fallbackBooks = getMockAmazonBooks(query);
      console.log(
        `💀 Critical error occurred, using ${fallbackBooks.length} fallback books`,
      );

      res.json({
        success: true,
        query: query,
        count: fallbackBooks.length,
        books: fallbackBooks,
        source: "emergency_fallback",
        error_occurred: true,
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError);

      res.status(500).json({
        error: "Complete system failure",
        message: "Both Amazon API and fallback data failed",
        original_error: error.message,
        fallback_error: fallbackError.message,
      });
    }
  }
});

// Endpoint de health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    amazon_configured: !!(
      AMAZON_CONFIG.accessKeyId &&
      AMAZON_CONFIG.secretAccessKey &&
      AMAZON_CONFIG.partnerTag
    ),
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(
    `📚 Amazon API endpoint: http://localhost:${PORT}/api/amazon/search`,
  );
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);

  if (
    !AMAZON_CONFIG.accessKeyId ||
    !AMAZON_CONFIG.secretAccessKey ||
    !AMAZON_CONFIG.partnerTag
  ) {
    console.log("⚠️  WARNING: Amazon API credentials not configured");
    console.log("   Please set the following environment variables:");
    console.log("   - AMAZON_ACCESS_KEY");
    console.log("   - AMAZON_SECRET_KEY");
    console.log("   - AMAZON_PARTNER_TAG");
  } else {
    console.log("✅ Amazon API credentials configured");
  }
});
