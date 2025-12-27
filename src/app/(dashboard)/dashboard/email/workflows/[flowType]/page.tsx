'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Code,
  Type,
  AlertTriangle,
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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import Link from 'next/link';

type EditorMode = 'visual' | 'preview' | 'code';

// Helper to extract body content from email HTML
function extractBodyContent(html: string): string {
  // Find the content div start
  const contentStart = html.indexOf('<div class="content">');
  if (contentStart === -1) {
    // Fallback: extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1].trim();
    }
    return html;
  }

  // Find where content ends (before footer div)
  const footerStart = html.indexOf('<div class="footer">');
  if (footerStart === -1) {
    // No footer, find closing body
    const bodyEnd = html.indexOf('</body>');
    if (bodyEnd === -1) return html;

    // Extract from after content opening tag to before body close
    const contentTagEnd = contentStart + '<div class="content">'.length;
    return html.slice(contentTagEnd, bodyEnd).replace(/<\/div>\s*<\/div>\s*$/i, '').trim();
  }

  // Extract from after content opening tag to before footer
  const contentTagEnd = contentStart + '<div class="content">'.length;
  // Find the </div> that closes the content div (just before footer)
  const contentEndMatch = html.slice(0, footerStart).lastIndexOf('</div>');
  if (contentEndMatch === -1) return html;

  return html.slice(contentTagEnd, contentEndMatch).trim();
}

// Helper to inject body content back into email HTML
function injectBodyContent(fullHtml: string, newContent: string): string {
  // Try method 1: Find the content div (newer templates)
  const contentStart = fullHtml.indexOf('<div class="content">');
  if (contentStart !== -1) {
    const contentTagEnd = contentStart + '<div class="content">'.length;

    // Find where footer starts
    const footerStart = fullHtml.indexOf('<div class="footer">');
    if (footerStart !== -1) {
      // Find the </div> that closes content (just before footer)
      const beforeFooter = fullHtml.slice(0, footerStart);
      const contentEndIndex = beforeFooter.lastIndexOf('</div>');
      if (contentEndIndex !== -1) {
        // Rebuild: before content + new content + closing div and everything after
        const beforeContent = fullHtml.slice(0, contentTagEnd);
        const afterContent = fullHtml.slice(contentEndIndex);
        return beforeContent + '\n      ' + newContent + '\n    ' + afterContent;
      }
    }
  }

  // Method 2: For templates without content div, try to replace body inner content
  // This preserves the <head> and basic structure while allowing content editing
  const bodyOpenMatch = fullHtml.match(/<body[^>]*>/i);
  const bodyCloseIndex = fullHtml.lastIndexOf('</body>');

  if (bodyOpenMatch && bodyCloseIndex !== -1) {
    const bodyOpenEnd = (bodyOpenMatch.index ?? 0) + bodyOpenMatch[0].length;
    const beforeBody = fullHtml.slice(0, bodyOpenEnd);
    const afterBody = fullHtml.slice(bodyCloseIndex);

    // Wrap in container structure for email compatibility
    return beforeBody + `
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div class="content" style="background: #fff; padding: 30px; border-radius: 8px;">
      ${newContent}
    </div>
  </div>
` + afterBody;
  }

  // Method 3: Return as-is if we can't find injection points
  console.warn('[injectBodyContent] Could not find injection point');
  return fullHtml;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  html_content: string;
  flow_type: string;
  position: number;
  delay_hours: number;
  klaviyo_template_id: string | null;
  is_active: boolean;
}

interface FlowBlueprint {
  id: string;
  flow_type: string;
  name: string;
  description: string;
  default_delays: number[];
}

const FLOW_NAMES: Record<string, string> = {
  welcome: 'Welcome Flow',
  quiz_result: 'Quiz Result Flow',
  cart_abandonment: 'Cart Abandonment Flow',
  post_purchase: 'Post-Purchase Flow',
  win_back: 'Win-Back Flow',
};

