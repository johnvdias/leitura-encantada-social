-- Tema de cor da estante: preferência pessoal de personalização visual,
-- guardada no perfil (não por dispositivo) pra acompanhar a pessoa em
-- qualquer aparelho que ela entre.
ALTER TABLE public.profiles ADD COLUMN shelf_theme text NOT NULL DEFAULT 'default';
