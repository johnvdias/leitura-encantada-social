import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "24 de setembro de 2026";

const PoliticaPrivacidade = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="inline-flex">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </Link>

      <div className="text-center mb-8">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-primary mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
      </div>

      <Card className="card-enchanted">
        <CardContent className="pt-6 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <p>
              Esta Política de Privacidade explica quais dados o Leitura Encantada coleta, como usamos e protegemos
              essas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">1. Quais dados coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Conta:</strong> e-mail usado no cadastro e login. Sua senha é gerenciada com segurança pela
                Supabase Auth, nossa provedora de autenticação - nunca temos acesso a ela em texto legível.
              </li>
              <li><strong>Perfil:</strong> nome de exibição, nome de usuária, foto de perfil, biografia.</li>
              <li>
                <strong>Estante:</strong> livros que você cadastra, status de leitura, avaliações, gênero, formato
                (físico/Kindle/audiobook), progresso, citações favoritas e anotações pessoais.
              </li>
              <li>
                <strong>Atividade social:</strong> posts, comentários, curtidas, amizades, participação em clubes de
                leitura e discussões.
              </li>
              <li><strong>Mensagens diretas:</strong> conversas privadas trocadas com outras usuárias.</li>
              <li>
                <strong>Notificações:</strong> se você ativa notificações push, guardamos uma credencial técnica do
                seu navegador/dispositivo pra poder te enviar os avisos - não temos acesso ao conteúdo de outras
                notificações do seu aparelho.
              </li>
              <li>
                <strong>Preferências:</strong> tema (claro/escuro) e outras configurações, guardadas localmente no
                seu navegador.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">2. Como usamos esses dados</h2>
            <p>Usamos os dados coletados para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Fazer o app funcionar (mostrar sua estante, feed, clubes, mensagens);</li>
              <li>Gerar suas estatísticas, conquistas, retrospectivas e rankings pessoais;</li>
              <li>Recomendar livros bem avaliados pelas suas amigas;</li>
              <li>Enviar notificações sobre atividade relevante pra você (curtidas, comentários, pedidos de amizade, novidades de clubes);</li>
              <li>Manter a segurança da plataforma e prevenir abuso.</li>
            </ul>
            <p className="mt-2">Não vendemos seus dados pessoais nem os usamos para publicidade de terceiros.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">3. Com quem compartilhamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Outras usuárias:</strong> conforme a visibilidade que você escolhe - amigas, integrantes do
                mesmo clube, ou publicamente, dependendo do que você compartilha.
              </li>
              <li>
                <strong>Supabase</strong> (nossa infraestrutura de banco de dados, autenticação e hospedagem), que
                processa os dados em nosso nome e sob nossas instruções, com controles de acesso por linha
                (Row Level Security) garantindo que cada usuária só acesse o que tem permissão.
              </li>
              <li>
                <strong>Google Books e Open Library:</strong> quando você busca um livro que ainda não está no
                nosso catálogo, enviamos o termo de busca pra essas fontes externas pra encontrar capa, autora e
                outras informações do livro - nenhum dado pessoal seu é enviado nessa busca.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">4. Armazenamento e segurança</h2>
            <p>
              Seus dados ficam armazenados em banco de dados PostgreSQL gerenciado pela Supabase, protegidos por
              conexão criptografada (HTTPS) e por políticas de acesso que restringem cada informação a quem tem
              permissão de vê-la (você mesma, suas amigas aceitas, ou integrantes do mesmo clube, dependendo do
              tipo de dado).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">5. Seus direitos</h2>
            <p>Como titular dos dados, você pode a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Acessar, corrigir ou atualizar suas informações em Editar Perfil;</li>
              <li>Excluir livros, posts, comentários ou citações que você mesma publicou;</li>
              <li>Solicitar a exportação ou exclusão completa da sua conta e dados, pelo <Link to="/suporte" className="text-primary underline">Fale Conosco</Link>;</li>
              <li>Desativar notificações push a qualquer momento em Editar Perfil.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, removemos
              seus dados pessoais e conteúdo publicado, exceto quando precisarmos manter algo por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">7. Menores de idade</h2>
            <p>
              O Leitura Encantada não é direcionado a crianças. Se você tem menos de 13 anos, precisa do
              consentimento de uma responsável legal pra usar o app, conforme a LGPD.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">8. Cookies e armazenamento local</h2>
            <p>
              Usamos o armazenamento local do seu navegador (localStorage) pra lembrar preferências como o tema
              claro/escuro e manter sua sessão conectada. Não usamos cookies de rastreamento publicitário.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">9. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade de tempos em tempos. Mudanças relevantes serão
              avisadas dentro do app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">10. Contato</h2>
            <p>
              Dúvidas sobre como tratamos seus dados? Fale com a gente pela página de{" "}
              <Link to="/suporte" className="text-primary underline">Fale Conosco</Link>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoliticaPrivacidade;
