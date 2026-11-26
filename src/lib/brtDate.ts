import { format } from "date-fns";

// Converte um Date (ex: meia-noite local do dia escolhido num calendário) no
// instante UTC correspondente à meia-noite em BRT (fixo em UTC-3) desse
// mesmo dia civil - mesma convenção de "dia civil em BRT" usada no resto do
// app (cronogramas, lembretes diários, heatmap de leitura).
//
// Sem isso, salvar com `date.toISOString()` grava a meia-noite do FUSO DO
// APARELHO de quem está criando: só bate com BRT por coincidência, quando o
// aparelho também está configurado pra America/Sao_Paulo. Num aparelho em
// outro fuso (ou neste próprio ambiente de teste, em UTC), o cronograma
// nascia com start_date/end_date fora de sincronia com o "hoje" que o resto
// do app (e os crons) usam pra decidir se o cronograma já começou/terminou.
export const toBrtMidnightIso = (date: Date): string => `${format(date, 'yyyy-MM-dd')}T03:00:00.000Z`;

// Dia civil em BRT (UTC-3) de um instante - mesma convenção usada no
// heatmap de leitura. Uma leitura registrada às 23h de BRT já é madrugada
// do dia seguinte em UTC; bucketar por `date.toISOString().slice(0, 10)`
// direto (sem esse ajuste) jogava essa leitura pro dia errado ao contar
// sequência de dias consecutivos.
export const brtDateKey = (d: Date): string => new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Início e fim do "dia civil em BRT" de agora, pros filtros de "hoje" em
// reading_history - mesma convenção usada no heatmap de leitura, nos
// cronogramas e nos lembretes diários. Calcular "hoje" pelo fuso do
// aparelho (ex: `new Date().setHours(0,0,0,0)`) contava uma leitura feita
// à noite no dia errado sempre que o aparelho não estivesse configurado
// pra America/Sao_Paulo.
export const brtTodayBounds = (): { startIso: string; endIso: string } => {
  const now = new Date();
  const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const todayBrt = brtNow.toISOString().slice(0, 10);
  const startIso = `${todayBrt}T03:00:00.000Z`;
  const endIso = new Date(new Date(startIso).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { startIso, endIso };
};
