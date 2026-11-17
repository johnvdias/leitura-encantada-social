export interface AchievementDef {
  type: string;
  name: string;
  description: string;
  emoji: string;
}

// Catálogo único de conquistas possíveis no app - usado tanto pra decidir
// quais desbloquear (useAchievements) quanto pra mostrar a vitrine completa
// (conquistadas + bloqueadas) no perfil. Manter num só lugar evita que nome/
// descrição/emoji fiquem diferentes entre o que desbloqueia e o que exibe.
export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  { type: 'first_book', name: 'Primeiro Livro', description: 'Leia seu primeiro livro', emoji: '📚' },
  { type: 'five_books', name: 'Leitor Dedicado', description: 'Leia 5 livros', emoji: '📖' },
  { type: 'ten_books', name: 'Bibliófilo', description: 'Leia 10 livros', emoji: '📚✨' },
  { type: 'bookworm', name: 'Rato de Biblioteca', description: 'Leia 25 livros', emoji: '🐛' },
  { type: 'reading_streak', name: 'Sequência de Fogo', description: 'Leia por 7 dias consecutivos', emoji: '🔥' },
  { type: 'first_club', name: 'Clube da Leitura', description: 'Entre em um clube de leitura', emoji: '👯' },
  { type: 'first_review', name: 'Crítica Literária', description: 'Escreva sua primeira resenha', emoji: '✍️' },
  { type: 'ten_comments', name: 'Voz Ativa', description: 'Faça 10 comentários na comunidade', emoji: '💬' },
  { type: 'genre_explorer', name: 'Exploradora de Gêneros', description: 'Leia livros de 3 gêneros diferentes', emoji: '🧭' },
  { type: 'fifty_books', name: 'Lenda da Leitura', description: 'Leia 50 livros', emoji: '📜' },
  { type: 'hundred_books', name: 'Mestra dos Livros', description: 'Leia 100 livros', emoji: '👑' },
  { type: 'streak_30', name: 'Chama Eterna', description: 'Leia por 30 dias consecutivos', emoji: '🔥🔥' },
  { type: 'first_club_created', name: 'Fundadora', description: 'Crie seu primeiro clube de leitura', emoji: '🏛️' },
  { type: 'five_friends', name: 'Borboleta Social', description: 'Tenha 5 amizades no app', emoji: '🦋' },
  { type: 'five_reviews', name: 'Pena Afiada', description: 'Escreva 5 resenhas', emoji: '✒️' },
  { type: 'first_quote', name: 'Colecionadora de Frases', description: 'Salve sua primeira citação de um livro', emoji: '📝' },
  { type: 'ten_quotes', name: 'Guardiã das Palavras', description: 'Salve 10 citações de livros', emoji: '📖' },
  { type: 'five_loved_books', name: 'Apaixonada', description: 'Marque 5 livros como amados', emoji: '💕' },
  { type: 'genre_master', name: 'Mestra dos Gêneros', description: 'Leia livros de 6 gêneros diferentes', emoji: '🌈' },
];

export const ACHIEVEMENT_BY_TYPE: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_CATALOG.map((a) => [a.type, a])
);
