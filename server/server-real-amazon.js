const express = require("express");
const cors = require("cors");
const aws4 = require("aws4");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware com CORS mais permissivo
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:3000",
      "http://localhost:5173",
      /\.fly\.dev$/,
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);
app.use(express.json());

// Configuração da Amazon PA-API para Brasil
const AMAZON_CONFIG = {
  accessKeyId: process.env.AMAZON_ACCESS_KEY,
  secretAccessKey: process.env.AMAZON_SECRET_KEY,
  region: "us-east-1",
  service: "ProductAdvertisingAPI",
  host: "webservices.amazon.com",
  partnerTag: process.env.AMAZON_PARTNER_TAG,
  partnerType: "Associates",
  marketplace: "www.amazon.com.br",
};

// Validar credenciais
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

// Função para buscar livros na Amazon PA-API v5
async function searchAmazonBooks(keywords) {
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
    Marketplace: AMAZON_CONFIG.marketplace,
    PartnerTag: AMAZON_CONFIG.partnerTag,
    PartnerType: AMAZON_CONFIG.partnerType,
    ItemCount: 10,
  };

  const options = {
    method: "POST",
    host: AMAZON_CONFIG.host,
    path: "/paapi5/searchitems",
    region: AMAZON_CONFIG.region,
    service: AMAZON_CONFIG.service,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    },
    body: JSON.stringify(requestBody),
  };

  // Assinar requisição com AWS4
  aws4.sign(options, {
    accessKeyId: AMAZON_CONFIG.accessKeyId,
    secretAccessKey: AMAZON_CONFIG.secretAccessKey,
    region: AMAZON_CONFIG.region,
    service: AMAZON_CONFIG.service,
  });

  try {
    const url = `https://${options.host}${options.path}`;

    console.log(`📡 Making request to Amazon API:`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${options.method}`);
    console.log(`   Headers:`, JSON.stringify(options.headers, null, 2));
    console.log(`   Body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });

    console.log(
      `📊 Amazon API Response: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Amazon API Error Response:`, errorText);
      throw new Error(
        `Amazon PA-API error: ${response.status} ${response.statusText}\nResponse: ${errorText}`,
      );
    }

    const data = await response.json();
    console.log(`✅ Amazon API Success:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("💥 Error calling Amazon API:", error);
    throw error;
  }
}

// Mapear resultados da Amazon para formato interno
function mapAmazonResults(amazonResponse) {
  if (!amazonResponse.SearchResult || !amazonResponse.SearchResult.Items) {
    console.log("⚠️ No items found in Amazon response");
    return [];
  }

  return amazonResponse.SearchResult.Items.map((item) => {
    const itemInfo = item.ItemInfo || {};
    const images = item.Images || {};
    const offers = item.Offers || {};

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
      cover_url: images.Primary?.Large?.URL || null,
      isbn: itemInfo.ExternalIds?.ISBNs?.[0]?.DisplayValue || null,
      price: offers.Listings?.[0]?.Price?.DisplayAmount || null,
      amazon_url: item.DetailPageURL || null,
      rating: null,
      reviews_count: null,
    };
  });
}

// Endpoint APENAS para API real da Amazon
app.get("/api/amazon/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        error: "Query parameter is required",
        example: "/api/amazon/search?query=machado+de+assis",
      });
    }

    console.log(`\n🚀 === REAL Amazon PA-API Search ===`);
    console.log(`🔍 Query: "${query}"`);
    console.log(`🇧🇷 Marketplace: ${AMAZON_CONFIG.marketplace}`);
    console.log(`🏷️ Partner Tag: ${AMAZON_CONFIG.partnerTag}`);
    console.log(`⚠️ NO FALLBACK - REAL DATA ONLY\n`);

    // APENAS API real - sem dados simulados
    const amazonResponse = await searchAmazonBooks(query);
    const books = mapAmazonResults(amazonResponse);

    console.log(`\n✅ SUCCESS: Found ${books.length} REAL books from Amazon`);
    console.log(
      `📚 Books:`,
      books.map((b) => `"${b.title}" by ${b.author}`),
    );

    res.json({
      success: true,
      query: query,
      count: books.length,
      books: books,
      source: "amazon_pa_api",
      marketplace: AMAZON_CONFIG.marketplace,
      partner_tag: AMAZON_CONFIG.partnerTag,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("\n💥 === Amazon API Error ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    // SEM FALLBACK - retornar erro real
    res.status(500).json({
      error: "Amazon PA-API failed",
      message: error.message,
      details: "Check your Amazon PA-API credentials and configuration",
      troubleshooting: {
        credentials:
          "Verify AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG",
        account: "Ensure your Amazon Associates account is approved",
        api_access: "Check if PA-API access is enabled in your Amazon account",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "REAL_AMAZON_ONLY",
    timestamp: new Date().toISOString(),
    credentials_configured: !!(
      AMAZON_CONFIG.accessKeyId &&
      AMAZON_CONFIG.secretAccessKey &&
      AMAZON_CONFIG.partnerTag
    ),
    marketplace: AMAZON_CONFIG.marketplace,
    partner_tag: AMAZON_CONFIG.partnerTag || "NOT_SET",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    available_endpoints: [
      "GET /api/health",
      "GET /api/amazon/search?query=SEARCH_TERM",
    ],
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 REAL Amazon PA-API Server running on port ${PORT}`);
  console.log(`📚 Endpoint: http://localhost:${PORT}/api/amazon/search`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`\n⚠️  MODE: REAL AMAZON DATA ONLY - NO FALLBACK`);

  try {
    validateCredentials();
    console.log(`✅ Amazon PA-API credentials configured`);
    console.log(`🇧🇷 Marketplace: ${AMAZON_CONFIG.marketplace}`);
    console.log(`🏷️ Partner Tag: ${AMAZON_CONFIG.partnerTag}`);
  } catch (error) {
    console.log(`❌ ${error.message}`);
    console.log(`   Configure your .env file with Amazon PA-API credentials`);
  }

  console.log(
    `\n🔗 Test: curl "http://localhost:${PORT}/api/amazon/search?query=machado"`,
  );
});
