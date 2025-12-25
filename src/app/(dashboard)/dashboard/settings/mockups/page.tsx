'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Copy,
  CheckCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

interface MockupTemplate {
  id: string;
  scene_key: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  dm_template_id: string | null;
  dm_template_url: string | null;
  is_active: boolean;
  is_system: boolean;
  config: {
    collection_name?: string;
    smart_objects?: any[];
  };
  created_at: string;
}

export default function MockupTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'synced' | 'system'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplate | null>(null);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['mockup-templates-all'],
    queryFn: () => api.get<{ templates: MockupTemplate[] }>('/mockups/templates/sync'),
  });
  const templates = templatesData?.templates || [];

  const syncMutation = useMutation({
    mutationFn: () => api.post('/mockups/templates/sync', {}),
    onSuccess: (data: any) => {
      toast(data.message || `Synced ${data.synced} templates`, 'success');
      queryClient.invalidateQueries({ queryKey: ['mockup-templates-all'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to sync templates', 'error');
    },
  });

  const filteredTemplates = templates.filter((t) => {
    if (filter === 'synced') return !t.is_system;
    if (filter === 'system') return t.is_system;
    return true;
  });

  const syncedCount = templates.filter((t) => !t.is_system).length;
  const systemCount = templates.filter((t) => t.is_system).length;

  // Group templates by collection
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const collection = template.config?.collection_name || (template.is_system ? 'System Templates' : 'Uncategorized');
    if (!acc[collection]) acc[collection] = [];
    acc[collection].push(template);
    return acc;
  }, {} as Record<string, MockupTemplate[]>);

  return (
    <PageContainer
      title="Mockup Templates"
      description="Manage your Dynamic Mockups templates"
      actions={
        <Button
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Sync from Dynamic Mockups
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 rounded-md text-body-sm font-medium transition-colors cursor-pointer',
              filter === 'all'
                ? 'bg-sage text-white'
                : 'bg-elevated hover:bg-elevated/80'
            )}
          >
            All ({templates.length})
          </button>
          <button
            onClick={() => setFilter('synced')}
            className={cn(
              'px-4 py-2 rounded-md text-body-sm font-medium transition-colors cursor-pointer',
              filter === 'synced'
                ? 'bg-sage text-white'
                : 'bg-elevated hover:bg-elevated/80'
            )}
          >
            Synced ({syncedCount})
          </button>
          <button
            onClick={() => setFilter('system')}
            className={cn(
              'px-4 py-2 rounded-md text-body-sm font-medium transition-colors cursor-pointer',
              filter === 'system'
                ? 'bg-sage text-white'
                : 'bg-elevated hover:bg-elevated/80'
            )}
          >
            System ({systemCount})
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
              <p className="text-body font-medium mb-2">No templates synced yet</p>
              <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
                Connect your Dynamic Mockups account and sync templates to use them for generating product mockups.
              </p>
              <Button
                onClick={() => syncMutation.mutate()}
                isLoading={syncMutation.isPending}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Sync Templates
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedTemplates).map(([collection, collectionTemplates]) => (
            <Card key={collection}>
              <CardHeader
                title={collection}
                description={`${collectionTemplates.length} template${collectionTemplates.length !== 1 ? 's' : ''}`}
              />
              <CardContent className="p-6 pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {collectionTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => setSelectedTemplate(template)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Help text */}
        <Card className="bg-elevated">
          <CardContent className="p-4">
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              <strong>Tip:</strong> Templates are synced from your{' '}
              <a
                href="https://app.dynamicmockups.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage hover:underline inline-flex items-center gap-1"
              >
                Dynamic Mockups account
                <ExternalLink className="h-3 w-3" />
              </a>
              . Add mockups to your collections there, then sync here to use them.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </PageContainer>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: MockupTemplate;
  onClick: () => void;
}) {
  const isPinterestOnly = template.config?.collection_name?.toLowerCase().includes('pinterest');

  return (
    <button
      onClick={onClick}
      className="rounded-lg border overflow-hidden bg-white text-left cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-elevated relative">
        {template.preview_url ? (
          <img
            src={template.preview_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
            <Sparkles className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">
          {isPinterestOnly && (
            <Badge variant="primary" className="text-xs">Pinterest</Badge>
          )}
          {template.is_system && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
          {template.is_active ? (
            <Badge variant="success" className="text-xs">Active</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="text-body-sm font-medium truncate">{template.name}</p>
        {template.description && (
          <p className="text-caption text-[var(--color-text-tertiary)] truncate mt-0.5">
            {template.description}
          </p>
        )}
        {template.dm_template_id && (
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1 font-mono">
            ID: {template.dm_template_id.slice(0, 8)}...
          </p>
        )}
      </div>
    </button>
  );
}

function TemplateDetailModal({
  template,
  onClose,
}: {
  template: MockupTemplate;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const isPinterestOnly = template.config?.collection_name?.toLowerCase().includes('pinterest');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={template.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Preview Image */}
        <div className="aspect-[4/3] bg-elevated rounded-lg overflow-hidden">
          {template.preview_url ? (
            <img
              src={template.preview_url}
              alt={template.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
              <Sparkles className="h-16 w-16" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {isPinterestOnly && <Badge variant="primary">Pinterest Only</Badge>}
          {template.is_system && <Badge variant="secondary">System Template</Badge>}
          {template.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {template.config?.collection_name && (
            <Badge variant="outline">{template.config.collection_name}</Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {template.description && (
            <div>
              <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                Description
              </p>
              <p className="text-body">{template.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                Scene Key
              </p>
              <div className="flex items-center gap-2">
                <code className="text-body-sm font-mono bg-elevated px-2 py-1 rounded">
                  {template.scene_key}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copyToClipboard(template.scene_key, 'scene_key')}
                >
                  {copied === 'scene_key' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {template.dm_template_id && (
              <div>
                <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                  Dynamic Mockups ID
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-body-sm font-mono bg-elevated px-2 py-1 rounded truncate max-w-[200px]">
                    {template.dm_template_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyToClipboard(template.dm_template_id!, 'dm_id')}
                  >
                    {copied === 'dm_id' ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Smart Objects */}
          {template.config?.smart_objects && template.config.smart_objects.length > 0 && (
            <div>
              <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                Smart Objects ({template.config.smart_objects.length})
              </p>
              <div className="space-y-2">
                {template.config.smart_objects.map((so: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-elevated rounded-md px-3 py-2"
                  >
                    <span className="text-body-sm font-medium">{so.name || `Smart Object ${index + 1}`}</span>
                    {so.uuid && (
                      <code className="text-caption font-mono text-[var(--color-text-tertiary)]">
                        {so.uuid.slice(0, 8)}...
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t">
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Added: {new Date(template.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
