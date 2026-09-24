export type BookFormat = 'physical' | 'kindle' | 'audiobook';

export const BOOK_FORMATS: { value: BookFormat; label: string }[] = [
  { value: 'physical', label: 'Livro Físico' },
  { value: 'kindle', label: 'Kindle' },
  { value: 'audiobook', label: 'Audiobook' },
];

export const BOOK_FORMAT_LABEL: Record<BookFormat, string> = {
  physical: 'Livro Físico',
  kindle: 'Kindle',
  audiobook: 'Audiobook',
};
