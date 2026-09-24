import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompletedDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
}

// Seletor opcional pra data em que a leitura foi concluída. Quando `value`
// é null mostra "Hoje" (o fallback aplicado ao salvar), sem forçar a
// usuária a escolher uma data.
export function CompletedDatePicker({
  value,
  onChange,
  label = "Data em que terminou de ler (opcional)",
}: CompletedDatePickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="flex-1 justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP", { locale: ptBR }) : "Hoje"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={(date) => onChange(date ?? null)}
              disabled={(date) => date > new Date()}
              locale={ptBR}
              captionLayout="dropdown-buttons"
              fromYear={new Date().getFullYear() - 100}
              toYear={new Date().getFullYear()}
              classNames={{
                caption_dropdowns: "flex gap-1 items-center",
                dropdown: "rounded-md border border-input bg-background px-2 py-1 text-sm capitalize focus:outline-none focus:ring-1 focus:ring-ring",
              }}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            title="Usar a data de hoje"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
