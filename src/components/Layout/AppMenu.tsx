import { Link } from "react-router-dom";
import { Menu, Sun, Moon, LogOut, HelpCircle, FileText, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

interface AppMenuProps {
  onSignOut?: () => void;
}

export function AppMenu({ onSignOut }: AppMenuProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {isDark ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/ajuda">
            <HelpCircle className="h-4 w-4 mr-2" />
            Ajuda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/suporte">
            <Mail className="h-4 w-4 mr-2" />
            Fale Conosco
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/termos">
            <FileText className="h-4 w-4 mr-2" />
            Termos de Uso
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/privacidade">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Política de Privacidade
          </Link>
        </DropdownMenuItem>

        {onSignOut && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
