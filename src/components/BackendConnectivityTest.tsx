import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function BackendConnectivityTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

    try {
      console.log(`🔍 Testing connection to: ${backendUrl}`);

      const response = await fetch(`${backendUrl}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
      });

      const data = await response.json();

      setResult({
        success: true,
        status: response.status,
        url: `${backendUrl}/api/health`,
        data: data,
      });
    } catch (error) {
      console.error("Connection test failed:", error);
      setResult({
        success: false,
        error: error.message,
        url: `${backendUrl}/api/health`,
        suggestions: [
          "Verifique se o servidor está rodando: node server-real-amazon.js",
          "Teste no navegador: http://localhost:3001/api/health",
          "Verifique firewall/antivirus",
          "Reinicie o servidor backend",
        ],
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🔍 Teste de Conectividade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={testing} className="w-full">
          {testing ? "Testando..." : "Testar Conexão com Backend"}
        </Button>

        {result && (
          <div className="space-y-2">
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "✅ Conectado" : "❌ Falha na Conexão"}
            </Badge>

            <div className="text-sm space-y-1">
              <p>
                <strong>URL:</strong> {result.url}
              </p>

              {result.success ? (
                <div>
                  <p>
                    <strong>Status:</strong> {result.status}
                  </p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <p>
                    <strong>Erro:</strong> {result.error}
                  </p>
                  <div className="mt-2">
                    <strong>Soluções:</strong>
                    <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                      {result.suggestions?.map(
                        (suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
