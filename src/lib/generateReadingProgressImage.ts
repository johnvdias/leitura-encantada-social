import { ReadingEmotion } from "./readingEmotions";

export interface ReadingProgressCardData {
  title: string;
  author: string;
  coverUrl: string | null;
  progressLabel: string; // ex: "48%" ou "154/320 págs"
  emotions: ReadingEmotion[];
}

const WIDTH = 1200;
const HEIGHT = 520;
const PADDING = 64;

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
};

// Quebra o título em no máximo 2 linhas, cortando com reticências se precisar
// de uma terceira.
const wrapTitle = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
    if (lines.length === 2) break;
  }
  if (lines.length < 2 && current) lines.push(current);

  if (lines.length === 2) {
    lines[1] = fitText(ctx, lines[1], maxWidth);
  }
  return lines.slice(0, 2);
};

// Carrega a capa do livro pro canvas. Capas vêm de fontes externas (Google
// Books, Open Library) que nem sempre liberam CORS - quando isso acontece o
// canvas fica "tainted" e toBlob() falha. Por isso qualquer erro de carga
// aqui simplesmente devolve null, e quem chama desenha um placeholder no
// lugar em vez de quebrar a geração da imagem inteira.
const loadCoverImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const generateReadingProgressImageBlob = async (
  data: ReadingProgressCardData,
  transparent: boolean
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (!transparent) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Capa do livro
  const coverWidth = 300;
  const coverHeight = 440;
  const coverX = PADDING;
  const coverY = (HEIGHT - coverHeight) / 2;

  const coverImg = data.coverUrl ? await loadCoverImage(data.coverUrl) : null;

  ctx.save();
  roundRect(ctx, coverX, coverY, coverWidth, coverHeight, 16);
  ctx.clip();
  if (coverImg) {
    ctx.drawImage(coverImg, coverX, coverY, coverWidth, coverHeight);
  } else {
    const placeholder = ctx.createLinearGradient(coverX, coverY, coverX + coverWidth, coverY + coverHeight);
    placeholder.addColorStop(0, 'hsl(340, 55%, 30%)');
    placeholder.addColorStop(1, 'hsl(280, 40%, 25%)');
    ctx.fillStyle = placeholder;
    ctx.fillRect(coverX, coverY, coverWidth, coverHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 100px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.title.charAt(0).toUpperCase(), coverX + coverWidth / 2, coverY + coverHeight / 2 + 35);
  }
  ctx.restore();

  // Texto: título, autora, pílulas
  const textX = coverX + coverWidth + 56;
  const textMaxWidth = WIDTH - textX - PADDING;
  ctx.textAlign = 'left';

  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  const titleLines = wrapTitle(ctx, data.title, textMaxWidth);
  let cursorY = coverY + 70;
  titleLines.forEach((line) => {
    ctx.fillText(line, textX, cursorY);
    cursorY += 60;
  });

  cursorY += 8;
  ctx.font = '400 34px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(fitText(ctx, data.author, textMaxWidth), textX, cursorY);

  // Pílulas: progresso + emoções, quebrando linha quando não cabe mais.
  cursorY += 60;
  let pillX = textX;
  const pillHeight = 56;
  const pillGap = 14;
  const pillPaddingX = 28;

  const drawPill = (label: string, dotColor: string | null, bold: boolean) => {
    ctx.font = bold ? '700 30px Inter, sans-serif' : '600 28px Inter, sans-serif';
    const dotWidth = dotColor ? 34 : 0;
    const textWidth = ctx.measureText(label).width;
    const pillWidth = pillPaddingX * 2 + dotWidth + textWidth;

    if (pillX + pillWidth > textX + textMaxWidth) {
      pillX = textX;
      cursorY += pillHeight + pillGap;
    }

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, pillX, cursorY, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();

    let innerX = pillX + pillPaddingX;
    if (dotColor) {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(innerX + 8, cursorY + pillHeight / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      innerX += 26;
    }

    ctx.fillStyle = '#111111';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, innerX, cursorY + pillHeight / 2 + 2);
    ctx.textBaseline = 'alphabetic';

    pillX += pillWidth + pillGap;
  };

  drawPill(data.progressLabel, null, true);
  data.emotions.forEach((emotion) => drawPill(emotion.label, emotion.color, false));

  // Marca do app no canto
  ctx.font = '500 24px Georgia, serif';
  ctx.fillStyle = transparent ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('📚 Leitura Encantada', WIDTH - PADDING, HEIGHT - 32);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};
