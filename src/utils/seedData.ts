import { supabase } from "@/integrations/supabase/client";

export const createSamplePosts = async (userId: string) => {
  const samplePosts = [
    {
      user_id: userId,
      content: "Acabei de terminar de ler 'O Nome do Vento' e estou absolutamente apaixonada! Patrick Rothfuss criou um mundo mágico incrível. Alguém mais já leu a série Crônica do Matador do Rei? 📚✨",
      post_type: "review",
      visibility: "public"
    },
    {
      user_id: userId,
      content: "Começando minha jornada literária de hoje com uma xícara de chá e um novo livro. Há algo mágico sobre o cheiro de páginas novas! ☕📖",
      post_type: "general",
      visibility: "public"
    },
    {
      user_id: userId,
      content: "Meta do mês: ler 3 livros! Janeiro já está sendo produtivo. Quais são suas metas de leitura para este ano? 🎯",
      post_type: "general",
      visibility: "public"
    },
    {
      user_id: userId,
      content: "Estou na página 150 de 'Orgulho e Preconceito' e cada página me surpreende mais. Jane Austen é simplesmente genial! 💕",
      post_type: "progress",
      visibility: "public"
    },
    {
      user_id: userId,
      content: "Procurando indicações de romance histórico! Acabei de me apaixonar pelo gênero. Que livros vocês recomendam? 💕📚",
      post_type: "recommendation",
      visibility: "public"
    }
  ];

  try {
    const { error } = await supabase
      .from('posts')
      .insert(samplePosts);

    if (error) {
      console.error("Error creating sample posts:", error);
      return { error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating sample posts:", error);
    return { error };
  }
};

export const createSampleBooks = async (userId: string) => {
  const sampleBooks = [
    {
      user_id: userId,
      title: "O Nome do Vento",
      author: "Patrick Rothfuss",
      description: "Uma história épica sobre Kvothe, um jovem herói lendário.",
      genre: "Fantasy",
      reading_status: "completed",
      rating: 5,
      pages: 662,
      reading_progress: 100,
      current_page: 662
    },
    {
      user_id: userId,
      title: "Orgulho e Preconceito",
      author: "Jane Austen",
      description: "Um clássico romance sobre Elizabeth Bennet e Mr. Darcy.",
      genre: "Romance",
      reading_status: "reading",
      pages: 432,
      reading_progress: 35,
      current_page: 150
    },
    {
      user_id: userId,
      title: "1984",
      author: "George Orwell",
      description: "Uma distopia sobre vigilância e controle totalitário.",
      genre: "Ficção Científica",
      reading_status: "want_to_read",
      pages: 328,
      reading_progress: 0,
      current_page: 0
    }
  ];

  try {
    const { error } = await supabase
      .from('books')
      .insert(sampleBooks);

    if (error) {
      console.error("Error creating sample books:", error);
      return { error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating sample books:", error);
    return { error };
  }
};