export interface ReadingEmotion {
  id: string;
  label: string;
  color: string; // hsl(), usado tanto no picker (React) quanto no canvas
}

export const READING_EMOTIONS: ReadingEmotion[] = [
  { id: 'curiosa', label: 'curiosa', color: 'hsl(142, 71%, 45%)' },
  { id: 'apaixonada', label: 'apaixonada', color: 'hsl(38, 92%, 50%)' },
  { id: 'conectada', label: 'conectada', color: 'hsl(262, 83%, 58%)' },
  { id: 'emocionada', label: 'emocionada', color: 'hsl(330, 81%, 60%)' },
  { id: 'inspirada', label: 'inspirada', color: 'hsl(217, 91%, 60%)' },
  { id: 'surpresa', label: 'surpresa', color: 'hsl(24, 94%, 53%)' },
  { id: 'nostalgica', label: 'nostálgica', color: 'hsl(243, 75%, 59%)' },
  { id: 'tensa', label: 'tensa', color: 'hsl(0, 72%, 51%)' },
  { id: 'divertida', label: 'divertida', color: 'hsl(173, 80%, 35%)' },
  { id: 'encantada', label: 'encantada', color: 'hsl(292, 84%, 61%)' },
];
