'use client';

import { useState } from 'react';
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
import { Plus, GripVertical, Trash2, Eye } from 'lucide-react';
import { LinkInBioConfig, LinkInBioLink } from '@/types/link-in-bio';

interface SortableLinkProps {
  link: LinkInBioLink;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableLink({ link, onToggle, onDelete }: SortableLinkProps) {
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
            onChange={() => onToggle(link.id)}
          />
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });

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
    },
  });

  const config = data?.config;
  const links = data?.links || [];

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

  const handleToggle = (id: string) => {
    // Toggle implementation would go here
    console.log('Toggle link:', id);
  };

  const handleDelete = (id: string) => {
    // Delete implementation would go here
    console.log('Delete link:', id);
  };

  return (
    <PageContainer
      title="Link in Bio"
      description="Manage your branded link page"
      actions={
        <div className="flex gap-2">
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
    </PageContainer>
  );
}
