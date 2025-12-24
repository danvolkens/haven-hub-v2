'use client';

import { ContentBlock, BLOCK_CONFIGS } from './block-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BlockEditorProps {
  block: ContentBlock;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function BlockEditor({ block, onUpdate, onDelete }: BlockEditorProps) {
  const config = BLOCK_CONFIGS.find(c => c.type === block.type);

  const updateField = (key: string, value: any) => {
    onUpdate({ ...block.content, [key]: value });
  };

  const renderFields = () => {
    switch (block.type) {
      case 'hero':
        return (
          <>
            <div>
              <Label>Headline</Label>
              <Input
                value={block.content.headline}
                onChange={(e) => updateField('headline', e.target.value)}
              />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea
                value={block.content.subheadline}
                onChange={(e) => updateField('subheadline', e.target.value)}
              />
            </div>
            <div>
              <Label>CTA Text</Label>
              <Input
                value={block.content.ctaText}
                onChange={(e) => updateField('ctaText', e.target.value)}
              />
            </div>
            <div>
              <Label>CTA Link</Label>
              <Input
                value={block.content.ctaLink}
                onChange={(e) => updateField('ctaLink', e.target.value)}
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={block.content.alignment}
                onChange={(value) => updateField('alignment', value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <Label>Content</Label>
              <Textarea
                value={block.content.content.replace(/<[^>]*>/g, '')}
                onChange={(e) => updateField('content', `<p>${e.target.value}</p>`)}
                rows={6}
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={block.content.alignment}
                onChange={(value) => updateField('alignment', value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </>
        );

      case 'cta':
        return (
          <>
            <div>
              <Label>Button Text</Label>
              <Input
                value={block.content.text}
                onChange={(e) => updateField('text', e.target.value)}
              />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input
                value={block.content.link}
                onChange={(e) => updateField('link', e.target.value)}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={block.content.style}
                onChange={(value) => updateField('style', value)}
                options={[
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                ]}
              />
            </div>
            <div>
              <Label>Size</Label>
              <Select
                value={block.content.size}
                onChange={(value) => updateField('size', value)}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </div>
          </>
        );

      case 'testimonial':
        return (
          <>
            <div>
              <Label>Quote</Label>
              <Textarea
                value={block.content.quote}
                onChange={(e) => updateField('quote', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Author Name</Label>
              <Input
                value={block.content.author}
                onChange={(e) => updateField('author', e.target.value)}
              />
            </div>
            <div>
              <Label>Role/Title</Label>
              <Input
                value={block.content.role}
                onChange={(e) => updateField('role', e.target.value)}
              />
            </div>
          </>
        );

      case 'email_capture':
        return (
          <>
            <div>
              <Label>Headline</Label>
              <Input
                value={block.content.headline}
                onChange={(e) => updateField('headline', e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={block.content.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
            <div>
              <Label>Button Text</Label>
              <Input
                value={block.content.buttonText}
                onChange={(e) => updateField('buttonText', e.target.value)}
              />
            </div>
          </>
        );

      default:
        return (
          <p className="text-muted-foreground">
            No editable properties for this block type.
          </p>
        );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{config?.label || block.type}</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="space-y-4">{renderFields()}</div>
    </div>
  );
}
