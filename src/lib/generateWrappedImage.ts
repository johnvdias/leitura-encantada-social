export interface WrappedImageStats {
  completedCount: number;
  topGenre: string | null;
  topAuthor: string | null;
  totalPages: number;
  longestStreak: number;
}

const WIDTH = 1080;
const HEIGHT = 1080;

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

// Trunca com reticências pra não estourar a largura do card no canvas
// (não tem "truncate" do CSS aqui).
const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
};

export const generateWrappedImageBlob = async (
  stats: WrappedImageStats,
  year: number,
  displayName?: string | null
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fundo em degradê com as mesmas cores da marca (rosa -> lilás -> azul bebê).
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, 'hsl(340, 65%, 75%)');
  bg.addColorStop(0.5, 'hsl(280, 40%, 82%)');
  bg.addColorStop(1, 'hsl(200, 45%, 78%)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Alguns círculos suaves de fundo, só pra dar um clima "encantado".
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(WIDTH - 100, 120, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, HEIGHT - 160, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';

  // Cabeçalho
  ctx.fillStyle = 'hsl(340, 15%, 15%)';
  ctx.font = '600 40px Georgia, serif';
  ctx.fillText('✨ Retrospectiva de Leitura ✨', WIDTH / 2, 130);

  ctx.font = '400 32px Georgia, serif';
  ctx.fillStyle = 'hsl(340, 15%, 25%)';
  ctx.fillText(String(year), WIDTH / 2, 185);

  if (displayName) {
    ctx.font = '400 26px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 30%)';
    ctx.fillText(`de ${fitText(ctx, displayName, WIDTH - 160)}`, WIDTH / 2, 225);
  }

  // Número grande de livros lidos
  ctx.font = '700 220px Georgia, serif';
  ctx.fillStyle = 'hsl(340, 15%, 12%)';
  ctx.fillText(String(stats.completedCount), WIDTH / 2, 500);

  ctx.font = '500 34px Inter, sans-serif';
  ctx.fillStyle = 'hsl(340, 15%, 25%)';
  ctx.fillText(`livro(s) lido(s) em ${year}`, WIDTH / 2, 550);

  // Grade 2x2 de estatísticas, em cards translúcidos
  const tiles: { emoji: string; value: string; label: string }[] = [
    { emoji: '📖', value: stats.topGenre || '—', label: 'Gênero favorito' },
    { emoji: '🏆', value: stats.topAuthor || '—', label: 'Autora mais lida' },
    { emoji: '#️⃣', value: String(stats.totalPages), label: 'Páginas viradas' },
    { emoji: '🔥', value: `${stats.longestStreak} dia(s)`, label: 'Maior sequência' },
  ];

  const gridTop = 620;
  const gridLeft = 80;
  const gap = 24;
  const tileWidth = (WIDTH - gridLeft * 2 - gap) / 2;
  const tileHeight = 190;

  tiles.forEach((tile, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridLeft + col * (tileWidth + gap);
    const y = gridTop + row * (tileHeight + gap);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    roundRect(ctx, x, y, tileWidth, tileHeight, 28);
    ctx.fill();

    const centerX = x + tileWidth / 2;

    ctx.font = '48px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 15%)';
    ctx.fillText(tile.emoji, centerX, y + 66);

    ctx.font = '600 34px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 12%)';
    ctx.fillText(fitText(ctx, tile.value, tileWidth - 40), centerX, y + 118);

    ctx.font = '400 24px Inter, sans-serif';
    ctx.fillStyle = 'hsl(340, 15%, 35%)';
    ctx.fillText(tile.label, centerX, y + 155);
  });

  // Rodapé com a marca do app
  ctx.font = '600 30px Georgia, serif';
  ctx.fillStyle = 'hsl(340, 15%, 15%)';
  ctx.fillText('📚 Leitura Encantada', WIDTH / 2, HEIGHT - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};
