import { roundRect, fitText, loadImage, getContrastTextColor, hexToRgba } from "./canvasImageUtils";

export type CompatibilityBackgroundMode = 'gradient' | 'solid' | 'transparent';

export interface CompatibilityImageData {
  percentage: number;
  commonBooks: number;
  myName: string;
  myAvatarUrl: string | null;
  otherName: string;
  otherAvatarUrl: string | null;
  background: {
    mode: CompatibilityBackgroundMode;
    color?: string;
  };
  textColor?: string;
}

const WIDTH = 1080;
const HEIGHT = 1080;

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
  radius: number,
  ringColor: string
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

  ctx.strokeStyle = ringColor;
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

  const { mode, color } = data.background;

  let textColor = 'hsl(340, 15%, 15%)';
  let mutedTextColor = 'hsl(340, 15%, 35%)';
  let ringColor = '#ffffff';
  let pillBg = 'rgba(255,255,255,0.85)';

  if (mode === 'solid' && color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    textColor = getContrastTextColor(color);
    mutedTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.7)';
    ringColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.9)' : 'rgba(17,17,17,0.15)';
    pillBg = textColor === '#ffffff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)';
  } else if (mode === 'gradient') {
    drawGradientBackground(ctx);
  }
  // mode === 'transparent': canvas fica com alpha 0 onde nada for desenhado.

  if (data.textColor) {
    textColor = data.textColor;
    mutedTextColor = hexToRgba(data.textColor, 0.75);
    ringColor = hexToRgba(data.textColor, 0.6);
  }

  ctx.textAlign = 'center';

  // Ritmo vertical pensado pra caber tudo em 1080px sem sobrepor: o número
  // gigante de porcentagem usa um corpo de fonte grande o bastante pra ter
  // presença, mas o espaço reservado pra ele (ascent + descent reais do
  // Georgia nesse tamanho) é levado em conta explicitamente - foi o que
  // causava a sobreposição com os nomes na versão anterior.
  let cursorY = 140;
  ctx.font = '600 38px Georgia, serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText('✨ Conexão Literária ✨', WIDTH / 2, cursorY);

  cursorY += 190;
  const avatarRadius = 100;
  const avatarGap = 250;
  const leftX = WIDTH / 2 - avatarGap / 2;
  const rightX = WIDTH / 2 + avatarGap / 2;

  await Promise.all([
    drawAvatar(ctx, data.myAvatarUrl, data.myName, leftX, cursorY, avatarRadius, ringColor),
    drawAvatar(ctx, data.otherAvatarUrl, data.otherName, rightX, cursorY, avatarRadius, ringColor),
  ]);

  ctx.font = '600 44px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('+', WIDTH / 2, cursorY + 16);

  cursorY += avatarRadius + 55;
  ctx.font = '600 32px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(fitText(ctx, data.myName, 260), leftX, cursorY);
  ctx.fillText(fitText(ctx, data.otherName, 260), rightX, cursorY);

  cursorY += 230;
  ctx.font = '700 200px Georgia, serif';
  ctx.fillStyle = textColor;
  ctx.fillText(`${data.percentage}%`, WIDTH / 2, cursorY);

  cursorY += 100;
  ctx.font = '600 36px Inter, sans-serif';
  ctx.fillStyle = mutedTextColor;
  ctx.fillText('DE AFINIDADE LITERÁRIA', WIDTH / 2, cursorY);

  cursorY += 110;
  const pillWidth = 560;
  const pillHeight = 90;
  ctx.fillStyle = pillBg;
  roundRect(ctx, WIDTH / 2 - pillWidth / 2, cursorY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();

  ctx.font = '600 34px Inter, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(
    `📚 ${data.commonBooks} livro${data.commonBooks === 1 ? '' : 's'} em comum`,
    WIDTH / 2,
    cursorY + pillHeight / 2 + 12
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};
