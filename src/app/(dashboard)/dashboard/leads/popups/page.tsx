'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePopups, useCreatePopup, useUpdatePopup, useDeletePopup } from '@/hooks/use-popups';
import { Popup, PopupStatus } from '@/types/popups';
import { Plus, Edit2, Trash2, Play, Pause, BarChart } from 'lucide-react';

const STATUS_BADGES: Record<PopupStatus, { variant: 'default' | 'success' | 'warning' | 'secondary'; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  archived: { variant: 'secondary', label: 'Archived' },
};

const TRIGGER_LABELS: Record<string, string> = {
  exit_intent: 'Exit Intent',
  scroll_depth: 'Scroll Depth',
  time_on_page: 'Time on Page',
  page_views: 'Page Views',
  click: 'Click Trigger',
  manual: 'Manual',
};

export default function PopupsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PopupStatus | 'all'>('all');

  const { data: popups = [], isLoading } = usePopups(
    activeTab === 'all' ? undefined : activeTab
  );
  const createPopup = useCreatePopup();
  const updatePopup = useUpdatePopup();
  const deletePopup = useDeletePopup();

  const handleCreate = async () => {
    const result = await createPopup.mutateAsync({
      name: 'New Popup',
    });
    router.push(`/dashboard/leads/popups/${result.popup.id}/edit`);
  };

  const handleToggleStatus = async (popup: Popup) => {
    const newStatus = popup.status === 'active' ? 'paused' : 'active';
    await updatePopup.mutateAsync({ id: popup.id, data: { status: newStatus } });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this popup?')) {
      await deletePopup.mutateAsync(id);
    }
  };

  const filteredPopups = activeTab === 'all'
    ? popups
    : popups.filter(p => p.status === activeTab);

  return (
    <PageContainer
      title="Popups"
      description="Create and manage behavior-triggered popups"
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Popup
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PopupStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredPopups.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No popups found</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Popup
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPopups.map((popup) => (
                <Card key={popup.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{popup.name}</h3>
                        <Badge variant={STATUS_BADGES[popup.status].variant}>
                          {STATUS_BADGES[popup.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {TRIGGER_LABELS[popup.trigger_type]} • {popup.content.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {popup.status !== 'archived' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(popup)}
                          >
                            {popup.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/popups/${popup.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/leads/popups/${popup.id}`)}
                      >
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(popup.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
