import {
  differenceInSeconds,
  differenceInMinutes,
  isToday,
  isYesterday,
  isSameWeek,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Formata o "Visto" das mensagens diretas com granularidade decrescente,
// no mesmo espírito do WhatsApp/Instagram: quanto mais recente, mais
// preciso; quanto mais antigo, mais genérico.
export function formatSeenAt(readAt: string): string {
  const date = new Date(readAt);
  const now = new Date();

  const seconds = differenceInSeconds(now, date);
  if (seconds < 60) return "Visto agora";

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `Visto há ${minutes} minuto${minutes > 1 ? "s" : ""}`;

  if (isToday(date)) return `Visto hoje às ${format(date, "HH:mm")}`;

  if (isYesterday(date)) return `Visto ontem às ${format(date, "HH:mm")}`;

  if (isSameWeek(date, now, { weekStartsOn: 0 })) {
    return `Visto ${format(date, "EEEE", { locale: ptBR })}`;
  }

  const lastWeekReference = new Date(now);
  lastWeekReference.setDate(lastWeekReference.getDate() - 7);
  if (isSameWeek(date, lastWeekReference, { weekStartsOn: 0 })) {
    return "Visto semana passada";
  }

  return `Visto em ${format(date, "dd/MM/yyyy")}`;
}
