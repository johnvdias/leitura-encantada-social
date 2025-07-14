import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UsernameSelectorProps {
  value: string;
  onChange: (username: string) => void;
  onValidChange: (isValid: boolean) => void;
}

export function UsernameSelector({
  value,
  onChange,
  onValidChange,
}: UsernameSelectorProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return "Username deve ter pelo menos 3 caracteres";
    if (username.length > 20)
      return "Username deve ter no máximo 20 caracteres";
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return "Username pode conter apenas letras, números e underscore";
    if (username.startsWith("_") || username.endsWith("_"))
      return "Username não pode começar ou terminar com underscore";
    return null;
  };

  const checkAvailability = async (username: string) => {
    if (!username) return;

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      setIsAvailable(false);
      onValidChange(false);
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .limit(1);

      if (error) throw error;

      const available = !data || data.length === 0;
      setIsAvailable(available);
      onValidChange(available);

      if (!available) {
        setError("Este username já está em uso");
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setError("Erro ao verificar disponibilidade");
      setIsAvailable(false);
      onValidChange(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        checkAvailability(value);
      } else {
        setIsAvailable(null);
        setError("");
        onValidChange(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
    onChange(newValue);
    setIsAvailable(null);
    setError("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="username">Username *</Label>
      <div className="relative">
        <Input
          id="username"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="meu_username"
          className={cn(
            "pr-10",
            isAvailable === true && "border-green-500 focus:border-green-500",
            isAvailable === false && "border-red-500 focus:border-red-500",
          )}
          maxLength={20}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isAvailable === true ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : isAvailable === false ? (
            <X className="h-4 w-4 text-red-500" />
          ) : null}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {isAvailable === true && (
        <p className="text-sm text-green-600">Username disponível!</p>
      )}
      <p className="text-xs text-muted-foreground">
        3-20 caracteres, apenas letras, números e underscore
      </p>
    </div>
  );
}
