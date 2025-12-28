import sharp from 'sharp';

interface ResizeOptions {
  width: number;
  height: number;
  background?: string;
}

/**
 * Resize a master quote image to the target dimensions.
 * Matches the behavior of the Haven & Hold batch resize script:
 * - For aspect ratio changes: fill + center crop (like magick -resize WxH^ -gravity center -extent WxH)
 * - For same aspect ratio: simple scale (like magick -resize WxH)
 */
export async function resizeMasterImage(
  inputBuffer: Buffer,
  options: ResizeOptions
): Promise<Buffer> {
  const { width, height, background = '#ffffff' } = options;

  // Get input image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const inputWidth = metadata.width || width;
  const inputHeight = metadata.height || height;

  // Calculate aspect ratios
  const inputAspect = inputWidth / inputHeight;
  const targetAspect = width / height;

  // Check if aspect ratios are essentially the same (within 2% tolerance)
  const aspectDiff = Math.abs(inputAspect - targetAspect) / targetAspect;
  const isSameAspect = aspectDiff < 0.02;

  let pipeline = sharp(inputBuffer);

  if (isSameAspect) {
    // Same aspect ratio - simple scale (no cropping needed)
    // Equivalent to: magick -resize WxH
    pipeline = pipeline.resize(width, height, {
      fit: 'fill', // Exact dimensions, no cropping
    });
  } else {
    // Different aspect ratio - fill + crop
    // Determine crop direction based on aspect ratio comparison
    const targetIsWider = targetAspect > inputAspect;

    // When target is wider: we crop top/bottom - use centre to preserve logo
    // When target is narrower: we crop sides - attention works well for centering content
    const cropPosition = targetIsWider ? 'centre' : 'attention';

    pipeline = pipeline.resize(width, height, {
      fit: 'cover',
      position: cropPosition,
    });
  }

  // Output as high-quality PNG at 300 DPI
  const outputBuffer = await pipeline
    .png({
      compressionLevel: 6,
    })
    .withMetadata({
      density: 300, // 300 DPI for print quality
    })
    .toBuffer();

  return outputBuffer;
}
