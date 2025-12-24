'use client';

import { useState } from 'react';
import { Sparkles, Quote as QuoteIcon } from 'lucide-react';
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
  const [form, setForm] = useState<QuoteFormData>({
    text: initialData?.text || '',
    attribution: initialData?.attribution || '',
    collection: initialData?.collection || 'grounding',
    mood: initialData?.mood || 'calm',
    temporal_tags: initialData?.temporal_tags || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    if (!form.text.trim()) {
      setErrors({ text: 'Quote text is required' });
      return;
    }

    if (form.text.length > 500) {
      setErrors({ text: 'Quote text must be 500 characters or less' });
      return;
    }

    await onSubmit(form);
  };

  const characterCount = form.text.length;
  const isOverLimit = characterCount > 500;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <QuoteIcon className="h-6 w-6 mx-auto mb-3 text-[var(--color-text-tertiary)]" />
            <p className="text-h3 font-serif italic">
              {form.text || 'Your quote will appear here...'}
            </p>
            {form.attribution && (
              <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                — {form.attribution}
              </p>
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
