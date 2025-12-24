import { createCanvas, loadImage, type ImageData as CanvasImageData } from 'canvas';

export interface QualityScores {
  readability: number;
  contrast: number;
  composition: number;
  overall: number;
}

export interface QualityCheckResult {
  scores: QualityScores;
  flags: string[];
  flagReasons: Record<string, string>;
  passed: boolean;
}

const MIN_THRESHOLDS = {
  readability: 0.6,
  contrast: 0.5,
  overall: 0.6,
};

export async function checkImageQuality(
  imageBuffer: Buffer,
  textBounds: { x: number; y: number; width: number; height: number }
): Promise<QualityCheckResult> {
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  const scores: QualityScores = {
    readability: checkReadability(imageData, textBounds),
    contrast: checkContrast(imageData),
    composition: checkComposition(img.width, img.height, textBounds),
    overall: 0,
  };

  // Calculate overall score (weighted average)
  scores.overall = (
    scores.readability * 0.4 +
    scores.contrast * 0.3 +
    scores.composition * 0.3
  );

  // Determine flags
  const flags: string[] = [];
  const flagReasons: Record<string, string> = {};

  if (scores.readability < MIN_THRESHOLDS.readability) {
    flags.push('low_readability');
    flagReasons.low_readability = `Readability score ${(scores.readability * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.readability * 100)}%`;
  }

  if (scores.contrast < MIN_THRESHOLDS.contrast) {
    flags.push('low_contrast');
    flagReasons.low_contrast = `Contrast score ${(scores.contrast * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.contrast * 100)}%`;
  }

  if (scores.overall < MIN_THRESHOLDS.overall) {
    flags.push('low_overall_quality');
    flagReasons.low_overall_quality = `Overall quality ${(scores.overall * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.overall * 100)}%`;
  }

  return {
    scores,
    flags,
    flagReasons,
    passed: flags.length === 0,
  };
}

function checkReadability(
  imageData: CanvasImageData,
  textBounds: { x: number; y: number; width: number; height: number }
): number {
  // Sample pixels in text area to check for uniform background
  const { x, y, width, height } = textBounds;
  const data = imageData.data;
  const imgWidth = imageData.width;

  let samples = 0;
  const colors: Array<{ r: number; g: number; b: number }> = [];

  // Sample every 10th pixel in text area
  for (let py = Math.max(0, y); py < Math.min(y + height, imageData.height); py += 10) {
    for (let px = Math.max(0, x); px < Math.min(x + width, imgWidth); px += 10) {
      const idx = (py * imgWidth + px) * 4;
      colors.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      });
      samples++;
    }
  }

  if (samples === 0) return 0.8; // Default if no samples

  // Calculate variance in brightness
  const brightnessValues = colors.map(c => (c.r + c.g + c.b) / 3);
  const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  const variance = brightnessValues.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnessValues.length;

  // Lower variance = better readability (more uniform background)
  // Score: 1.0 for variance < 100, decreasing to 0.5 for variance > 2000
  const readabilityScore = Math.max(0.5, 1 - (variance / 2000));

  return Math.min(1, readabilityScore);
}

function checkContrast(imageData: CanvasImageData): number {
  const data = imageData.data;

  // Get average foreground and background colors
  // Assuming text is darker than background in our design
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4 * 100) { // Sample every 100th pixel
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }

  // Calculate contrast ratio
  const contrastRatio = (maxBrightness - minBrightness) / 255;

  // Score: We want decent contrast but not extreme
  // Ideal is around 0.3-0.7
  if (contrastRatio < 0.2) return 0.5;
  if (contrastRatio > 0.8) return 0.8;
  return 0.9 + (0.1 * (1 - Math.abs(contrastRatio - 0.5) / 0.3));
}

function checkComposition(
  width: number,
  height: number,
  textBounds: { x: number; y: number; width: number; height: number }
): number {
  // Check if text is well-positioned
  const centerX = width / 2;
  const centerY = height / 2;
  const textCenterX = textBounds.x + textBounds.width / 2;
  const textCenterY = textBounds.y + textBounds.height / 2;

  // Distance from center as percentage of dimensions
  const xOffset = Math.abs(textCenterX - centerX) / width;
  const yOffset = Math.abs(textCenterY - centerY) / height;

  // Check margin compliance
  const minMargin = Math.min(width, height) * 0.05;
  const hasAdequateMargins =
    textBounds.x >= minMargin &&
    textBounds.y >= minMargin &&
    (textBounds.x + textBounds.width) <= (width - minMargin) &&
    (textBounds.y + textBounds.height) <= (height - minMargin);

  // Score based on centering and margins
  let score = 1.0;
  score -= xOffset * 0.3; // Penalize horizontal offset
  score -= yOffset * 0.3; // Penalize vertical offset
  if (!hasAdequateMargins) score -= 0.2;

  return Math.max(0.5, Math.min(1, score));
}
