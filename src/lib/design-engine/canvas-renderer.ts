import { createCanvas, registerFont, loadImage, type Canvas, type CanvasRenderingContext2D } from 'canvas';
import path from 'path';
import type { DesignConfig, ColorConfig, TypographyConfig, LayoutConfig } from '@/types/quotes';

// Register fonts (run once on server start)
let fontsRegistered = false;
export function registerFonts() {
  if (fontsRegistered) return;

  // Register Haven & Hold brand fonts
  // These should be placed in public/fonts/
  try {
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-Regular.ttf'), {
      family: 'Cormorant Garamond',
      weight: '400',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-Italic.ttf'), {
      family: 'Cormorant Garamond',
      weight: '400',
      style: 'italic',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-SemiBold.ttf'), {
      family: 'Cormorant Garamond',
      weight: '600',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'), {
      family: 'Inter',
      weight: '400',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/Inter-Medium.ttf'), {
      family: 'Inter',
      weight: '500',
    });
    fontsRegistered = true;
  } catch (error) {
    console.warn('Failed to register custom fonts, using system fonts:', error);
  }
}

export interface RenderOptions {
  width: number;
  height: number;
  text: string;
  attribution?: string;
  config: DesignConfig;
}

export interface RenderResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    textBounds: { x: number; y: number; width: number; height: number };
  };
}

export async function renderQuoteImage(options: RenderOptions): Promise<RenderResult> {
  registerFonts();

  const { width, height, text, attribution, config } = options;
  const { typography, colors, layout, decorations } = config;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // Apply decorations
  if (decorations.border) {
    ctx.strokeStyle = decorations.border_color === 'accent' ? colors.accent : decorations.border_color;
    ctx.lineWidth = decorations.border_width;
    const inset = decorations.border_width / 2;
    ctx.strokeRect(inset, inset, width - decorations.border_width, height - decorations.border_width);
  }

  // Calculate text area
  const padding = layout.padding;
  const maxWidth = (width - padding * 2) * (layout.max_width_percent / 100);
  const textAreaX = padding + (width - padding * 2 - maxWidth) / 2;

  // Set typography
  const fontSize = calculateFontSize(text, maxWidth, typography, ctx);
  ctx.font = `${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = layout.text_alignment;
  ctx.textBaseline = 'top';

  // Wrap text
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * typography.line_height;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate attribution height if present
  let attributionHeight = 0;
  if (attribution && layout.include_attribution) {
    ctx.font = `${typography.attribution_font_size}px "${typography.attribution_font_family}"`;
    attributionHeight = typography.attribution_font_size * 1.5 + 20; // Line + spacing
  }

  // Calculate vertical position
  const totalContentHeight = totalTextHeight + attributionHeight;
  let startY: number;

  switch (layout.vertical_alignment) {
    case 'top':
      startY = padding;
      break;
    case 'bottom':
      startY = height - padding - totalContentHeight;
      break;
    case 'center':
    default:
      startY = (height - totalContentHeight) / 2;
  }

  // Render quote text
  ctx.font = `italic ${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  ctx.fillStyle = colors.text;

  let textX: number;
  switch (layout.text_alignment) {
    case 'left':
      textX = textAreaX;
      break;
    case 'right':
      textX = textAreaX + maxWidth;
      break;
    case 'center':
    default:
      textX = width / 2;
  }

  const textBounds = {
    x: textAreaX,
    y: startY,
    width: maxWidth,
    height: totalTextHeight,
  };

  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight);
  });

  // Render attribution
  if (attribution && layout.include_attribution) {
    ctx.font = `${typography.attribution_font_size}px "${typography.attribution_font_family}"`;
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.7;
    ctx.fillText(`— ${attribution}`, textX, startY + totalTextHeight + 20);
    ctx.globalAlpha = 1;
  }

  return {
    buffer: canvas.toBuffer('image/png'),
    metadata: {
      width,
      height,
      textBounds,
    },
  };
}

function calculateFontSize(
  text: string,
  maxWidth: number,
  typography: TypographyConfig,
  ctx: CanvasRenderingContext2D
): number {
  let fontSize = typography.font_size_base;

  // Adjust based on text length
  if (text.length > 200) {
    fontSize = fontSize * 0.7;
  } else if (text.length > 100) {
    fontSize = fontSize * 0.85;
  }

  // Ensure text fits width
  ctx.font = `${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  const testMetrics = ctx.measureText(text);

  if (testMetrics.width > maxWidth * 3) {
    fontSize = fontSize * 0.8;
  }

  return Math.round(fontSize);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
