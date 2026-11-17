export interface ShelfTheme {
  id: string;
  name: string;
  // Cor de amostra pro botão de seleção (tom do --primary em light mode).
  swatch: string;
  className: string | null;
}

export const SHELF_THEMES: ShelfTheme[] = [
  { id: 'default', name: 'Rosa (padrão)', swatch: 'hsl(340, 65%, 75%)', className: null },
  { id: 'lavanda', name: 'Lavanda', swatch: 'hsl(265, 55%, 78%)', className: 'shelf-theme-lavanda' },
  { id: 'ceu', name: 'Céu', swatch: 'hsl(200, 70%, 70%)', className: 'shelf-theme-ceu' },
  { id: 'jade', name: 'Jade', swatch: 'hsl(150, 45%, 55%)', className: 'shelf-theme-jade' },
  { id: 'ambar', name: 'Âmbar', swatch: 'hsl(35, 85%, 65%)', className: 'shelf-theme-ambar' },
];

export const getShelfThemeClassName = (themeId: string | null | undefined): string | null =>
  SHELF_THEMES.find((t) => t.id === themeId)?.className ?? null;
