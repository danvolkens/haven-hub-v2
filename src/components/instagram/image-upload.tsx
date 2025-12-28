'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, X, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface UploadedImage {
  url: string;
  key: string;
  width?: number;
  height?: number;
}

interface ImageUploadProps {
  onUpload: (images: UploadedImage[]) => void;
  maxImages?: number;
  existingImages?: UploadedImage[];
  postType?: 'feed' | 'reel' | 'story' | 'carousel';
  className?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MIN_DIMENSIONS = {
  feed: { width: 1080, height: 1080 },
  reel: { width: 1080, height: 1920 },
  story: { width: 1080, height: 1920 },
  carousel: { width: 1080, height: 1080 },
};

// ============================================================================
// Helper Functions
// ============================================================================

function validateFile(file: File, postType: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      resolve({ valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      resolve({ valid: false, error: 'Image must be under 10MB' });
      return;
    }

    // Check dimensions
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      const minDim = MIN_DIMENSIONS[postType as keyof typeof MIN_DIMENSIONS] || MIN_DIMENSIONS.feed;

      if (img.width < minDim.width) {
        resolve({
          valid: false,
          error: `Image width must be at least ${minDim.width}px (yours: ${img.width}px)`,
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      resolve({ valid: false, error: 'Failed to read image' });
    };

    img.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// Main Component
// ============================================================================

export function ImageUpload({
  onUpload,
  maxImages = 1,
  existingImages = [],
  postType = 'feed',
  className = '',
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('postType', postType);

      const res = await fetch('/api/instagram/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      const newImages = [...images, data];
      setImages(newImages);
      onUpload(newImages);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check max images
    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed`);
      return;
    }

    const file = files[0];

    // Validate file
    const validation = await validateFile(file, postType);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Upload
    uploadMutation.mutate(file);
  }, [images.length, maxImages, postType, uploadMutation]);

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Remove image
  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUpload(newImages);
    setError(null);
  };

  // Click to browse
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const canUploadMore = images.length < maxImages;

  return (
    <div className={className}>
      {/* Uploaded images preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((img, index) => (
            <div
              key={img.key || index}
              className="relative aspect-square rounded-lg overflow-hidden border"
            >
              <img
                src={img.url}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 transition-colors"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              {maxImages > 1 && (
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canUploadMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-sage bg-sage/10'
              : 'border-muted-foreground/30 hover:border-sage/50 hover:bg-muted/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-sage animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                {dragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG or WebP (min {MIN_DIMENSIONS[postType]?.width || 1080}px wide)
              </p>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-error text-sm mt-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Help text */}
      {maxImages > 1 && (
        <p className="text-xs text-muted-foreground mt-2">
          {images.length}/{maxImages} images uploaded
        </p>
      )}
    </div>
  );
}