const EMAIL_LABELS: Record<string, string[]> = {
  welcome: [
    'Welcome + Lead Magnet Delivery',
    'Brand Story',
    'Best Sellers by Collection',
    'Social Proof + First Purchase Offer',
  ],
  quiz_result: [
    'Your Quiz Results + Collection Recommendations',
    'Deep Dive into Your Collection',
    'Styled Room Inspiration',
    'Limited Time Offer for Your Collection',
  ],
  cart_abandonment: [
    'You left something behind',
    'Still thinking about it?',
    'Last chance + small discount',
  ],
  post_purchase: [
    'Order Confirmation + What to Expect',
    'Care Instructions',
    'Request Review',
    'Complementary Products',
  ],
  win_back: [
    'We miss you + Special offer',
    "What's new since you left",
    'Final reminder',
  ],
};

const DEFAULT_DELAYS: Record<string, number[]> = {
  welcome: [0, 48, 96, 168],
  quiz_result: [0, 24, 72, 120],
  cart_abandonment: [1, 24, 72],
  post_purchase: [0, 72, 168, 336],
  win_back: [0, 72, 168],
};

function TemplateEditor({
  template,
  position,
  flowType,
  onSave,
  onDelete,
  onSync,
  isSaving,
  isSyncing,
}: {
  template: EmailTemplate | null;
  position: number;
  flowType: string;
  onSave: (data: Partial<EmailTemplate>) => void;
  onDelete: () => void;
  onSync: () => void;
  isSaving: boolean;
  isSyncing: boolean;
}) {
  const labels = EMAIL_LABELS[flowType] || [];
  const delays = DEFAULT_DELAYS[flowType] || [];
  const label = labels[position - 1] || `Email ${position}`;
  const defaultDelay = delays[position - 1] || 0;

  const [formData, setFormData] = useState({
    name: template?.name || label,
    subject: template?.subject || '',
    preview_text: template?.preview_text || '',
    html_content: template?.html_content || getDefaultTemplate(label),
    delay_hours: template?.delay_hours ?? defaultDelay,
  });

  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [bodyContent, setBodyContent] = useState(() =>
    extractBodyContent(template?.html_content || getDefaultTemplate(label))
  );

  // Sync body content back to full HTML when it changes
  const handleBodyContentChange = (newContent: string) => {
    setBodyContent(newContent);
    setFormData(prev => ({
      ...prev,
      html_content: injectBodyContent(prev.html_content, newContent),
    }));
  };

  const handleSave = () => {
    onSave({
      id: template?.id,
      ...formData,
      flow_type: flowType,
      position,
    });
  };

  const delayLabel = formData.delay_hours === 0
    ? 'Immediate'
    : formData.delay_hours < 24
      ? `${formData.delay_hours} hours`
      : `Day ${Math.round(formData.delay_hours / 24)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center text-body-sm font-medium">
              {position}
            </div>
            <div>
              <h3 className="font-medium">{label}</h3>
              <div className="flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                <Clock className="h-3 w-3" />
                {delayLabel}
                {template?.klaviyo_template_id ? (
                  <Badge className="bg-green-100 text-green-700 ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Synced
                  </Badge>
                ) : template?.id ? (
                  <Badge className="bg-yellow-100 text-yellow-700 ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Synced
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <Button
              variant={editorMode === 'visual' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('visual')}
              className="cursor-pointer h-7 px-2"
              title="Visual Editor"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={editorMode === 'preview' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('preview')}
              className="cursor-pointer h-7 px-2"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant={editorMode === 'code' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                // When switching to code, sync body content
                setBodyContent(extractBodyContent(formData.html_content));
                setEditorMode('code');
              }}
              className="cursor-pointer h-7 px-2"
              title="HTML Code"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-medium mb-1">Subject Line</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Enter subject line..."
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium mb-1">Preview Text</label>
            <Input
              value={formData.preview_text}
              onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
              placeholder="Enter preview text..."
            />
          </div>
        </div>

        {editorMode === 'visual' && (
          <div>
            <label className="block text-body-sm font-medium mb-1">Email Content</label>
            <RichTextEditor
              content={bodyContent}
              onChange={handleBodyContentChange}
              placeholder="Write your email content here..."
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Use {'{{ first_name }}'} for personalization. Switch to Code view for advanced HTML editing.
            </p>
          </div>
        )}

        {editorMode === 'preview' && (
          <div>
            <label className="block text-body-sm font-medium mb-1">Email Preview</label>
            <div
              className="border rounded-md bg-white overflow-auto"
              style={{ maxHeight: '500px' }}
            >
              <iframe
                srcDoc={formData.html_content}
                className="w-full min-h-[400px] border-0"
                title="Email preview"
              />
            </div>
          </div>
        )}

        {editorMode === 'code' && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-body-sm font-medium">HTML Content</label>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Only edit content section - preserve table structure for email compatibility</span>
              </div>
            </div>
            <Textarea
              value={formData.html_content}
              onChange={(e) => {
                setFormData({ ...formData, html_content: e.target.value });
                // Also update body content for when user switches back to visual
                setBodyContent(extractBodyContent(e.target.value));
              }}
              rows={20}
              className="font-mono text-sm"
              placeholder="<html>...</html>"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {template?.id ? 'Update' : 'Create'} Template
            </Button>
            {template?.id && (
              <Button
                variant="secondary"
                onClick={onSync}
                disabled={isSyncing}
                className="cursor-pointer"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync to Klaviyo
              </Button>
            )}
          </div>
          {template?.id && (
            <Button
              variant="secondary"
              onClick={onDelete}
              className="cursor-pointer text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultTemplate(emailName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { background: #fff; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Haven & Hold</h1>
    </div>
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>This is a template for: ${emailName}</p>

      <p>Replace this content with your email copy.</p>

      <a href="{{ url }}" class="button">Call to Action</a>

      <p>Held gently,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

export default function FlowTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flowType = params.flowType as string;

  const flowName = FLOW_NAMES[flowType] || 'Unknown Flow';
  const emailCount = (DEFAULT_DELAYS[flowType] || []).length;

  // Fetch templates for this flow
  const { data: templatesData, isLoading } = useQuery<{ templates: EmailTemplate[] }>({
    queryKey: ['email-workflows', 'templates', flowType],
    queryFn: () => api.get(`/email-workflows/templates?flow_type=${flowType}`),
  });

  const templates: EmailTemplate[] = templatesData?.templates || [];

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: (data: Partial<EmailTemplate>) => {
      if (data.id) {
        return api.patch('/email-workflows/templates', data);
      }
      return api.post('/email-workflows/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'templates'] });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email-workflows/templates?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'templates'] });
    },
  });

  // Sync template mutation
  const syncMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.post('/email-workflows/templates/sync', { template_id: templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'templates'] });
    },
  });

  // Sync all templates
  const syncAllMutation = useMutation({
    mutationFn: () =>
      api.post('/email-workflows/templates/sync', { sync_all: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'templates'] });
    },
  });

  const getTemplateForPosition = (position: number) => {
    return templates.find((t) => t.position === position) || null;
  };

  const syncedCount = templates.filter((t) => t.klaviyo_template_id).length;
  const allSynced = syncedCount === emailCount && templates.length === emailCount;

  return (
    <PageContainer
      title={flowName}
      description={`Configure email templates for your ${flowName.toLowerCase()}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/email/workflows">
          <Button variant="secondary" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-[var(--color-text-secondary)]">
            {templates.length}/{emailCount} templates created, {syncedCount} synced
          </span>
          <Button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending || templates.length === 0}
            className="cursor-pointer"
          >
            {syncAllMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All to Klaviyo
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {allSynced && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-700">
                All templates are configured and synced to Klaviyo. You can now deploy this flow!
              </p>
              <Link href="/dashboard/email/workflows" className="ml-auto">
                <Button size="sm" className="cursor-pointer">
                  Deploy Flow
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template editors */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: emailCount }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-32 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from({ length: emailCount }).map((_, i) => {
            const position = i + 1;
            const template = getTemplateForPosition(position);

            return (
              <TemplateEditor
                key={position}
                template={template}
                position={position}
                flowType={flowType}
                onSave={(data) => saveMutation.mutate(data)}
                onDelete={() => template?.id && deleteMutation.mutate(template.id)}
                onSync={() => template?.id && syncMutation.mutate(template.id)}
                isSaving={saveMutation.isPending}
                isSyncing={syncMutation.isPending}
              />
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
