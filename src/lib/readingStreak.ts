// Maior sequência de dias (não necessariamente até hoje) com pelo menos uma
// leitura registrada, a partir de uma lista de datas em "YYYY-MM-DD".
// Compartilhado entre a Retrospectiva e as Conquistas pra não duplicar a
// mesma lógica de contagem de dias consecutivos.
export const computeLongestStreak = (dateKeys: string[]): number => {
  const days = Array.from(new Set(dateKeys)).sort();
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
};
