'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Settings,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import Link from 'next/link';
import { mergeTemplate, getDefaultBaseTemplate } from '@/lib/email/template-merge';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  html_content: string;
  content_html: string;
  button_text: string;
  button_url: string;
  flow_type: string;
  position: number;
  delay_hours: number;
  klaviyo_template_id: string | null;
  is_active: boolean;
}

interface BaseTemplate {
  id: string;
  name: string;
  html_content: string;
  placeholders: string[];
  is_active: boolean;
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

const DEFAULT_BUTTON_TEXTS: Record<string, string[]> = {
  welcome: ['Download Your Free Print', 'Explore Our Story', 'Shop Best Sellers', 'Shop Now & Save'],
  quiz_result: ['See Your Collection', 'Explore Your Style', 'Get Inspired', 'Claim Your Discount'],
  cart_abandonment: ['Complete Your Order', 'Return to Cart', 'Get 10% Off'],
  post_purchase: ['Track Your Order', 'Care Guide', 'Leave a Review', 'Shop More'],
  win_back: ['Come Back & Save', 'See What\'s New', 'Last Chance - 20% Off'],
};

function TemplateEditor({
  template,
  position,
  flowType,
  baseTemplateHtml,
  hasBaseTemplate,
  onSave,
  onDelete,
  onSync,
  isSaving,
  isSyncing,
}: {
  template: EmailTemplate | null;
  position: number;
  flowType: string;
  baseTemplateHtml: string;
  hasBaseTemplate: boolean;
  onSave: (data: Partial<EmailTemplate>) => void;
  onDelete: () => void;
  onSync: () => void;
  isSaving: boolean;
  isSyncing: boolean;
}) {
  const labels = EMAIL_LABELS[flowType] || [];
  const delays = DEFAULT_DELAYS[flowType] || [];
  const buttonTexts = DEFAULT_BUTTON_TEXTS[flowType] || [];
  const label = labels[position - 1] || `Email ${position}`;
  const defaultDelay = delays[position - 1] || 0;
  const defaultButtonText = buttonTexts[position - 1] || 'Shop Now';

  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || label,
    subject: template?.subject || '',
    preview_text: template?.preview_text || '',
    content_html: template?.content_html || getDefaultContent(label),
    button_text: template?.button_text || defaultButtonText,
    button_url: template?.button_url || '{{ url }}',
    delay_hours: template?.delay_hours ?? defaultDelay,
  });

  const handleSave = () => {
    // Generate full HTML by merging with base template
    const fullHtml = mergeTemplate({
      baseHtml: baseTemplateHtml,
      content: formData.content_html,
      buttonText: formData.button_text,
      buttonUrl: formData.button_url,
    });

    onSave({
      id: template?.id,
      name: formData.name,
      subject: formData.subject,
      preview_text: formData.preview_text,
      content_html: formData.content_html,
      button_text: formData.button_text,
      button_url: formData.button_url,
      html_content: fullHtml, // Store merged HTML for Klaviyo sync
      flow_type: flowType,
      position,
      delay_hours: formData.delay_hours,
    });
  };

  const getPreviewHtml = () => {
    return mergeTemplate({
      baseHtml: baseTemplateHtml,
      content: formData.content_html,
      buttonText: formData.button_text,
      buttonUrl: formData.button_url,
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
          <Button
            variant={showPreview ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="cursor-pointer"
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject & Preview Text */}
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

        {/* Content Editor */}
        <div>
          <label className="block text-body-sm font-medium mb-1">Email Content</label>
          <RichTextEditor
            key={template?.id || position}
            content={formData.content_html}
            onChange={(html) => setFormData({ ...formData, content_html: html })}
            placeholder="Write your email content here..."
          />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Tip: Use {'{{ first_name }}'} for personalization. Klaviyo variables work here.
          </p>
        </div>

        {/* Button Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-body-sm font-medium mb-1">
              <LinkIcon className="h-3 w-3 inline mr-1" />
              Button Text
            </label>
            <Input
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              placeholder="Shop Now"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium mb-1">Button URL</label>
            <Input
              value={formData.button_url}
              onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
              placeholder="{{ url }}"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Use {'{{ url }}'} for Klaviyo's dynamic URL
            </p>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div>
            <label className="block text-body-sm font-medium mb-2">Email Preview</label>
            <div
              className="border rounded-md bg-white overflow-auto"
              style={{ maxHeight: '500px' }}
            >
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full min-h-[400px] border-0"
                title="Email preview"
              />
            </div>
          </div>
        )}

        {/* Actions */}
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
                disabled={isSyncing || !hasBaseTemplate}
                className="cursor-pointer"
                title={!hasBaseTemplate ? 'Set up a base template first' : undefined}
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

function getDefaultContent(emailName: string): string {
  return `<h1 style="font-family: 'Crimson Text', serif; font-weight: 400; color: #36454F;">{{ first_name|default:'Friend' }},</h1>
<p style="font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; color: #36454F;">This is the <strong>${emailName}</strong> email.</p>
<p style="font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; color: #36454F;">Replace this content with your email copy.</p>`;
}

export default function FlowTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flowType = params.flowType as string;

  const flowName = FLOW_NAMES[flowType] || 'Unknown Flow';
  const emailCount = (DEFAULT_DELAYS[flowType] || []).length;

  // Fetch base template
  const { data: baseTemplateData } = useQuery<{ templates: BaseTemplate[]; active: BaseTemplate | null }>({
    queryKey: ['email-workflows', 'base-templates'],
    queryFn: () => api.get('/email-workflows/base-templates?active_only=true'),
  });

  const baseTemplate = baseTemplateData?.active;
  const baseTemplateHtml = baseTemplate?.html_content || getDefaultBaseTemplate();
  const hasBaseTemplate = !!baseTemplate;

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
          <Link href="/dashboard/email/workflows/base-template">
            <Button variant="secondary" className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Base Template
            </Button>
          </Link>
          <span className="text-body-sm text-[var(--color-text-secondary)]">
            {templates.length}/{emailCount} templates, {syncedCount} synced
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
            Sync All
          </Button>
        </div>
      </div>

      {/* Base template warning */}
      {!hasBaseTemplate && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">No base template configured</p>
                <p className="text-amber-700 text-sm">
                  Set up your Klaviyo template for consistent branding across all emails.
                </p>
              </div>
              <Link href="/dashboard/email/workflows/base-template">
                <Button size="sm" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Set Up Template
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All synced status */}
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
                baseTemplateHtml={baseTemplateHtml}
                hasBaseTemplate={hasBaseTemplate}
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
