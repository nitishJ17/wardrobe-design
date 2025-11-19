
import React from 'react';
import { Layers, Box, GripHorizontal, Footprints, Move } from 'lucide-react';
import { SectionType } from '../types';

export const ITEM_CONFIGS: Record<SectionType, { icon: any, defaultHeight: number, label: string }> = {
  [SectionType.SHELF]: { icon: Layers, defaultHeight: 10, label: 'Shelf' },
  [SectionType.DRAWER]: { icon: Box, defaultHeight: 15, label: 'Drawer Unit' },
  [SectionType.HANGING_ROD]: { icon: GripHorizontal, defaultHeight: 40, label: 'Hanging Rail' },
  [SectionType.SHOE_RACK]: { icon: Footprints, defaultHeight: 15, label: 'Shoe Rack' },
  [SectionType.LONG_SHELF]: { icon: Layers, defaultHeight: 10, label: 'Upper Storage' },
  [SectionType.EMPTY]: { icon: Move, defaultHeight: 10, label: 'Void / Gap' },
};

// Only show draggable ones
const DISPLAY_ITEMS = [
  SectionType.SHELF,
  SectionType.DRAWER,
  SectionType.HANGING_ROD,
  SectionType.SHOE_RACK,
];

const ItemSidebar: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, type: SectionType) => {
    e.dataTransfer.setData('application/wardrobe-item', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm sticky top-8">
        <div className="mb-6 pb-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-900 tracking-tight">Components</h3>
            <p className="text-xs text-stone-400 mt-1 font-medium">Drag to insert into columns</p>
        </div>
        
        <div className="space-y-3">
            {DISPLAY_ITEMS.map((type) => {
                const config = ITEM_CONFIGS[type];
                const Icon = config.icon;
                return (
                    <div
                        key={type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type)}
                        className="flex items-center gap-4 p-4 bg-stone-50 hover:bg-white border border-stone-200 hover:border-amber-400 rounded-lg cursor-grab active:cursor-grabbing transition-all group select-none shadow-sm hover:shadow-md"
                    >
                        <div className="text-stone-400 group-hover:text-amber-500 transition-colors bg-white p-2 rounded border border-stone-100">
                            <Icon size={18} />
                        </div>
                        <span className="font-bold text-stone-700 text-sm tracking-wide">{config.label}</span>
                    </div>
                );
            })}
        </div>
        
        <div className="mt-8 p-4 bg-stone-900 rounded-lg text-xs text-stone-300 leading-relaxed">
            <p className="opacity-80"><strong>Designer Tip:</strong> Layouts auto-balance. Drop an item, and we'll calculate the remaining space.</p>
        </div>
    </div>
  );
};

export default ItemSidebar;
