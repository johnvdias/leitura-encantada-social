# Leitura Encantada

Rede social de leitura: monte sua estante, acompanhe seu progresso, participe de clubes do livro, desafios e cronogramas de leitura com amigos.

## Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (banco de dados, autenticação, storage e Edge Functions)
- PWA com suporte a push notifications

## Rodando localmente

Pré-requisito: Node.js e npm ([instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Entre na pasta do projeto
cd leitura-encantada-social

# Instale as dependências
npm i

# Suba o servidor de desenvolvimento
npm run dev
```

## Estrutura do backend

O backend roda em Supabase:

- `supabase/migrations/` — histórico de migrations SQL.
- `supabase/functions/` — Edge Functions (busca de livros, notificações push).

Mudanças de schema e Edge Functions são aplicadas diretamente no projeto Supabase conectado (ver `src/integrations/supabase/client.ts` e `supabase/config.toml`).
