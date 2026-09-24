import { ReadingEmotion } from "./readingEmotions";

export type CardLayout = 'story' | 'miniature';
export type BackgroundMode = 'cover' | 'solid' | 'transparent';

export interface ReadingProgressCardData {
  title: string;
  author: string;
  coverUrl: string | null;
  progressLabel: string; // ex: "48%" ou "154/320 págs"
  emotions: ReadingEmotion[];
  layout: CardLayout;
  background: {
    mode: BackgroundMode;
    color?: string; // hex, só usado quando mode === 'solid'
  };
  textColor?: string; // hex, quando definido substitui a cor automática (título/autor)
}

const SIZES: Record<CardLayout, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  miniature: { width: 1200, height: 520 },
};

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

// Quebra em no máximo `maxLines` linhas, cortando com reticências se precisar
// de mais.
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
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
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines) {
    lines[maxLines - 1] = fitText(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines.slice(0, maxLines);
};

// Capas vêm de fontes externas (Google Books, Open Library) que nem sempre
// liberam CORS - quando isso acontece o canvas fica "tainted" e toBlob()
// falha. Por isso qualquer erro de carga aqui devolve null, e quem chama
// desenha um placeholder no lugar em vez de quebrar a geração inteira.
const loadCoverImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

const drawCoverPlaceholder = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  initial: string
) => {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, 'hsl(340, 55%, 30%)');
  gradient.addColorStop(1, 'hsl(280, 40%, 25%)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${Math.round(h * 0.22)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(initial, x + w / 2, y + h / 2 + h * 0.08);
};

// Preenche o retângulo com uma cobertura tipo "object-fit: cover" (corta
// as bordas pra não distorcer), usado pro fundo desfocado com a capa.
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
  } else {
    drawW = w;
    drawH = w / imgRatio;
  }
  const offsetX = x - (drawW - w) / 2;
  const offsetY = y - (drawH - h) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
};

