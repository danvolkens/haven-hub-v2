'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentBlock } from './block-types';
import { BlockRenderer } from './block-renderer';
import { GripVertical, Trash2, Copy } from 'lucide-react';

interface SortableBlockProps {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group cursor-pointer ${
        isSelected ? 'ring-2 ring-sage-500' : ''
      }`}
      onClick={onSelect}
    >
      {/* Block Controls */}
      <div
        className={`absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded bg-white border shadow-sm cursor-grab hover:bg-gray-50"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-gray-50 cursor-pointer"
        >
          <Copy className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-red-50 hover:text-red-500 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Block Content */}
      <BlockRenderer block={block} />
    </div>
  );
}

interface BuilderCanvasProps {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
}: BuilderCanvasProps) {
  return (
    <div className="min-h-[400px] pl-12">
      {blocks
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <SortableBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            onDelete={() => onDeleteBlock(block.id)}
            onDuplicate={() => onDuplicateBlock(block.id)}
          />
        ))}
    </div>
  );
}
