import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowLeft, Mail } from "lucide-react";

interface HelpSection {
  title: string;
  items: { question: string; answer: string }[];
}

const SECTIONS: HelpSection[] = [
  {
    title: "📚 Estante",
    items: [
      {
        question: "Como adiciono um livro?",
        answer:
          'No topo da sua Estante, clique em "Adicionar Livro" e busque por título, autora ou ISBN (dá pra escanear o código de barras também). Se não encontrar nas nossas fontes, use "Cadastrar Manualmente" pra criar o livro você mesma.',
      },
      {
        question: 'O que significa "Lendo", "Lido" e "Quero Ler"?',
        answer:
          'São os três status de leitura. "Quero Ler" é pra livros na sua lista de desejos, "Lendo" pra quem você já começou (dá pra atualizar a página atual) e "Lido" pra quem já terminou (e pode avaliar com estrelas).',
      },
      {
        question: "Dá pra dizer se o livro é físico, Kindle ou audiobook?",
        answer:
          'Sim! Ao adicionar ou editar um livro, escolha o formato: Livro Físico, Kindle ou Audiobook. Isso aparece como um iconezinho no card do livro.',
      },
      {
        question: "Como coloco a data em que terminei de ler um livro?",
        answer:
          'Ao marcar um livro como "Lido" (seja atualizando o progresso pra 100% ou editando o status), aparece um campo opcional pra escolher a data de conclusão. Se você não escolher nada, usamos a data de hoje.',
      },
      {
        question: "O que é o sorteio da estante?",
        answer:
          'Na aba "Quero Ler", o botão "Sortear meu próximo livro" escolhe aleatoriamente um título da sua lista de desejos - ótimo pra quem tem dificuldade de decidir o próximo livro.',
      },
      {
        question: "Como funcionam as Metas de Leitura e os Cronogramas?",
        answer:
          'As Metas de Leitura deixam você definir quantos livros quer ler no ano e acompanham seu progresso. Os Cronogramas são planos de leitura com data de início/fim pra um livro específico, sozinha ou com amigas.',
      },
      {
        question: "Onde vejo minhas citações favoritas?",
        answer:
          'Cada livro tem um botão de citações (ícone de aspas) onde você salva trechos favoritos com o número da página. Todas ficam reunidas na aba "Citações" do seu Perfil.',
      },
      {
        question: "O que é o card de progresso?",
        answer:
          'É uma imagem gerada pelo app pra compartilhar em redes sociais, mostrando a capa do livro, seu progresso (% ou páginas) e como você está se sentindo com a leitura. Dá pra personalizar cor de fundo, cor do texto e o formato (story ou miniatura).',
      },
    ],
  },
  {
    title: "💬 Feed",
    items: [
      {
        question: "O que posso postar no feed?",
        answer:
          'Pensamentos sobre um livro que está lendo, uma resenha, uma citação favorita - qualquer coisa relacionada à sua leitura. Você pode vincular o post a um livro da sua estante.',
      },
      {
        question: "Como menciono uma amiga num post ou comentário?",
        answer:
          'Digite @ seguido do nome dela - o app sugere o perfil automaticamente. A pessoa mencionada recebe uma notificação.',
      },
    ],
  },
  {
    title: "👥 Clubes de Leitura",
    items: [
      {
        question: "Como entro num clube?",
        answer:
          'Peça o link de convite pra criadora do clube, ou procure clubes públicos na aba "Clubes". Clubes privados dependem de aprovação de quem administra.',
      },
      {
        question: "Como escolhemos o próximo livro do clube?",
        answer:
          'Quem administra o clube pode abrir uma votação/sorteio com algumas opções de livro - as integrantes votam e o mais votado vira a leitura atual do clube.',
      },
      {
        question: "O que são os Rankings do clube?",
        answer:
          'Uma aba dentro do clube que mostra as maiores leitoras, autoras mais lidas, gêneros favoritos e livros mais bem avaliados pelas integrantes.',
      },
    ],
  },
  {
    title: "🤝 Amizades e Recomendações",
    items: [
      {
        question: "Como adiciono uma amiga?",
        answer:
          'Busque pelo nome ou usuário dela e envie um pedido de amizade. Ela precisa aceitar pra vocês verem a estante e postagens uma da outra.',
      },
      {
        question: "De onde vêm as recomendações na minha Estante?",
        answer:
          'São livros que suas amigas avaliaram com 4 ou 5 estrelas e que ainda não estão na sua estante. Clicando num card de recomendação, dá pra adicionar o livro direto, já com gênero e formato preenchidos.',
      },
    ],
  },
  {
    title: "🏆 Perfil",
    items: [
      {
        question: "O que é a Retrospectiva?",
        answer:
          'Um resumo visual e compartilhável da sua leitura, por ano ou por mês: quantos livros leu, gênero e autora favoritos, páginas viradas, maior sequência de dias lendo, e o livro favorito do período. Dá pra personalizar fundo, cor do texto e escolher emoções que descrevem como foi o período.',
      },
      {
        question: "O que aparece nos meus Rankings pessoais?",
        answer:
          'Os meses em que você mais leu, suas autoras/autores mais lidos e seus livros favoritos (por nota), com o mês/ano em que foram concluídos.',
      },
      {
        question: "Como funcionam as Conquistas?",
        answer:
          'São medalhas desbloqueadas automaticamente conforme você usa o app - ler um certo número de livros, manter sequências de leitura, entre outras.',
      },
    ],
  },
  {
    title: "🔔 Mensagens e Notificações",
    items: [
      {
        question: "Posso mandar mensagem direto pra uma amiga?",
        answer:
          'Sim, em "Mensagens" no menu superior. É uma conversa privada entre vocês duas.',
      },
      {
        question: "Como ativo notificações no celular?",
        answer:
          'Em Editar Perfil, ative a opção de notificações push. Você recebe avisos de curtidas, comentários, pedidos de amizade e novidades dos clubes mesmo com o app fechado.',
      },
    ],
  },
];

const Ajuda = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="inline-flex">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </Link>

      <div className="text-center mb-8">
        <HelpCircle className="h-12 w-12 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-primary mb-2">Central de Ajuda</h1>
        <p className="text-muted-foreground">Tudo que você precisa saber pra aproveitar o Leitura Encantada.</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="card-enchanted">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`${section.title}-${i}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 text-center card-enchanted">
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">Não achou o que procurava?</p>
          <Link to="/suporte">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Fale Conosco
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ajuda;
