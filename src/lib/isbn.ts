// Remove tudo que não for dígito ou X (o dígito verificador de um ISBN-10
// pode ser "X"), pra aceitar ISBN com hífen, espaço ou sem nada.
export function normalizeIsbn(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9X]/g, "");
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(isbn[i]);
  const checkDigit = isbn[9] === "X" ? 10 : Number(isbn[9]);
  sum += 10 * checkDigit;
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

// Só considera ISBN de verdade quando o dígito verificador bate - assim uma
// busca textual que por acaso comece com números não vira ISBN por engano.
export function isValidIsbn(input: string): boolean {
  const normalized = normalizeIsbn(input);
  return isValidIsbn10(normalized) || isValidIsbn13(normalized);
}

export function isIsbn10(input: string): boolean {
  return isValidIsbn10(normalizeIsbn(input));
}

export function isIsbn13(input: string): boolean {
  return isValidIsbn13(normalizeIsbn(input));
}

// Converte ISBN-10 pra ISBN-13 (prefixo 978 + recalcula o dígito
// verificador) - usado pra cruzar identificadores entre Google Books e
// Open Library quando uma fonte só dá um dos dois formatos.
export function isbn10ToIsbn13(isbn10: string): string | null {
  const normalized = normalizeIsbn(isbn10);
  if (!isValidIsbn10(normalized)) return null;

  const core = "978" + normalized.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const checkDigit = (10 - (sum % 10)) % 10;
  return core + checkDigit;
}
