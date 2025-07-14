export interface AchievementData {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: "reading" | "social" | "progress" | "special";
  requirement: number;
  color: string;
}

export const ACHIEVEMENTS: AchievementData[] = [
  // Conquistas de Leitura
  {
    id: "first_book",
    name: "Primeira Aventura",
    description: "Adicionou seu primeiro livro",
    emoji: "📚",
    type: "reading",
    requirement: 1,
    color: "bg-blue-500",
  },
  {
    id: "book_lover",
    name: "Amante dos Livros",
    description: "Completou 5 livros",
    emoji: "❤️",
    type: "reading",
    requirement: 5,
    color: "bg-red-500",
  },
  {
    id: "book_master",
    name: "Mestre dos Livros",
    description: "Completou 25 livros",
    emoji: "👑",
    type: "reading",
    requirement: 25,
    color: "bg-yellow-500",
  },
  {
    id: "book_legend",
    name: "Lenda Literária",
    description: "Completou 100 livros",
    emoji: "🏆",
    type: "reading",
    requirement: 100,
    color: "bg-purple-500",
  },

  // Conquistas Sociais
  {
    id: "first_friend",
    name: "Primeira Amizade",
    description: "Fez seu primeiro amigo",
    emoji: "👥",
    type: "social",
    requirement: 1,
    color: "bg-green-500",
  },
  {
    id: "social_butterfly",
    name: "Borboleta Social",
    description: "Tem 10 amigos",
    emoji: "🦋",
    type: "social",
    requirement: 10,
    color: "bg-pink-500",
  },
  {
    id: "community_leader",
    name: "Líder da Comunidade",
    description: "Tem 50 amigos",
    emoji: "⭐",
    type: "social",
    requirement: 50,
    color: "bg-orange-500",
  },

  // Conquistas de Progresso
  {
    id: "daily_reader",
    name: "Leitor(a) Diário(a)",
    description: "Leu por 7 dias consecutivos",
    emoji: "📖",
    type: "progress",
    requirement: 7,
    color: "bg-indigo-500",
  },
  {
    id: "speed_reader",
    name: "Leitor(a) Veloz",
    description: "Leu 100 páginas em um dia",
    emoji: "⚡",
    type: "progress",
    requirement: 100,
    color: "bg-cyan-500",
  },
  {
    id: "goal_achiever",
    name: "Conquistador(a) de Metas",
    description: "Atingiu a meta anual de leitura",
    emoji: "🎯",
    type: "progress",
    requirement: 1,
    color: "bg-emerald-500",
  },

  // Conquistas Especiais
  {
    id: "reviewer",
    name: "Crítico(a) Literário(a)",
    description: "Escreveu 10 resenhas",
    emoji: "✍️",
    type: "special",
    requirement: 10,
    color: "bg-violet-500",
  },
  {
    id: "club_founder",
    name: "Fundador(a) de Clube",
    description: "Criou um clube de leitura",
    emoji: "🏛️",
    type: "special",
    requirement: 1,
    color: "bg-amber-500",
  },
  {
    id: "early_adopter",
    name: "Pioneiro(a)",
    description: "Um dos primeiros 100 usuários",
    emoji: "🌟",
    type: "special",
    requirement: 1,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
];
