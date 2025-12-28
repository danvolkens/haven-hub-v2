/**
 * Instagram Asset Validation
 * Prompt 12.2: Validate assets before scheduling
 */

// ============================================================================
// Constants
// ============================================================================

const VALIDATION_RULES = {
  feed: {
    aspectRatio: { min: 0.8, max: 1.91, preferred: 0.8 }, // 4:5 preferred
    minWidth: 1080,
    minHeight: 1350, // 1080x1350 for 4:5
    maxFileSize: 8 * 1024 * 1024, // 8MB for images
    maxVideoSize: 100 * 1024 * 1024, // 100MB for video
    maxDuration: 60, // 60 seconds for video
    minDuration: 3,
  },
  reel: {
    aspectRatio: { min: 0.5, max: 0.6, preferred: 0.5625 }, // 9:16
    minWidth: 1080,
    minHeight: 1920,
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    maxDuration: 90,
    minDuration: 3,
  },
  story: {
    aspectRatio: { min: 0.5, max: 0.6, preferred: 0.5625 }, // 9:16
    minWidth: 1080,
    minHeight: 1920,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxDuration: 60,
    minDuration: 1,
  },
  carousel: {
    aspectRatio: { min: 0.8, max: 1.91, preferred: 0.8 }, // 4:5
    minWidth: 1080,
    minHeight: 1350,
    maxFileSize: 8 * 1024 * 1024,
    maxItems: 10,
    minItems: 2,
  },
};

// ============================================================================
// Types
// ============================================================================

export interface AssetInfo {
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  fileSize?: number;
  duration?: number; // seconds for video
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

type PostType = 'feed' | 'reel' | 'story' | 'carousel';

// ============================================================================
// Validation Functions
// ============================================================================

export function validateAssetForInstagram(
  asset: AssetInfo,
  postType: PostType
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const rules = VALIDATION_RULES[postType];

  // Check dimensions if available
  if (asset.width && asset.height) {
    const aspectRatio = asset.width / asset.height;

    // Check aspect ratio
    if (aspectRatio < rules.aspectRatio.min || aspectRatio > rules.aspectRatio.max) {
      errors.push(
        `Aspect ratio ${aspectRatio.toFixed(2)} is outside the allowed range ` +
        `(${rules.aspectRatio.min}-${rules.aspectRatio.max})`
      );
      suggestions.push(
        `Crop to ${postType === 'feed' || postType === 'carousel' ? '4:5' : '9:16'} aspect ratio`
      );
    }

    // Check minimum dimensions
    if (asset.width < rules.minWidth) {
      errors.push(
        `Width ${asset.width}px is below minimum ${rules.minWidth}px`
      );
      suggestions.push(`Use an image at least ${rules.minWidth}px wide`);
    }

    if (asset.height < rules.minHeight) {
      errors.push(
        `Height ${asset.height}px is below minimum ${rules.minHeight}px`
      );
      suggestions.push(`Use an image at least ${rules.minHeight}px tall`);
    }

    // Warn about optimal dimensions
    const isOptimalRatio = Math.abs(aspectRatio - rules.aspectRatio.preferred) < 0.05;
    if (!isOptimalRatio && errors.length === 0) {
      warnings.push(
        `Aspect ratio ${aspectRatio.toFixed(2)} is not optimal. ` +
        `${postType === 'feed' || postType === 'carousel' ? '4:5' : '9:16'} performs best.`
      );
    }
  }

  // Check file size
  if (asset.fileSize) {
    const maxSize = asset.type === 'video'
      ? (rules as any).maxVideoSize || rules.maxFileSize
      : rules.maxFileSize;

    if (asset.fileSize > maxSize) {
      const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      errors.push(`File size ${sizeMB}MB exceeds maximum ${maxMB}MB`);
      suggestions.push(`Compress the ${asset.type} to reduce file size`);
    }
  }

  // Check video duration
  if (asset.type === 'video' && asset.duration !== undefined) {
    const minDuration = (rules as any).minDuration || 3;
    const maxDuration = (rules as any).maxDuration || 60;

    if (asset.duration < minDuration) {
      errors.push(
        `Video duration ${asset.duration}s is below minimum ${minDuration}s`
      );
      suggestions.push(`Extend video to at least ${minDuration} seconds`);
    }

    if (asset.duration > maxDuration) {
      errors.push(
        `Video duration ${asset.duration}s exceeds maximum ${maxDuration}s`
      );
      suggestions.push(`Trim video to ${maxDuration} seconds or less`);
    }
  }

  // Check carousel-specific rules
  if (postType === 'carousel') {
    // This would be called per-item and aggregated elsewhere
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function validateCarousel(assets: AssetInfo[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const rules = VALIDATION_RULES.carousel;

  // Check item count
  if (assets.length < rules.minItems) {
    errors.push(`Carousel needs at least ${rules.minItems} items`);
  }

  if (assets.length > rules.maxItems) {
    errors.push(`Carousel can have at most ${rules.maxItems} items`);
    suggestions.push(`Remove ${assets.length - rules.maxItems} items`);
  }

  // Validate each item
  assets.forEach((asset, index) => {
    const result = validateAssetForInstagram(asset, 'carousel');
    result.errors.forEach((e) => errors.push(`Item ${index + 1}: ${e}`));
    result.warnings.forEach((w) => warnings.push(`Item ${index + 1}: ${w}`));
    result.suggestions.forEach((s) => suggestions.push(`Item ${index + 1}: ${s}`));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function getPostTypeRequirements(postType: PostType): string[] {
  const rules = VALIDATION_RULES[postType];
  const requirements: string[] = [];

  const aspectRatioName = postType === 'feed' || postType === 'carousel' ? '4:5' : '9:16';
  requirements.push(`Aspect ratio: ${aspectRatioName} (${rules.aspectRatio.preferred})`);
  requirements.push(`Minimum resolution: ${rules.minWidth}x${rules.minHeight}`);
  requirements.push(`Max file size: ${(rules.maxFileSize / (1024 * 1024)).toFixed(0)}MB`);

  if ('maxDuration' in rules) {
    requirements.push(`Video duration: ${rules.minDuration || 3}-${rules.maxDuration}s`);
  }

  if ('maxItems' in rules) {
    requirements.push(`Items: ${rules.minItems}-${rules.maxItems}`);
  }

  return requirements;
}
