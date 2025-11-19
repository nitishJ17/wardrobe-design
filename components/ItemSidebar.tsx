import React from 'react';
import { Layers, Box, GripHorizontal, Footprints, Move } from 'lucide-react';
import { SectionType } from '../types';

export const ITEM_CONFIGS: Record<SectionType, { icon: any, defaultHeight: number, label: string }> = {
  [SectionType.SHELF]: { icon: Layers, defaultHeight: 10, label: 'Shelf' },
  [SectionType.DRAWER]: { icon: Box, defaultHeight: 15, label: 'Drawer' },
  [SectionType.HANGING_ROD]: { icon: GripHorizontal, defaultHeight: 40, label: 'Hanging Rod' },
  [SectionType.SHOE_RACK]: { icon: Footprints, defaultHeight: 15, label: 'Shoe Rack' },
  [SectionType.LONG_SHELF]: { icon: Layers, defaultHeight: 10, label: 'Long Shelf' },
  [SectionType.EMPTY]: { icon: Move, defaultHeight: 10, label: 'Empty Space' },
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
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
        <div className="mb-4">
            <h3 className="font-bold text-slate-800">Wardrobe Items</h3>
            <p className="text-xs text-slate-500 mt-1">Drag items to customize your design</p>
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
                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl cursor-grab active:cursor-grabbing transition-all group select-none"
                    >
                        <div className="text-slate-500 group-hover:text-indigo-600 transition-colors">
                            <Icon size={20} />
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{config.label}</span>
                    </div>
                );
            })}
        </div>
        
        <div className="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
            <p><strong>Tip:</strong> Drop an item onto any column in a design to add it. The layout will automatically adjust.</p>
        </div>
    </div>
  );
};

export default ItemSidebar;