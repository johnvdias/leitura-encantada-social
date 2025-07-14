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

// Configuração da Amazon PA-API
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
      "Images.Primary.Medium",
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
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    },
    body: JSON.stringify(requestBody),
  };

  // Assinar a requisiç��o com AWS4
  aws4.sign(options, {
    accessKeyId: AMAZON_CONFIG.accessKeyId,
    secretAccessKey: AMAZON_CONFIG.secretAccessKey,
    region: AMAZON_CONFIG.region,
    service: AMAZON_CONFIG.service,
  });

  try {
    const url = `https://${options.host}${options.path}`;
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });

    if (!response.ok) {
      throw new Error(
        `Amazon API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
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

// Endpoint para buscar livros
app.get("/api/amazon/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        error: "Query parameter is required",
      });
    }

    // Verificar se as variáveis de ambiente estão configuradas
    if (
      !AMAZON_CONFIG.accessKeyId ||
      !AMAZON_CONFIG.secretAccessKey ||
      !AMAZON_CONFIG.partnerTag
    ) {
      return res.status(500).json({
        error: "Amazon API credentials not configured",
        message:
          "Please set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_PARTNER_TAG environment variables",
      });
    }

    console.log(`Searching Amazon for: "${query}"`);

    const amazonResponse = await searchAmazonBooks(query);
    const mappedResults = mapAmazonResults(amazonResponse);

    res.json({
      success: true,
      query: query,
      count: mappedResults.length,
      books: mappedResults,
    });
  } catch (error) {
    console.error("Error in /api/amazon/search:", error);

    res.status(500).json({
      error: "Failed to search Amazon books",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
