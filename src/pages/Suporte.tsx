import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, HelpCircle } from "lucide-react";

const SUPPORT_EMAIL = "suporte@leituraencantada.com.br";

const Suporte = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/" className="inline-flex">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </Link>

      <div className="text-center mb-8">
        <Mail className="h-12 w-12 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-primary mb-2">Fale Conosco</h1>
        <p className="text-muted-foreground">
          Encontrou um problema, tem uma sugestão ou só quer dizer oi? A gente quer ouvir.
        </p>
      </div>

      <Card className="card-enchanted text-center">
        <CardContent className="pt-6 space-y-4">
          <p className="text-muted-foreground">
            Mande um e-mail pra gente contando o que aconteceu - se for um problema, inclua prints e os passos que
            você fez, isso ajuda muito a resolver mais rápido.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Button size="lg" className="btn-enchanted">
              <Mail className="h-4 w-4 mr-2" />
              {SUPPORT_EMAIL}
            </Button>
          </a>
          <p className="text-xs text-muted-foreground pt-2">
            Respondemos o mais rápido possível, normalmente em até alguns dias úteis.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 card-enchanted text-center">
        <CardContent className="pt-6">
          <HelpCircle className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-muted-foreground mb-4">
            Muitas dúvidas comuns já estão respondidas na Central de Ajuda.
          </p>
          <Link to="/ajuda">
            <Button variant="outline">Ver Central de Ajuda</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Suporte;
