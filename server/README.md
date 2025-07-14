# 🚀 Backend - Estante Encantada

Servidor backend para integração com a Amazon Product Advertising API.

## 📋 Pré-requisitos

- Node.js 16+ instalado
- Conta de Associado da Amazon configurada
- Credenciais da Amazon PA-API

## ⚡ Instalação Rápida

```bash
cd server
npm install
cp .env.example .env
```

## 🔑 Configuração das Credenciais

Edite o arquivo `.env` e adicione suas credenciais da Amazon:

```env
AMAZON_ACCESS_KEY=sua_access_key_aqui
AMAZON_SECRET_KEY=sua_secret_key_aqui
AMAZON_PARTNER_TAG=seu_partner_tag_aqui
PORT=3001
```

### Como obter as credenciais:

1. **Amazon Associates**: https://associados.amazon.com.br/
2. **Product Advertising API**: https://webservices.amazon.com/paapi5/documentation/
3. **Seu Partner Tag**: Encontre em "Ferramentas" → "Link Builder" no painel de Associates

## 🚀 Execução

### Desenvolvimento:

```bash
npm run dev
```

### Produção:

```bash
npm start
```

O servidor ficará disponível em: http://localhost:3001

## 📡 Endpoints

### Health Check

```
GET /api/health
```

### Buscar Livros

```
GET /api/amazon/search?query=termo_de_busca
```

**Exemplo:**

```bash
curl "http://localhost:3001/api/amazon/search?query=machado+de+assis"
```

## 🔧 Integração com Frontend

O frontend está configurado para usar automaticamente este backend. Certifique-se de que:

1. O backend está rodando na porta 3001
2. As credenciais estão configuradas corretamente
3. Não há bloqueios de CORS

## 📊 Monitoramento

- **Status**: GET `/api/health` retorna o status do servidor
- **Logs**: Verifique o console para logs de requisições
- **Erros**: Erros da API são logados com detalhes

## 🛠️ Troubleshooting

### Erro "Amazon API credentials not configured"

- Verifique se o arquivo `.env` existe
- Confirme se todas as 3 variáveis estão preenchidas
- Reinicie o servidor após alterar o `.env`

### Erro de CORS

- Verifique se o frontend está acessando `http://localhost:3001`
- Confirme se não há proxy ou firewall bloqueando

### Erro "Invalid credentials"

- Verifique suas credenciais no painel da Amazon
- Confirme se o Partner Tag está correto
- Teste com uma requisição simples primeiro

## 📝 Estrutura do Projeto

```
server/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env.example       # Exemplo de configuração
├── .env              # Suas credenciais (criar)
└── README.md         # Esta documentação
```

## 🔒 Segurança

- **Nunca commite** o arquivo `.env` com suas credenciais
- As chaves ficam seguras no servidor, não no frontend
- Todas as requisições são autenticadas via AWS4

## 📚 Referências

- [Amazon PA-API Docs](https://webservices.amazon.com/paapi5/documentation/)
- [AWS Signature v4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [Express.js](https://expressjs.com/)
