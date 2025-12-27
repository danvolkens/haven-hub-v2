'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Eye,
  Code,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
  Textarea,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import Link from 'next/link';

interface BaseTemplate {
  id: string;
  name: string;
  description: string | null;
  html_content: string;
  placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'edit' | 'preview';

const PLACEHOLDER_DOCS = [
  { name: '{{CONTENT}}', description: 'Required. Where your email body text will appear.', required: true },
  { name: '{{BUTTON_TEXT}}', description: 'The call-to-action button text (e.g., "Shop Now").', required: false },
  { name: '{{BUTTON_URL}}', description: 'The button link URL. Use {{ url }} for Klaviyo dynamic URLs.', required: false },
];

export default function BaseTemplatePage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch existing base template
  const { data, isLoading } = useQuery<{ templates: BaseTemplate[]; active: BaseTemplate | null }>({
    queryKey: ['email-workflows', 'base-templates'],
    queryFn: () => api.get('/email-workflows/base-templates'),
  });

  const activeTemplate = data?.active;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    html_content: '',
  });

  // Update form when data loads
  useState(() => {
    if (activeTemplate) {
      setFormData({
        name: activeTemplate.name,
        description: activeTemplate.description || '',
        html_content: activeTemplate.html_content,
      });
    }
  });

  // Actually update form when activeTemplate changes
  if (activeTemplate && formData.html_content === '' && activeTemplate.html_content) {
    setFormData({
      name: activeTemplate.name,
      description: activeTemplate.description || '',
      html_content: activeTemplate.html_content,
    });
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; name: string; description: string; html_content: string }) => {
      if (data.id) {
        return api.patch('/email-workflows/base-templates', data);
      }
      return api.post('/email-workflows/base-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'base-templates'] });
    },
  });

  // Validate template
  const hasContentPlaceholder = formData.html_content.includes('{{CONTENT}}');
  const hasButtonText = formData.html_content.includes('{{BUTTON_TEXT}}');
  const hasButtonUrl = formData.html_content.includes('{{BUTTON_URL}}');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: activeTemplate?.id,
      name: formData.name || 'Default Template',
      description: formData.description,
      html_content: formData.html_content,
    });
  };

  // Generate preview with sample content
  const getPreviewHtml = () => {
    let preview = formData.html_content;
    preview = preview.replace('{{CONTENT}}', `
      <h1 style="font-family: 'Crimson Text', serif; font-weight: 400; color: #36454F;">{{ first_name|default:'Friend' }},</h1>
      <p style="font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; color: #36454F;">
        This is a preview of how your email content will appear in the template.
      </p>
      <p style="font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; color: #36454F;">
        The actual content will be editable per email in your flow.
      </p>
    `);
    preview = preview.replace(/\{\{BUTTON_TEXT\}\}/g, 'Shop Now');
    preview = preview.replace(/\{\{BUTTON_URL\}\}/g, '#preview');
    return preview;
  };

  return (
    <PageContainer
      title="Base Email Template"
      description="Set up your Klaviyo template wrapper with consistent branding"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/email/workflows">
          <Button variant="secondary" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 mr-2">
            <Button
              variant={viewMode === 'edit' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edit')}
              className="cursor-pointer h-7 px-3"
            >
              <Code className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="cursor-pointer h-7 px-3"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasContentPlaceholder}
            className="cursor-pointer"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Success/Error messages */}
      {saveMutation.isSuccess && (
        <Card className="mb-4 bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700">Template saved successfully!</span>
          </CardContent>
        </Card>
      )}

      {saveMutation.isError && (
        <Card className="mb-4 bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">
              {(saveMutation.error as any)?.message || 'Failed to save template'}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-medium">
                  {viewMode === 'edit' ? 'Template HTML' : 'Template Preview'}
                </h2>
                {activeTemplate && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'edit' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium mb-1">Template Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Default Template"
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium mb-1">Description</label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Haven & Hold brand template"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-body-sm font-medium">HTML Content</label>
                      <div className="flex items-center gap-2">
                        {hasContentPlaceholder ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {'{{CONTENT}}'} found
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Missing {'{{CONTENT}}'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={formData.html_content}
                      onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                      rows={25}
                      className="font-mono text-sm"
                      placeholder="Paste your Klaviyo template HTML here..."
                    />
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      Paste your full Klaviyo template HTML. Replace the main text content area with {'{{CONTENT}}'}.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="border rounded-md bg-white overflow-auto"
                  style={{ maxHeight: '600px' }}
                >
                  {formData.html_content ? (
                    <iframe
                      srcDoc={getPreviewHtml()}
                      className="w-full min-h-[500px] border-0"
                      title="Template preview"
                    />
                  ) : (
                    <div className="p-8 text-center text-[var(--color-text-secondary)]">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No template HTML yet. Switch to Edit mode to add your template.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - placeholder docs */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Placeholders
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLACEHOLDER_DOCS.map((placeholder) => (
                <div
                  key={placeholder.name}
                  className="p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm font-medium text-sage">{placeholder.name}</code>
                    <div className="flex items-center gap-2">
                      {placeholder.required && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                      )}
                      <button
                        onClick={() => handleCopy(placeholder.name)}
                        className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                        title="Copy"
                      >
                        {copied === placeholder.name ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {placeholder.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-medium">Detected Placeholders</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {hasContentPlaceholder ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={hasContentPlaceholder ? 'text-green-700' : 'text-red-700'}>
                    {'{{CONTENT}}'} {hasContentPlaceholder ? '✓' : '(missing)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasButtonText ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Info className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={hasButtonText ? 'text-green-700' : 'text-gray-500'}>
                    {'{{BUTTON_TEXT}}'} {hasButtonText ? '✓' : '(optional)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasButtonUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Info className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={hasButtonUrl ? 'text-green-700' : 'text-gray-500'}>
                    {'{{BUTTON_URL}}'} {hasButtonUrl ? '✓' : '(optional)'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">How to use</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Export your template HTML from Klaviyo</li>
                <li>Find the main text content area</li>
                <li>Replace that content with <code className="bg-blue-100 px-1 rounded">{'{{CONTENT}}'}</code></li>
                <li>Optionally replace button text/URL with placeholders</li>
                <li>Save and use in your email flows</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
