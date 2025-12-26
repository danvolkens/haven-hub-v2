'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Eye, Globe, GlobeLock } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Card, CardHeader, CardContent, Input, Label, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  placeholder: string;
}

const PAGE_TYPES = [
  { value: 'lead_magnet', label: 'Lead Magnet' },
  { value: 'newsletter', label: 'Newsletter Signup' },
  { value: 'product', label: 'Product Launch' },
];

const LEAD_MAGNET_TYPES = [
  { value: '', label: 'None' },
  { value: 'ebook', label: 'eBook' },
  { value: 'wallpaper', label: 'Wallpaper' },
  { value: 'printable', label: 'Printable' },
  { value: 'guide', label: 'Guide' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'video', label: 'Video' },
];

const COLLECTIONS = [
  { value: '', label: 'None' },
  { value: 'grounding', label: 'Grounding - Earthy tones (#786350)' },
  { value: 'wholeness', label: 'Wholeness - Sage greens (#7A9E7E)' },
  { value: 'growth', label: 'Growth - Blue slate (#5B7B8C)' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function EditLandingPagePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<string>('lead_magnet');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [collection, setCollection] = useState('');
  const [leadMagnetType, setLeadMagnetType] = useState('');
  const [leadMagnetTitle, setLeadMagnetTitle] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const response = await fetch(`/api/landing-pages/by-id/${params.id}`);
        if (!response.ok) throw new Error('Failed to load landing page');

        const page = await response.json();
        setName(page.name);
        setSlug(page.slug);
        setType(page.type || 'lead_magnet');
        setHeadline(page.headline);
        setSubheadline(page.subheadline || '');
        setBodyContent(page.body_content || '');
        setCollection(page.collection || '');
        setLeadMagnetType(page.lead_magnet_type || '');
        setLeadMagnetTitle(page.lead_magnet_title || '');
        setFeaturedImageUrl(page.featured_image_url || '');
        setMetaTitle(page.meta_title || '');
        setMetaDescription(page.meta_description || '');
        setIsPublished(page.status === 'active');

        // Convert form fields
        const fields = (page.form_fields || []).map((f: any, i: number) => ({
          id: String(i + 1),
          name: f.name,
          type: f.type || 'text',
          label: f.label,
          required: f.required || false,
          placeholder: f.placeholder || '',
        }));
        setFormFields(fields.length > 0 ? fields : [
          { id: '1', name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
        ]);
      } catch (error) {
        toast('Failed to load landing page', 'error');
        router.push('/dashboard/leads/landing-pages');
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [params.id, router, toast]);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const togglePublish = async () => {
    try {
      const newStatus = isPublished ? 'draft' : 'active';
      const response = await fetch(`/api/landing-pages/by-id/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setIsPublished(!isPublished);
      toast(isPublished ? 'Page unpublished' : 'Page published!', 'success');
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const addField = () => {
    const newId = String(Date.now());
    setFormFields([
      ...formFields,
      { id: newId, name: '', type: 'text', label: '', required: false, placeholder: '' },
    ]);
  };

  const removeField = (fieldId: string) => {
    if (formFields.length <= 1) {
      toast('Page must have at least one form field', 'error');
      return;
    }
    setFormFields(formFields.filter((f) => f.id !== fieldId));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map((f) => {
      if (f.id !== fieldId) return f;
      const updated = { ...f, ...updates };
      if (updates.label && !f.name) {
        updated.name = updates.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (!name || !slug || !headline) {
      toast('Please fill in name, slug, and headline', 'error');
      return;
    }

    const invalidFields = formFields.filter((f) => !f.label || !f.name);
    if (invalidFields.length > 0) {
      toast('All form fields must have a label and name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/landing-pages/by-id/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          type,
          headline,
          subheadline: subheadline || undefined,
          bodyContent: bodyContent || undefined,
          collection: collection || undefined,
          leadMagnetType: leadMagnetType || undefined,
          leadMagnetTitle: leadMagnetTitle || undefined,
          featuredImageUrl: featuredImageUrl || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          formFields: formFields.map((f) => ({
            name: f.name,
            type: f.type,
            label: f.label,
            required: f.required,
            placeholder: f.placeholder || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update landing page');
      }

      toast('Landing page updated successfully!', 'success');
      router.push('/dashboard/leads/landing-pages');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update landing page', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Edit Landing Page" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Edit Landing Page"
      description="Update your lead capture page"
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard/leads/landing-pages">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Cancel
            </Button>
          </Link>
          {slug && (
            <Link href={`/landing/${slug}`} target="_blank">
              <Button variant="secondary" leftIcon={<Eye className="h-4 w-4" />}>
                Preview
              </Button>
            </Link>
          )}
          <Button
            variant={isPublished ? 'secondary' : 'primary'}
            onClick={togglePublish}
            leftIcon={isPublished ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          >
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader title="Page Details" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Page Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Free Wallpaper Download"
                />
              </div>
              <div>
                <Label htmlFor="type">Page Type</Label>
                <Select
                  value={type}
                  onChange={(v) => setType(v as string)}
                  options={PAGE_TYPES}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  placeholder="free-wallpaper"
                />
                <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                  Page URL: /landing/{slug || 'your-slug'}
                </p>
              </div>
              <div>
                <Label htmlFor="collection">Collection (optional)</Label>
                <Select
                  value={collection}
                  onChange={(v) => setCollection(v as string)}
                  options={COLLECTIONS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader title="Page Content" />
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Get Your Free Grounding Wallpaper"
              />
            </div>
            <div>
              <Label htmlFor="subheadline">Subheadline (optional)</Label>
              <Input
                id="subheadline"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Beautiful desktop backgrounds to inspire your day"
              />
            </div>
            <div>
              <Label htmlFor="body">Body Content (optional)</Label>
              <Textarea
                id="body"
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                placeholder="Add additional details about your offer..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Design */}
        <Card>
          <CardHeader title="Design & Appearance" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leadMagnetType">Lead Magnet Type</Label>
                <Select
                  value={leadMagnetType}
                  onChange={(v) => setLeadMagnetType(v as string)}
                  options={LEAD_MAGNET_TYPES}
                />
              </div>
              <div>
                <Label htmlFor="leadMagnetTitle">CTA Button Text</Label>
                <Input
                  id="leadMagnetTitle"
                  value={leadMagnetTitle}
                  onChange={(e) => setLeadMagnetTitle(e.target.value)}
                  placeholder="Get Instant Access"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="featuredImageUrl">Featured Image URL</Label>
              <Input
                id="featuredImageUrl"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader title="SEO Settings" />
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={headline || 'Page title for search results'}
              />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={subheadline || 'Brief description for search results'}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader title="Form Fields" />
          <CardContent className="space-y-4">
            {formFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium">Field {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeField(field.id)}
                    className="text-[var(--color-text-tertiary)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Email Address"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={field.type}
                      onChange={(v) => updateField(field.id, { type: v as FormField['type'] })}
                      options={FIELD_TYPES}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Field Name</Label>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(field.id, { name: e.target.value })}
                      placeholder="email"
                    />
                  </div>
                  <div>
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${field.id}`}
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
                    Required field
                  </Label>
                </div>
              </div>
            ))}

            <Button variant="secondary" onClick={addField} leftIcon={<Plus className="h-4 w-4" />}>
              Add Field
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
