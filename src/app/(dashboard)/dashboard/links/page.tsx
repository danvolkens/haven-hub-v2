'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Eye, Pencil, Copy, Check, Settings, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { LinkInBioConfig, LinkInBioLink } from '@/types/link-in-bio';
import { useToast } from '@/components/providers/toast-provider';

interface SortableLinkProps {
  link: LinkInBioLink;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (link: LinkInBioLink) => void;
  onDelete: (id: string) => void;
}

function SortableLink({ link, onToggle, onEdit, onDelete }: SortableLinkProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{link.title}</div>
          <div className="text-sm text-muted-foreground truncate">{link.url}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {link.click_count} clicks
          </div>
          <Switch
            checked={link.is_active}
            onChange={() => onToggle(link.id, !link.is_active)}
          />
          <Button variant="ghost" size="sm" onClick={() => onEdit(link)}>
            <Pencil className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(link.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LinksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkInBioLink | null>(null);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    slug: '',
    title: '',
    bio: '',
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data, isLoading } = useQuery<{ config: LinkInBioConfig; links: LinkInBioLink[] }>({
    queryKey: ['link-in-bio'],
    queryFn: async () => {
      const response = await fetch('/api/links');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (link: { title: string; url: string }) => {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
      if (!response.ok) throw new Error('Failed to add link');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-in-bio'] });
      setIsAddOpen(false);
      setNewLink({ title: '', url: '' });
      toast('Link added', 'success');
    },
    onError: () => {
      toast('Failed to add link', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LinkInBioLink> & { id: string }) => {
      const response = await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update link');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-in-bio'] });
      setIsEditOpen(false);
      setEditingLink(null);
      toast('Link updated', 'success');
    },
    onError: () => {
      toast('Failed to update link', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/links/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete link');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-in-bio'] });
      toast('Link deleted', 'success');
    },
    onError: () => {
      toast('Failed to delete link', 'error');
    },
  });

  const configMutation = useMutation({
    mutationFn: async (updates: Partial<LinkInBioConfig>) => {
      const response = await fetch('/api/links/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update settings');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-in-bio'] });
      setIsSettingsOpen(false);
      toast('Settings saved', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update settings', 'error');
    },
  });

  const config = data?.config;
  const links = data?.links || [];

  const publicUrl = config?.slug && origin
    ? `${origin}/links/${config.slug}`
    : null;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const newOrder = arrayMove(links, oldIndex, newIndex);

    // Update positions
    await fetch('/api/links/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkIds: newOrder.map((l) => l.id) }),
    });

    queryClient.invalidateQueries({ queryKey: ['link-in-bio'] });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, is_active: isActive });
  };

  const handleEdit = (link: LinkInBioLink) => {
    setEditingLink(link);
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this link?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopyUrl = async () => {
    if (publicUrl) {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast('URL copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openSettings = () => {
    if (config) {
      setSettingsForm({
        slug: config.slug || '',
        title: config.title || '',
        bio: config.bio || '',
      });
    }
    setIsSettingsOpen(true);
  };

  return (
    <PageContainer
      title="Link in Bio"
      description="Manage your branded link page"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {config?.slug && (
            <a href={`/links/${config.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </a>
          )}
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      }
    >
      {/* Public URL Card */}
      <Card className="p-4 mb-6 bg-sage-50 border-sage-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-100 rounded-lg">
              <LinkIcon className="h-5 w-5 text-sage-700" />
            </div>
            <div>
              <div className="text-sm font-medium text-sage-800">Your Link-in-Bio URL</div>
              {publicUrl ? (
                <div className="text-sm text-sage-600 font-mono">{publicUrl}</div>
              ) : (
                <div className="text-sm text-sage-500">Set up your custom URL in Settings</div>
              )}
            </div>
          </div>
          {publicUrl ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyUrl}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          ) : (
            <Button size="sm" onClick={openSettings}>
              Set Up URL
            </Button>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Views</div>
          <div className="text-2xl font-bold">{config?.total_views || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Clicks</div>
          <div className="text-2xl font-bold">
            {links.reduce((sum: number, l) => sum + l.click_count, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Active Links</div>
          <div className="text-2xl font-bold">
            {links.filter((l) => l.is_active).length}
          </div>
        </Card>
      </div>

      {/* Links List */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : links.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No links yet</p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Link
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={links.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {links.map((link) => (
                <SortableLink
                  key={link.id}
                  link={link}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Link Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Link"
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              placeholder="My Website"
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(newLink)}
              disabled={!newLink.title || !newLink.url || addMutation.isPending}
            >
              Add Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Link Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingLink(null);
        }}
        title="Edit Link"
      >
        {editingLink && (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editingLink.title}
                onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editingLink.url}
                onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setIsEditOpen(false);
                setEditingLink(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate({
                  id: editingLink.id,
                  title: editingLink.title,
                  url: editingLink.url,
                })}
                disabled={!editingLink.title || !editingLink.url || updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Link Page Settings"
      >
        <div className="space-y-4">
          <div>
            <Label>Custom URL Slug</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{origin}/links/</span>
              <Input
                value={settingsForm.slug}
                onChange={(e) => setSettingsForm({ ...settingsForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="your-brand"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Letters, numbers, and hyphens only. This is the URL you&apos;ll share in your bio.
            </p>
          </div>
          <div>
            <Label>Page Title</Label>
            <Input
              value={settingsForm.title}
              onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
              placeholder="My Links"
            />
          </div>
          <div>
            <Label>Bio (optional)</Label>
            <Input
              value={settingsForm.bio}
              onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
              placeholder="A short description..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => configMutation.mutate({
                slug: settingsForm.slug || undefined,
                title: settingsForm.title,
                bio: settingsForm.bio || undefined,
              })}
              disabled={configMutation.isPending}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
