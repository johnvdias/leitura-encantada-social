import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "24 de setembro de 2026";

const TermosDeUso = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="inline-flex">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </Link>

      <div className="text-center mb-8">
        <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-primary mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
      </div>

      <Card className="card-enchanted">
        <CardContent className="pt-6 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-semibold text-base mb-2">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta no Leitura Encantada você concorda com estes Termos de Uso e com a nossa{" "}
              <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
              Se você não concorda com algum ponto, pedimos que não utilize o app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">2. O que é o Leitura Encantada</h2>
            <p>
              O Leitura Encantada é uma rede social voltada pra leitoras e leitores: organizar sua estante de
              livros, acompanhar progresso de leitura, participar de clubes de leitura, compartilhar posts e
              conversar com amigas sobre livros.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">3. Cadastro e Conta</h2>
            <p>
              Você precisa fornecer um e-mail válido e é responsável por manter sua senha em segurança. Você é
              responsável por tudo que acontece na sua conta, então não compartilhe seu acesso com outras pessoas.
              Uma conta é pessoal e intransferível.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">4. Conduta Esperada</h2>
            <p className="mb-2">Ao usar o app, você concorda em não:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Publicar conteúdo ofensivo, discriminatório, difamatório ou que incite ódio ou violência;</li>
              <li>Assediar, intimidar ou constranger outras usuárias, dentro ou fora dos clubes de leitura;</li>
              <li>Usar o app pra divulgar spam, golpes ou conteúdo comercial não autorizado;</li>
              <li>Se passar por outra pessoa ou criar contas falsas;</li>
              <li>Tentar acessar dados ou contas de outras usuárias sem autorização;</li>
              <li>Publicar conteúdo protegido por direitos autorais sem permissão (ex: livros digitalizados na íntegra).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">5. Conteúdo que Você Publica</h2>
            <p>
              Posts, comentários, avaliações, citações e fotos de perfil continuam sendo seus - você não perde
              nenhum direito sobre eles. Ao publicar, você nos dá permissão pra exibir esse conteúdo dentro do app,
              pras pessoas com quem você compartilha (amigas, integrantes do clube, ou publicamente, conforme a
              visibilidade que você escolher). Você pode excluir seu conteúdo a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">6. Clubes de Leitura</h2>
            <p>
              Quem cria um clube é responsável por moderar as discussões e aprovar (ou não) pedidos de entrada em
              clubes privados. O Leitura Encantada pode remover clubes ou conteúdo que violem estes Termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">7. Propriedade Intelectual</h2>
            <p>
              A marca, o design e o código do Leitura Encantada são protegidos e não podem ser copiados ou
              reproduzidos sem autorização. Capas e informações de livros exibidas no app vêm de fontes como Google
              Books e Open Library, ou foram cadastradas pelas próprias usuárias.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">8. Suspensão e Encerramento</h2>
            <p>
              Podemos suspender ou encerrar contas que violem estes Termos. Você também pode excluir sua conta a
              qualquer momento em Editar Perfil, ou entrando em contato pelo{" "}
              <Link to="/suporte" className="text-primary underline">Fale Conosco</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">9. Isenção de Responsabilidade</h2>
            <p>
              O app é fornecido "como está". Fazemos o possível pra manter tudo funcionando bem, mas não garantimos
              disponibilidade ininterrupta nem nos responsabilizamos por opiniões, avaliações ou conteúdo publicado
              pelas usuárias - eles refletem a visão de quem os escreveu, não do Leitura Encantada.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">10. Alterações nestes Termos</h2>
            <p>
              Podemos atualizar estes Termos de tempos em tempos. Mudanças relevantes serão comunicadas dentro do
              app. Continuar usando o Leitura Encantada depois de uma atualização significa que você concorda com
              os novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">11. Contato</h2>
            <p>
              Dúvidas sobre estes Termos? Fale com a gente pela página de{" "}
              <Link to="/suporte" className="text-primary underline">Fale Conosco</Link>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermosDeUso;
