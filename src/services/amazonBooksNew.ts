// Serviço robusto para integração com Amazon Books API via backend

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

class AmazonBooksServiceNew {
  private backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

  // Busca na API real da Amazon via backend
  async searchBooks(query: string): Promise<AmazonBookResult[]> {
    try {
      console.log(`🔍 Searching Amazon via backend for: "${query}"`);

      const url = `${this.backendUrl}/api/amazon/search?query=${encodeURIComponent(query)}`;
      console.log(`📡 Request URL: ${url}`);

      // Fazer requisição com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📊 Response: ${response.status} ${response.statusText}`);
      console.log(`📋 Content-Type: ${response.headers.get("content-type")}`);

      // Ler resposta como texto primeiro
      const responseText = await response.text();
      console.log(`📄 Response length: ${responseText.length} chars`);
      console.log(`📝 Response preview: ${responseText.substring(0, 200)}...`);

      // Tentar fazer parse do JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ JSON Parse Error:`, parseError);
        console.error(`💀 Full response text:`, responseText);
        throw new Error(
          `Server returned invalid JSON. Response: ${responseText.substring(0, 100)}`,
        );
      }

      console.log(`✅ Successfully parsed JSON:`, data);

      // Verificar se houve erro no backend
      if (!response.ok) {
        const errorMsg =
          data?.message || data?.error || `Server error: ${response.status}`;
        console.error(`🔥 Backend error:`, data);
        throw new Error(errorMsg);
      }

      // Verificar formato da resposta
      if (!data.success) {
        throw new Error(data.message || "Backend reported failure");
      }

      if (!data.books || !Array.isArray(data.books)) {
        throw new Error("Invalid response format: missing books array");
      }

      console.log(
        `🎉 Found ${data.books.length} books from source: ${data.source}`,
      );

      return data.books;
    } catch (error) {
      if (error.name === "AbortError") {
        console.error(`⏰ Request timeout`);
        throw new Error("Request timeout - backend took too long to respond");
      }

      console.error(`💥 Amazon search failed:`, error);
      throw error;
    }
  }

  // Health check do backend com diagnóstico detalhado
  async checkBackendHealth(): Promise<boolean> {
    console.log(`🔍 Testing backend connectivity...`);
    console.log(`🌐 Backend URL: ${this.backendUrl}`);

    try {
      console.log(`📡 Attempting to connect to: ${this.backendUrl}/api/health`);

      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
      });

      console.log(
        `📊 Health check response: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        console.error(`❌ Backend returned error: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log(`💚 Backend health response:`, data);

      return data.status === "ok";
    } catch (error) {
      console.error(`💀 Backend connectivity failed:`, error);
      console.error(`🔗 Tried to connect to: ${this.backendUrl}`);

      // Sugestões de diagnóstico
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        console.error(`🚨 CONNECTION PROBLEM DETECTED:`);
        console.error(`   1. Check if backend server is running on port 3001`);
        console.error(`   2. Open http://localhost:3001/api/health in browser`);
        console.error(`   3. Check for firewall/antivirus blocking`);
        console.error(`   4. Try restarting the backend server`);
      }

      return false;
    }
  }
}

export const amazonBooksServiceNew = new AmazonBooksServiceNew();
export type { AmazonBookResult };
