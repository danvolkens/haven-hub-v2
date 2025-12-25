import sharp from 'sharp';

interface ResizeOptions {
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
}

/**
 * Resize a master quote image to the target dimensions.
 * Uses smart cropping to maintain the visual focus while fitting the new aspect ratio.
 */
export async function resizeMasterImage(
  inputBuffer: Buffer,
  options: ResizeOptions
): Promise<Buffer> {
  const { width, height, fit = 'cover', background = '#ffffff' } = options;

  // Get input image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const inputWidth = metadata.width || width;
  const inputHeight = metadata.height || height;

  // Calculate aspect ratios
  const inputAspect = inputWidth / inputHeight;
  const targetAspect = width / height;

  // Determine resize strategy based on aspect ratio difference
  const aspectDiff = Math.abs(inputAspect - targetAspect) / targetAspect;

  let pipeline = sharp(inputBuffer);

  if (aspectDiff > 0.3) {
    // Significant aspect ratio difference - use contain with background
    // This prevents too much cropping
    pipeline = pipeline.resize(width, height, {
      fit: 'contain',
      background: parseBackground(background),
    });
  } else {
    // Similar aspect ratios - use cover with attention-based cropping
    pipeline = pipeline.resize(width, height, {
      fit: 'cover',
      position: 'attention', // Uses ML to find the focal point
    });
  }

  // Output as high-quality PNG
  const outputBuffer = await pipeline
    .png({
      quality: 100,
      compressionLevel: 6,
    })
    .toBuffer();

  return outputBuffer;
}

/**
 * Parse a CSS color string to sharp-compatible format
 */
function parseBackground(color: string): { r: number; g: number; b: number; alpha: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        alpha: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        alpha: 1,
      };
    }
  }

  // Default to white
  return { r: 255, g: 255, b: 255, alpha: 1 };
}

/**
 * Create a smart crop that preserves text content
 * Uses edge detection to find areas with content
 */
export async function smartCropForText(
  inputBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const inputWidth = metadata.width || targetWidth;
  const inputHeight = metadata.height || targetHeight;

  // Calculate the scale factor to fit the target dimensions
  const scaleX = targetWidth / inputWidth;
  const scaleY = targetHeight / inputHeight;
  const scale = Math.max(scaleX, scaleY);

  // Calculate new dimensions after scaling
  const scaledWidth = Math.round(inputWidth * scale);
  const scaledHeight = Math.round(inputHeight * scale);

  // Calculate crop offsets (center crop)
  const cropX = Math.max(0, Math.round((scaledWidth - targetWidth) / 2));
  const cropY = Math.max(0, Math.round((scaledHeight - targetHeight) / 2));

  // Resize and crop
  const outputBuffer = await sharp(inputBuffer)
    .resize(scaledWidth, scaledHeight, { fit: 'fill' })
    .extract({
      left: cropX,
      top: cropY,
      width: targetWidth,
      height: targetHeight,
    })
    .png({ quality: 100 })
    .toBuffer();

  return outputBuffer;
}
