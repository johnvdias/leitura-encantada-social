import { ReadingEmotion } from "./readingEmotions";

export type RetrospectiveBackgroundMode = 'cover' | 'solid' | 'transparent';

export interface RetrospectiveFavoriteBook {
  title: string;
  coverUrl: string | null;
  rating: number | null;
}

export interface RetrospectiveStats {
  completedCount: number;
  topGenre: string | null;
  topAuthor: string | null;
  totalPages: number;
  longestStreak: number;
  favoriteBook: RetrospectiveFavoriteBook | null;
}

export interface RetrospectiveImageData {
  periodLabel: string;
  stats: RetrospectiveStats;
  emotions: ReadingEmotion[];
  displayName?: string | null;
  background: {
    mode: RetrospectiveBackgroundMode;
    color?: string;
  };
  textColor?: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

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

const loadCoverImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

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

const drawGradientFallback = (ctx: CanvasRenderingContext2D) => {
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, 'hsl(340, 65%, 75%)');
  bg.addColorStop(0.5, 'hsl(280, 40%, 82%)');
  bg.addColorStop(1, 'hsl(200, 45%, 78%)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(WIDTH - 100, 120, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, HEIGHT - 160, 140, 0, Math.PI * 2);
  ctx.fill();
};

// Pílulas de "reação" (emoções escolhidas pra descrever o período), sem a
// pílula de progresso - reaproveita o mesmo visual do card de progresso.
const drawEmotionPills = (
  ctx: CanvasRenderingContext2D,
  emotions: ReadingEmotion[],
  centerX: number,
  startY: number,
  maxWidth: number
): number => {
  if (emotions.length === 0) return startY;

  const pillHeight = 56;
  const pillGap = 14;
  const pillPaddingX = 26;
  const fontSize = 30;

  const measured = emotions.map((e) => {
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    const width = pillPaddingX * 2 + 34 + ctx.measureText(e.label).width;
    return { ...e, width };
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
  rows.forEach((row) => {
    const totalWidth = row.reduce((sum, item) => sum + item.width, 0) + pillGap * (row.length - 1);
    let x = centerX - totalWidth / 2;

    row.forEach((item) => {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, cursorY, item.width, pillHeight, pillHeight / 2);
      ctx.fill();

      let innerX = x + pillPaddingX;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(innerX + 8, cursorY + pillHeight / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      innerX += 26;

      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, innerX, cursorY + pillHeight / 2 + 2);
      ctx.textBaseline = 'alphabetic';

      x += item.width + pillGap;
    });

    cursorY += pillHeight + pillGap;
  });

  ctx.textAlign = 'center';
  return cursorY;
};

export const generateRetrospectiveImageBlob = async (
  data: RetrospectiveImageData
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { mode, color } = data.background;
  const coverUrl = data.stats.favoriteBook?.coverUrl ?? null;
  const coverImg = mode === 'cover' && coverUrl ? await loadCoverImage(coverUrl) : null;

  let textColor = 'hsl(340, 15%, 12%)';
  let mutedTextColor = 'hsl(340, 15%, 32%)';

  if (mode === 'solid' && color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    textColor = getContrastTextColor(color);
    mutedTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(17,17,17,0.7)';
  } else if (mode === 'cover') {
    if (coverImg) {
      ctx.save();
      ctx.filter = 'blur(70px) brightness(0.5)';
      drawImageCover(ctx, coverImg, -40, -40, WIDTH + 80, HEIGHT + 80);
      ctx.restore();
      textColor = '#ffffff';
      mutedTextColor = 'rgba(255,255,255,0.75)';
    } else {
      drawGradientFallback(ctx);
    }
  }
  // mode === 'transparent': canvas fica com alpha 0 onde nada for desenhado.

  if (data.textColor) {
    textColor = data.textColor;
    mutedTextColor = hexToRgba(data.textColor, 0.75);
  }

  ctx.textAlign = 'center';

  let cursorY = 130;
  ctx.font = '600 44px Georgia, serif';
  ctx.fillStyle = textColor;
  ctx.fillText('✨ Retrospectiva ✨', WIDTH / 2, cursorY);

  cursorY += 50;
  ctx.font = '400 32px Georgia, serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText(data.periodLabel, WIDTH / 2, cursorY);

  if (data.displayName) {
    cursorY += 42;
    ctx.font = '400 26px Inter, sans-serif';
    ctx.fillText(`de ${fitText(ctx, data.displayName, WIDTH - 160)}`, WIDTH / 2, cursorY);
  }

  cursorY += 170;
  ctx.font = '700 170px Georgia, serif';
  ctx.fillStyle = textColor;
  ctx.fillText(String(data.stats.completedCount), WIDTH / 2, cursorY);

  cursorY += 50;
  ctx.font = '500 32px Inter, sans-serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText(
    `livro${data.stats.completedCount === 1 ? '' : 's'} lido${data.stats.completedCount === 1 ? '' : 's'}`,
    WIDTH / 2,
    cursorY
  );

  // Card do livro favorito do período, com a capa em miniatura.
  const favorite = data.stats.favoriteBook;
  if (favorite) {
    cursorY += 50;
    const cardWidth = WIDTH - 160;
    const cardHeight = 170;
    const cardX = 80;
    const cardY = cursorY;

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 24);
    ctx.fill();

    const thumbW = 100;
    const thumbH = 140;
    const thumbX = cardX + 20;
    const thumbY = cardY + (cardHeight - thumbH) / 2;

    ctx.save();
    roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 10);
    ctx.clip();
    const favoriteImg = favorite.coverUrl ? await loadCoverImage(favorite.coverUrl) : null;
    if (favoriteImg) {
      drawImageCover(ctx, favoriteImg, thumbX, thumbY, thumbW, thumbH);
    } else {
      ctx.fillStyle = 'hsl(280, 40%, 45%)';
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
    }
    ctx.restore();

