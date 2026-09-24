import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Book, Tablet, Headphones } from "lucide-react";
import { BOOK_FORMATS, BookFormat } from "@/lib/bookFormats";

const FORMAT_ICONS: Record<BookFormat, typeof Book> = {
  physical: Book,
  kindle: Tablet,
  audiobook: Headphones,
};

interface BookFormatSelectProps {
  value: BookFormat;
  onChange: (value: BookFormat) => void;
  className?: string;
}

export function BookFormatSelect({ value, onChange, className }: BookFormatSelectProps) {
  const Icon = FORMAT_ICONS[value];
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BookFormat)}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-4 w-4 shrink-0" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {BOOK_FORMATS.map((format) => (
          <SelectItem key={format.value} value={format.value}>
            {format.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
