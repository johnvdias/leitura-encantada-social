#!/bin/bash

echo "🚀 Configurando servidor backend da Estante Encantada..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Configure suas credenciais da Amazon no arquivo .env"
    echo "   Edite o arquivo server/.env e adicione suas chaves:"
    echo "   - AMAZON_ACCESS_KEY"
    echo "   - AMAZON_SECRET_KEY" 
    echo "   - AMAZON_PARTNER_TAG"
    echo ""
else
    echo "✅ Arquivo .env já existe"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configure suas credenciais da Amazon no arquivo server/.env"
echo "   2. Execute: npm run dev (para desenvolvimento) ou npm start (para produção)"
echo "   3. O servidor ficará disponível em http://localhost:3001"
echo ""
echo "🔗 Endpoints disponíveis:"
echo "   - GET /api/health - Status do servidor"
echo "   - GET /api/amazon/search?query=termo - Buscar livros"
echo ""
