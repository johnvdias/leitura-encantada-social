export interface CompatibilityImageData {
  percentage: number;
  commonBooks: number;
  myName: string;
  myAvatarUrl: string | null;
  otherName: string;
  otherAvatarUrl: string | null;
}

const WIDTH = 1080;
const HEIGHT = 1080;

const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
};

const drawGradientBackground = (ctx: CanvasRenderingContext2D) => {
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, 'hsl(340, 65%, 75%)');
  bg.addColorStop(0.5, 'hsl(280, 40%, 82%)');
  bg.addColorStop(1, 'hsl(200, 45%, 78%)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(WIDTH - 110, 130, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(90, HEIGHT - 170, 150, 0, Math.PI * 2);
  ctx.fill();
};

// Desenha o avatar num círculo; sem URL (ou se a imagem falhar ao carregar),
// cai num círculo colorido com a inicial do nome - mesmo fallback visual do
// <AvatarFallback> usado em todo o resto do app.
const drawAvatar = async (
  ctx: CanvasRenderingContext2D,
  url: string | null,
  name: string,
  centerX: number,
  centerY: number,
  radius: number
) => {
  const img = url ? await loadImage(url) : null;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    const imgRatio = img.width / img.height;
    const size = radius * 2;
    let drawW = size;
    let drawH = size;
    if (imgRatio > 1) drawW = size * imgRatio; else drawH = size / imgRatio;
    ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = 'hsl(280, 40%, 55%)';
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.font = `700 ${radius}px Inter, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name[0] || '?').toUpperCase(), centerX, centerY + radius * 0.08);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
};

export const generateCompatibilityImageBlob = async (
  data: CompatibilityImageData
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawGradientBackground(ctx);

  const textColor = '#2a1a22';
  const mutedTextColor = 'rgba(42, 26, 34, 0.7)';

  ctx.textAlign = 'center';

  let cursorY = 150;
  ctx.font = '600 36px Georgia, serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText('✨ Conexão Literária ✨', WIDTH / 2, cursorY);

  cursorY += 170;
  const avatarRadius = 110;
  const avatarGap = 260;
  const leftX = WIDTH / 2 - avatarGap / 2;
  const rightX = WIDTH / 2 + avatarGap / 2;

  await Promise.all([
    drawAvatar(ctx, data.myAvatarUrl, data.myName, leftX, cursorY, avatarRadius),
    drawAvatar(ctx, data.otherAvatarUrl, data.otherName, rightX, cursorY, avatarRadius),
  ]);

  // "+" entre os dois avatares.
  ctx.font = '600 48px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('+', WIDTH / 2, cursorY + 16);

  cursorY += avatarRadius + 60;
  ctx.font = '600 32px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(fitText(ctx, data.myName, 280), leftX, cursorY);
  ctx.fillText(fitText(ctx, data.otherName, 280), rightX, cursorY);

  cursorY += 140;
  ctx.font = '700 260px Georgia, serif';
  ctx.fillStyle = textColor;
  ctx.fillText(`${data.percentage}%`, WIDTH / 2, cursorY);

  cursorY += 60;
  ctx.font = '600 38px Inter, sans-serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText('DE AFINIDADE LITERÁRIA', WIDTH / 2, cursorY);

  cursorY += 110;
  const pillWidth = 560;
  const pillHeight = 90;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  const r = pillHeight / 2;
  const x = WIDTH / 2 - pillWidth / 2;
  const y = cursorY;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + pillWidth, y, x + pillWidth, y + pillHeight, r);
  ctx.arcTo(x + pillWidth, y + pillHeight, x, y + pillHeight, r);
  ctx.arcTo(x, y + pillHeight, x, y, r);
  ctx.arcTo(x, y, x + pillWidth, y, r);
  ctx.closePath();
  ctx.fill();

  ctx.font = '600 34px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(
    `📚 ${data.commonBooks} livro${data.commonBooks === 1 ? '' : 's'} em comum`,
    WIDTH / 2,
    y + pillHeight / 2 + 12
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};
