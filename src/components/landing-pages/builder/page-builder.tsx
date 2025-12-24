'use client';

import { useState, useCallback } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { BlockPalette } from './block-palette';
import { BuilderCanvas } from './builder-canvas';
import { BlockEditor } from './block-editor';
import { BLOCK_CONFIGS, ContentBlock, BlockType } from './block-types';
import { Eye, Save, Settings, Smartphone, Monitor } from 'lucide-react';
import { nanoid } from 'nanoid';

interface PageBuilderProps {
  initialBlocks?: ContentBlock[];
  onSave: (blocks: ContentBlock[]) => Promise<void>;
  pageSettings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

export function PageBuilder({
  initialBlocks = [],
  onSave,
  pageSettings,
  onSettingsChange,
}: PageBuilderProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((block, idx) => ({
          ...block,
          order: idx,
        }));
      });
    }
  };

  const addBlock = useCallback((type: BlockType) => {
    const config = BLOCK_CONFIGS.find(c => c.type === type);
    if (!config) return;

    const newBlock: ContentBlock = {
      id: nanoid(),
      type,
      content: { ...config.defaultContent },
      order: blocks.length,
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks.length]);

  const updateBlock = useCallback((id: string, content: Record<string, any>) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === id ? { ...block, content } : block
      )
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    const newBlock: ContentBlock = {
      ...block,
      id: nanoid(),
      order: blocks.length,
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(blocks);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'desktop' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Palette */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto p-4">
          <BlockPalette onAddBlock={addBlock} />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          <div
            className={`mx-auto bg-white shadow-lg transition-all ${
              previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-4xl'
            }`}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <BuilderCanvas
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onDeleteBlock={deleteBlock}
                  onDuplicateBlock={duplicateBlock}
                />
              </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">
                <p>Drag blocks from the left panel to start building</p>
              </div>
            )}
          </div>
        </div>

        {/* Block Editor Panel */}
        <div className="w-80 border-l bg-white overflow-y-auto">
          {selectedBlock ? (
            <BlockEditor
              block={selectedBlock}
              onUpdate={(content) => updateBlock(selectedBlock.id, content)}
              onDelete={() => deleteBlock(selectedBlock.id)}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a block to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
