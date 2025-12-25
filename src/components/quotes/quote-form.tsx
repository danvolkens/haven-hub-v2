'use client';

import { useState, useRef } from 'react';
import { Sparkles, Quote as QuoteIcon, Upload, X, ImageIcon } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Card,
  CardContent,
  Badge,
} from '@/components/ui';
import { COLLECTIONS, MOODS, type Collection, type Mood } from '@/lib/constants';
import { cn, capitalize } from '@/lib/utils';
import type { Quote } from '@/types/quotes';

interface QuoteFormProps {
  initialData?: Partial<Quote>;
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface QuoteFormData {
  text: string;
  attribution: string;
  collection: Collection;
  mood: Mood;
  temporal_tags: string[];
  masterImage?: File;
}

const collectionOptions = COLLECTIONS.map((c) => ({
  value: c,
  label: capitalize(c),
  description: getCollectionDescription(c),
}));

const moodOptions = MOODS.map((m) => ({
  value: m,
  label: capitalize(m),
  description: getMoodDescription(m),
}));

function getCollectionDescription(collection: Collection): string {
  switch (collection) {
    case 'grounding':
      return 'Quotes about stability and presence';
    case 'wholeness':
      return 'Quotes about completeness and self-acceptance';
    case 'growth':
      return 'Quotes about change and progress';
    default:
      return '';
  }
}

function getMoodDescription(mood: Mood): string {
  switch (mood) {
    case 'calm':
      return 'Peaceful and serene';
    case 'warm':
      return 'Comforting and nurturing';
    case 'hopeful':
      return 'Optimistic and uplifting';
    case 'reflective':
      return 'Thoughtful and introspective';
    case 'empowering':
      return 'Strong and motivating';
    default:
      return '';
  }
}

export function QuoteForm({ initialData, onSubmit, onCancel, isLoading }: QuoteFormProps) {
  const [mode, setMode] = useState<'text' | 'image'>(
    initialData?.master_image_url ? 'image' : 'text'
  );
  const [form, setForm] = useState<QuoteFormData>({
    text: initialData?.text || '',
    attribution: initialData?.attribution || '',
    collection: initialData?.collection || 'grounding',
    mood: initialData?.mood || 'calm',
    temporal_tags: initialData?.temporal_tags || [],
  });
  const [masterImage, setMasterImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.master_image_url || null
  );
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteFormData, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ text: 'Please select an image file' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ text: 'Image must be less than 10MB' });
        return;
      }
      setMasterImage(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors({});
    }
  };

  const clearImage = () => {
    setMasterImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate based on mode
    if (mode === 'text') {
      if (!form.text.trim()) {
        setErrors({ text: 'Quote text is required' });
        return;
      }
      if (form.text.length > 500) {
        setErrors({ text: 'Quote text must be 500 characters or less' });
        return;
      }
    } else {
      if (!masterImage && !imagePreview) {
        setErrors({ text: 'Please upload a master image' });
        return;
      }
    }

    await onSubmit({
      ...form,
      masterImage: masterImage || undefined,
    });
  };

  const characterCount = form.text.length;
  const isOverLimit = characterCount > 500;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-elevated rounded-lg">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-body-sm font-medium transition-colors cursor-pointer',
            mode === 'text'
              ? 'bg-white shadow-sm text-charcoal'
              : 'text-[var(--color-text-secondary)] hover:text-charcoal'
          )}
        >
          <QuoteIcon className="h-4 w-4 inline-block mr-2" />
          Text Quote
        </button>
        <button
          type="button"
          onClick={() => setMode('image')}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-body-sm font-medium transition-colors cursor-pointer',
            mode === 'image'
              ? 'bg-white shadow-sm text-charcoal'
              : 'text-[var(--color-text-secondary)] hover:text-charcoal'
          )}
        >
          <ImageIcon className="h-4 w-4 inline-block mr-2" />
          Upload Image
        </button>
      </div>

      {mode === 'text' ? (
        <>
          {/* Quote Text */}
          <div className="space-y-2">
            <Label htmlFor="text">Quote Text</Label>
            <Textarea
              id="text"
              value={form.text}
              onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Enter your quote text..."
              rows={4}
              error={errors.text}
              maxLength={500}
              showCharCount
            />
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Keep quotes concise for best visual results
            </p>
          </div>

          {/* Attribution */}
          <div className="space-y-2">
            <Label htmlFor="attribution">Attribution (optional)</Label>
            <Input
              id="attribution"
              value={form.attribution}
              onChange={(e) => setForm((prev) => ({ ...prev, attribution: e.target.value }))}
              placeholder="— Author Name"
              maxLength={100}
            />
          </div>
        </>
      ) : (
        <>
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Master Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border bg-elevated">
                <img
                  src={imagePreview}
                  alt="Master quote image"
                  className="w-full h-auto max-h-80 object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-charcoal/80 text-white hover:bg-charcoal cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--color-text-tertiary)] hover:border-sage hover:text-sage transition-colors cursor-pointer"
              >
                <Upload className="h-8 w-8" />
                <span className="text-body-sm">Click to upload an image</span>
                <span className="text-caption">PNG, JPG, WEBP up to 10MB</span>
              </button>
            )}
            {errors.text && (
              <p className="text-caption text-error">{errors.text}</p>
            )}
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Upload a pre-designed quote image. Assets will be generated by resizing this image.
            </p>
          </div>

          {/* Description for cataloging */}
          <div className="space-y-2">
            <Label htmlFor="text">Description (for catalog)</Label>
            <Textarea
              id="text"
              value={form.text}
              onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Describe this quote for searching and organizing..."
              rows={2}
            />
          </div>
        </>
      )}

      {/* Collection & Mood */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="collection">Collection</Label>
          <Select
            options={collectionOptions}
            value={form.collection}
            onChange={(v) => setForm((prev) => ({ ...prev, collection: v as Collection }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mood">Mood</Label>
          <Select
            options={moodOptions}
            value={form.mood}
            onChange={(v) => setForm((prev) => ({ ...prev, mood: v as Mood }))}
          />
        </div>
      </div>

      {/* Preview */}
      <Card className="bg-elevated">
        <CardContent className="p-6">
          <div className="text-center">
            {mode === 'image' && imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-48 object-contain mx-auto mb-3 rounded"
              />
            ) : (
              <>
                <QuoteIcon className="h-6 w-6 mx-auto mb-3 text-[var(--color-text-tertiary)]" />
                <p className="text-h3 font-serif italic">
                  {form.text || 'Your quote will appear here...'}
                </p>
                {form.attribution && (
                  <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                    — {form.attribution}
                  </p>
                )}
              </>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Badge variant={form.collection}>
                {capitalize(form.collection)}
              </Badge>
              <Badge variant="secondary">{capitalize(form.mood)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} leftIcon={<Sparkles className="h-4 w-4" />}>
          {initialData?.id ? 'Save Changes' : 'Create Quote'}
        </Button>
      </div>
    </form>
  );
}
