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
        question: "Como funciona a avaliação por estrelas?",
        answer:
          'Em livros marcados como "Lido", clique numa estrela: o primeiro clique marca meia estrela, o segundo completa a estrela cheia, e o terceiro clique limpa a nota daquela posição. Assim dá pra dar notas como 3,5 ou 4,5, não só números inteiros.',
      },
      {
        question: "Dá pra filtrar os livros que já li por ano ou mês?",
        answer:
          'Sim! Na aba "Lidos" da Estante aparecem seletores de ano e, depois de escolher um ano, de mês - baseados na data em que você marcou cada livro como concluído.',
      },
      {
        question: "Como funcionam as Metas de Leitura e os Cronogramas?",
        answer:
          'As Metas de Leitura deixam você definir quantos livros quer ler no ano e acompanham seu progresso. Os Cronogramas são planos de leitura pra um livro específico, sozinha ou com amigas: você escolhe (e busca) qualquer livro da sua estante, mesmo um que já leu ou está lendo, se a contagem é em páginas ou capítulos, o total e as datas de início e término - o app calcula sozinho a meta diária (ex: 20 páginas/dia).',
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
          'Quem administra o clube propõe de 2 a 4 opções de livro e escolhe o jeito de decidir: sorteio (escolha aleatória entre as opções) ou votação (as integrantes votam e, ao encerrar, a opção mais votada vira a leitura atual do clube - empate é decidido por sorteio entre as mais votadas).',
      },
      {
        question: "Como funciona o Cronograma do clube?",
        answer:
          'Com um livro atual definido, quem administra cria o cronograma escolhendo se a contagem é em páginas ou capítulos, o total e as datas de início e término - o app calcula sozinho a meta diária (ex: 20 páginas/dia) e inscreve automaticamente todas as integrantes.',
      },
      {
        question: "O que são os Rankings do clube?",
        answer:
          'Uma aba dentro do clube que mostra as maiores leitoras, autoras mais lidas, gêneros favoritos e livros mais bem avaliados pelas integrantes.',
      },
      {
        question: "Recebo notificação de tudo que acontece no clube?",
        answer:
          'Sim! Toda atividade do clube avisa as outras integrantes: um post marcado pro clube, uma discussão ou anúncio novo, um sorteio ou votação criado (e quando é resolvido) e um cronograma iniciado. Dá pra desativar em Editar Perfil, na categoria "Atividade dos clubes".',
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
      {
        question: "Posso ver o perfil de alguém que ainda não é minha amiga?",
        answer:
          'Sim! Clicando no nome ou na foto da pessoa em qualquer lugar do app (busca, pedidos de amizade, comentários, etc.) você vai pro perfil dela, mesmo antes de serem amigas.',
      },
      {
        question: "O que aparece no perfil de uma amiga?",
        answer:
          'As conquistas dela aparecem junto da foto e do nome. As abas separam o que ela está "Lendo" do que já foi "Lido", e em cada livro dá pra clicar em "Quero Ler" pra adicionar direto na sua própria estante.',
      },
    ],
  },
  {
    title: "🔥 Ofensivas de Leitura",
    items: [
      {
        question: "O que é a Ofensiva em Dupla?",
        answer:
          'É uma sequência de dias compartilhada com uma amiga, no estilo da ofensiva do Duolingo: todo dia em que as DUAS batem a própria meta diária de leitura, o fogo 🔥 avança mais um dia. Pra começar, vá no perfil de uma amiga (vocês já precisam ser amigas) e clique em "Ofensiva em Dupla".',
      },
      {
        question: "O que são os gelinhos ❄️?",
        answer:
          'Cada ofensiva em dupla começa com 1 gelinho, que perdoa automaticamente um dia em que só uma das duas leu, sem quebrar a sequência. Vocês ganham mais um gelinho a cada 7 dias de sequência mantida, até o máximo de 3. Se faltar gelinho pra cobrir o dia, a sequência zera.',
      },
      {
        question: "Como sei se minha amiga já leu hoje na nossa ofensiva?",
        answer:
          'No card da ofensiva, na aba Estante, aparece um ✅ ou ⏳ do lado do nome de cada uma, mostrando quem já bateu a meta de hoje.',
      },
      {
        question: "Os Cronogramas de leitura também têm fogo e gelinho?",
        answer:
          'Sim! Tanto o cronograma entre amigas quanto o cronograma de um clube ganham fogo 🔥 quando TODAS as participantes leem o livro do cronograma no dia, e gelinhos ❄️ cobrem quem não leu (um gelinho por pessoa que faltou). Os badges de fogo e gelinho aparecem direto no card do cronograma.',
      },
      {
        question: "Como desativo as notificações das ofensivas?",
        answer:
          'Em Editar Perfil, na seção de preferências de notificação, desative "Ofensivas de leitura (dupla e cronogramas)". As ofensivas continuam valendo, só para de chegar notificação sobre elas.',
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
      {
        question: "Por que preciso adicionar uma foto assim que crio minha conta?",
        answer:
          'Contas novas precisam de uma foto de perfil antes de usar o resto do app, pra facilitar que amigas te reconheçam. Quem já tinha conta antes dessa mudança não é afetada.',
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
      {
        question: "O que é o lembrete de meta diária?",
        answer:
          'Se você ainda não bateu sua meta de páginas do dia, o app manda até três lembretes: um leve no meio da tarde, outro no fim da tarde e um último (com frases bem exageradas 😄) pouco antes da meia-noite, pra você não perder sua sequência.',
      },
      {
        question: "Minhas amigas ficam sabendo quando eu bato minha meta?",
        answer:
          'Sim, se você quiser: quando você bate sua meta diária, suas amigas recebem uma notificação de incentivo, no estilo do Duolingo. Dá pra desativar em Editar Perfil, na categoria "Amigas batendo a meta diária".',
      },
      {
        question: "Dá pra escolher quais notificações eu recebo?",
        answer:
          'Sim, em Editar Perfil tem uma lista de categorias (curtidas, comentários, cutucões, conquistas, mensagens, lembretes de meta, ofensivas, e mais) com um interruptor pra cada uma.',
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
