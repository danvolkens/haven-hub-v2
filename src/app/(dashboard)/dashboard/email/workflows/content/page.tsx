'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Search,
  Filter,
  Copy,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import Link from 'next/link';

interface ContentEntry {
  id: string;
  email_template_id: string;
  version: number;
  subject: string;
  preview_text: string;
  body_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  email_templates: {
    id: string;
    name: string;
    flow_type: string;
    position: number;
  };
}

const FLOW_NAMES: Record<string, string> = {
  welcome: 'Welcome Flow',
  quiz_result: 'Quiz Result Flow',
  cart_abandonment: 'Cart Abandonment Flow',
  post_purchase: 'Post-Purchase Flow',
  win_back: 'Win-Back Flow',
};

const FLOW_COLORS: Record<string, string> = {
  welcome: 'bg-blue-100 text-blue-700',
  quiz_result: 'bg-purple-100 text-purple-700',
  cart_abandonment: 'bg-orange-100 text-orange-700',
  post_purchase: 'bg-green-100 text-green-700',
  win_back: 'bg-pink-100 text-pink-700',
};

function ContentCard({
  content,
  onActivate,
  onCopy,
}: {
  content: ContentEntry;
  onActivate: () => void;
  onCopy: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const flowName = FLOW_NAMES[content.email_templates?.flow_type] || 'Unknown';
  const colorClass = FLOW_COLORS[content.email_templates?.flow_type] || 'bg-gray-100 text-gray-700';

  return (
    <Card className={content.is_active ? 'border-green-300' : ''}>
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-[var(--color-text-secondary)] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{content.subject}</h3>
                {content.is_active && (
                  <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                <Badge className={colorClass}>{flowName}</Badge>
                <span>Email {content.email_templates?.position}</span>
                <span>v{content.version}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="cursor-pointer"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-[var(--color-text-secondary)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--color-text-secondary)]" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {content.preview_text && (
            <div>
              <p className="text-body-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Preview Text
              </p>
              <p className="text-body-sm">{content.preview_text}</p>
            </div>
          )}

          <div>
            <p className="text-body-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Body Content
            </p>
            <div className="bg-gray-50 rounded-md p-3 max-h-60 overflow-y-auto">
              <pre className="text-body-sm whitespace-pre-wrap font-sans">
                {content.body_content}
              </pre>
            </div>
          </div>

          {content.variables && content.variables.length > 0 && (
            <div>
              <p className="text-body-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Variables Used
              </p>
              <div className="flex flex-wrap gap-2">
                {content.variables.map((variable) => (
                  <Badge key={variable} className="bg-gray-100 text-gray-700">
                    {'{{ ' + variable + ' }}'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              <Clock className="h-4 w-4 inline mr-1" />
              Created {new Date(content.created_at).toLocaleDateString()}
            </div>
            {!content.is_active && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onActivate();
                }}
                className="cursor-pointer"
              >
                Make Active Version
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ContentLibraryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFlow, setFilterFlow] = useState<string>('');

  // Fetch content library
  const { data: contentData, isLoading } = useQuery<{ content: ContentEntry[] }>({
    queryKey: ['email-workflows', 'content', filterFlow],
    queryFn: () => api.get(`/email-workflows/content?active_only=false`),
  });

  // Activate version mutation
  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch('/email-workflows/content', { id, activate: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflows', 'content'] });
    },
  });

  const content: ContentEntry[] = contentData?.content || [];

  // Filter content
  const filteredContent = content.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.body_content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFlow =
      !filterFlow || item.email_templates?.flow_type === filterFlow;

    return matchesSearch && matchesFlow;
  });

  // Group by flow type
  const groupedContent: Record<string, ContentEntry[]> = {};
  filteredContent.forEach((item) => {
    const flowType = item.email_templates?.flow_type || 'unknown';
    if (!groupedContent[flowType]) {
      groupedContent[flowType] = [];
    }
    groupedContent[flowType].push(item);
  });

  const handleCopy = (item: ContentEntry) => {
    const text = `Subject: ${item.subject}\n\nPreview: ${item.preview_text}\n\n${item.body_content}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <PageContainer
      title="Content Library"
      description="Version-controlled email copy for all your flows"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/email/workflows">
          <Button variant="secondary" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by subject or content..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <select
                value={filterFlow}
                onChange={(e) => setFilterFlow(e.target.value)}
                className="border rounded-md px-3 py-2 text-body-sm cursor-pointer"
              >
                <option value="">All Flows</option>
                <option value="welcome">Welcome Flow</option>
                <option value="quiz_result">Quiz Result Flow</option>
                <option value="cart_abandonment">Cart Abandonment Flow</option>
                <option value="post_purchase">Post-Purchase Flow</option>
                <option value="win_back">Win-Back Flow</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContent.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-[var(--color-text-secondary)]" />
            <h3 className="font-medium mb-2">No content found</h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
              {searchQuery || filterFlow
                ? 'Try adjusting your search or filters'
                : 'Create email templates to start building your content library'}
            </p>
            <Link href="/dashboard/email/workflows">
              <Button className="cursor-pointer">Configure Templates</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedContent).map(([flowType, items]) => (
            <div key={flowType}>
              <h2 className="text-heading-3 mb-3">
                {FLOW_NAMES[flowType] || flowType}
              </h2>
              <div className="space-y-3">
                {items
                  .sort((a, b) => {
                    // Sort by position, then by version (newest first)
                    if (a.email_templates?.position !== b.email_templates?.position) {
                      return (a.email_templates?.position || 0) - (b.email_templates?.position || 0);
                    }
                    return b.version - a.version;
                  })
                  .map((item) => (
                    <ContentCard
                      key={item.id}
                      content={item}
                      onActivate={() => activateMutation.mutate(item.id)}
                      onCopy={() => handleCopy(item)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
