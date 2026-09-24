import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BOOK_GENRES } from "@/lib/bookGenres";

interface GenreSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const OTHER = "__other__";

export function GenreSelect({ value, onChange }: GenreSelectProps) {
  const isKnownGenre = (BOOK_GENRES as readonly string[]).includes(value);
  const [customMode, setCustomMode] = useState(!isKnownGenre && value !== "");

  return (
    <div className="space-y-2">
      <Select
        value={customMode ? OTHER : value || undefined}
        onValueChange={(v) => {
          if (v === OTHER) {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o gênero" />
        </SelectTrigger>
        <SelectContent>
          {BOOK_GENRES.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Outro</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o gênero"
        />
      )}
    </div>
  );
}
