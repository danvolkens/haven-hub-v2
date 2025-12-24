'use client';

import { BLOCK_CONFIGS, BlockType } from './block-types';
import * as Icons from 'lucide-react';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div>
      <h3 className="font-semibold mb-4">Add Blocks</h3>
      <div className="space-y-2">
        {BLOCK_CONFIGS.map((config) => {
          const Icon = (Icons as any)[config.icon] || Icons.Square;
          return (
            <button
              key={config.type}
              onClick={() => onAddBlock(config.type)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 hover:border-sage-300 transition-colors text-left"
            >
              <Icon className="h-5 w-5 text-sage-600" />
              <span className="text-sm font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