    const textX = thumbX + thumbW + 28;
    const textMaxWidth = cardX + cardWidth - textX - 20;

    ctx.textAlign = 'left';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 35%)';
    ctx.fillText('📖 Livro favorito do período', textX, cardY + 46);

    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 12%)';
    ctx.fillText(fitText(ctx, favorite.title, textMaxWidth), textX, cardY + 88);

    if (favorite.rating) {
      ctx.font = '26px Inter, sans-serif';
      ctx.fillText('⭐'.repeat(favorite.rating), textX, cardY + 128);
    }

    ctx.textAlign = 'center';
    cursorY = cardY + cardHeight;
  }

  // Grade de estatísticas 2x2.
  cursorY += 50;
  const tiles: { emoji: string; value: string; label: string }[] = [
    { emoji: '📖', value: data.stats.topGenre || '—', label: 'Gênero favorito' },
    { emoji: '🏆', value: data.stats.topAuthor || '—', label: 'Autora mais lida' },
    { emoji: '#️⃣', value: String(data.stats.totalPages), label: 'Páginas viradas' },
    { emoji: '🔥', value: `${data.stats.longestStreak} dia(s)`, label: 'Maior sequência' },
  ];

  const gridLeft = 80;
  const gap = 24;
  const tileWidth = (WIDTH - gridLeft * 2 - gap) / 2;
  const tileHeight = 170;

  tiles.forEach((tile, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridLeft + col * (tileWidth + gap);
    const y = cursorY + row * (tileHeight + gap);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    roundRect(ctx, x, y, tileWidth, tileHeight, 28);
    ctx.fill();

    const centerX = x + tileWidth / 2;

    ctx.font = '44px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 15%)';
    ctx.fillText(tile.emoji, centerX, y + 62);

    ctx.font = '600 32px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 12%)';
    ctx.fillText(fitText(ctx, tile.value, tileWidth - 40), centerX, y + 110);

    ctx.font = '400 22px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 35%)';
    ctx.fillText(tile.label, centerX, y + 144);
  });

  cursorY += tileHeight * 2 + gap + 60;

  if (data.emotions.length > 0) {
    drawEmotionPills(ctx, data.emotions, WIDTH / 2, cursorY, WIDTH - 160);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};