// Preto ou branco, o que tiver mais contraste com a cor de fundo sólida
// escolhida (luminância relativa).
const getContrastTextColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#111111' : '#ffffff';
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const generateReadingProgressImageBlob = async (
  data: ReadingProgressCardData
): Promise<Blob | null> => {
  const { width: WIDTH, height: HEIGHT } = SIZES[data.layout];
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const coverImg = data.coverUrl ? await loadCoverImage(data.coverUrl) : null;
  const { mode, color } = data.background;

  // Cor do texto: branco por padrão (funciona sobre fundo de capa/preto/
  // transparente), preto quando a cor sólida escolhida for clara.
  let textColor = '#ffffff';
  let mutedTextColor = 'rgba(255,255,255,0.65)';

  if (mode === 'solid' && color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    textColor = getContrastTextColor(color);
    mutedTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.65)' : 'rgba(17,17,17,0.65)';
  } else if (mode === 'cover') {
    if (coverImg) {
      ctx.save();
      ctx.filter = 'blur(60px) brightness(0.55)';
      drawImageCover(ctx, coverImg, -40, -40, WIDTH + 80, HEIGHT + 80);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
  // mode === 'transparent': não preenche nada, canvas fica com alpha 0.

  // Cor de texto escolhida manualmente pelo usuário tem prioridade sobre
  // a automática (seja o branco padrão ou o contraste calculado da cor sólida).
  if (data.textColor) {
    textColor = data.textColor;
    mutedTextColor = hexToRgba(data.textColor, 0.65);
  }

  if (data.layout === 'story') {
    const coverWidth = 620;
    const coverHeight = 910;
    const coverX = (WIDTH - coverWidth) / 2;
    const coverY = 140;

    ctx.save();
    roundRect(ctx, coverX, coverY, coverWidth, coverHeight, 24);
    ctx.clip();
    if (coverImg) {
      drawImageCover(ctx, coverImg, coverX, coverY, coverWidth, coverHeight);
    } else {
      drawCoverPlaceholder(ctx, coverX, coverY, coverWidth, coverHeight, data.title.charAt(0).toUpperCase());
    }
    ctx.restore();

    ctx.textAlign = 'center';
    const textMaxWidth = WIDTH - 140;

    ctx.font = '700 64px Inter, sans-serif';
    ctx.fillStyle = textColor;
    let cursorY = coverY + coverHeight + 100;
    wrapText(ctx, data.title, textMaxWidth, 2).forEach((line) => {
      ctx.fillText(line, WIDTH / 2, cursorY);
      cursorY += 74;
    });

    cursorY += 12;
    ctx.font = '400 40px Inter, sans-serif';
    ctx.fillStyle = mutedTextColor;
    ctx.fillText(fitText(ctx, data.author, textMaxWidth), WIDTH / 2, cursorY);

    cursorY += 70;
    drawPillRow(ctx, data, WIDTH / 2, cursorY, textMaxWidth, 'center');
  } else {
    const PADDING = 64;
    const coverWidth = 300;
    const coverHeight = 440;
    const coverX = PADDING;
    const coverY = (HEIGHT - coverHeight) / 2;

    ctx.save();
    roundRect(ctx, coverX, coverY, coverWidth, coverHeight, 16);
    ctx.clip();
    if (coverImg) {
      drawImageCover(ctx, coverImg, coverX, coverY, coverWidth, coverHeight);
    } else {
      drawCoverPlaceholder(ctx, coverX, coverY, coverWidth, coverHeight, data.title.charAt(0).toUpperCase());
    }
    ctx.restore();

    const textX = coverX + coverWidth + 56;
    const textMaxWidth = WIDTH - textX - PADDING;
    ctx.textAlign = 'left';

    ctx.font = '700 52px Inter, sans-serif';
    ctx.fillStyle = textColor;
    let cursorY = coverY + 70;
    wrapText(ctx, data.title, textMaxWidth, 2).forEach((line) => {
      ctx.fillText(line, textX, cursorY);
      cursorY += 60;
    });

    cursorY += 8;
    ctx.font = '400 34px Inter, sans-serif';
    ctx.fillStyle = mutedTextColor;
    ctx.fillText(fitText(ctx, data.author, textMaxWidth), textX, cursorY);

    cursorY += 60;
    drawPillRow(ctx, data, textX, cursorY, textMaxWidth, 'left');
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};

// Desenha a pílula de progresso + uma pra cada emoção, quebrando linha
// quando não cabe mais. `align` controla se as pílulas partem alinhadas à
// esquerda (miniatura) ou centralizadas por linha (story).
function drawPillRow(
  ctx: CanvasRenderingContext2D,
  data: ReadingProgressCardData,
  startX: number,
  startY: number,
  maxWidth: number,
  align: 'left' | 'center'
) {
  const pillHeight = data.layout === 'story' ? 64 : 56;
  const pillGap = 14;
  const pillPaddingX = 28;
  const baseFontSize = data.layout === 'story' ? 34 : 28;

  const items: { label: string; dotColor: string | null; bold: boolean }[] = [
    { label: data.progressLabel, dotColor: null, bold: true },
    ...data.emotions.map((e) => ({ label: e.label, dotColor: e.color, bold: false })),
  ];

  // Primeiro mede tudo e agrupa em linhas, pra poder centralizar cada
  // linha corretamente quando align === 'center'.
  const measured = items.map((item) => {
    ctx.font = `${item.bold ? 700 : 600} ${baseFontSize}px Inter, sans-serif`;
    const dotWidth = item.dotColor ? 34 : 0;
    const width = pillPaddingX * 2 + dotWidth + ctx.measureText(item.label).width;
    return { ...item, width };
  });

  const rows: (typeof measured)[] = [[]];
  let rowWidth = 0;
  measured.forEach((item) => {
    if (rowWidth + item.width > maxWidth && rows[rows.length - 1].length > 0) {
      rows.push([]);
      rowWidth = 0;
    }
    rows[rows.length - 1].push(item);
    rowWidth += item.width + pillGap;
  });

  let cursorY = startY;
  const textAlignBackup = ctx.textAlign;
  ctx.textAlign = 'left';

  rows.forEach((row) => {
    const totalWidth = row.reduce((sum, item) => sum + item.width, 0) + pillGap * (row.length - 1);
    let x = align === 'center' ? startX - totalWidth / 2 : startX;

    row.forEach((item) => {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, cursorY, item.width, pillHeight, pillHeight / 2);
      ctx.fill();

      let innerX = x + pillPaddingX;
      if (item.dotColor) {
        ctx.fillStyle = item.dotColor;
        ctx.beginPath();
        ctx.arc(innerX + 8, cursorY + pillHeight / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        innerX += 26;
      }

      ctx.font = `${item.bold ? 700 : 600} ${baseFontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#111111';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, innerX, cursorY + pillHeight / 2 + 2);
      ctx.textBaseline = 'alphabetic';

      x += item.width + pillGap;
    });

    cursorY += pillHeight + pillGap;
  });

  ctx.textAlign = textAlignBackup;
}
