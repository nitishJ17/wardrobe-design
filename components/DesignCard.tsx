
import React from 'react';
import { WardrobeDesign, Dimensions, SectionType } from '../types';
import WardrobeSchematic from './WardrobeSchematic';
import { CheckCircle2, Sparkles, Maximize2 } from 'lucide-react';

interface Props {
  design: WardrobeDesign;
  dimensions: Dimensions;
  isSelected: boolean;
  onSelect: () => void;
  onVisualize: () => void;
  onDropItem?: (colIndex: number, itemType: SectionType, insertIndex?: number) => void;
  onDeleteItem?: (colIndex: number, itemIndex: number) => void;
  onMoveItem?: (fromCol: number, fromIndex: number, toCol: number, toIndex: number) => void;
  onResizeColumn?: (colIndex: number, deltaPercentage: number) => void;
  onResizeItem?: (colIndex: number, itemIndex: number, deltaPercentage: number) => void;
  onExpand: () => void;
}

const DesignCard: React.FC<Props> = ({ 
  design, 
  dimensions, 
  isSelected, 
  onSelect, 
  onVisualize, 
  onDropItem,
  onDeleteItem,
  onMoveItem,
  onResizeColumn,
  onResizeItem,
  onExpand
}) => {
  return (
    <div 
      className={`group relative bg-white rounded-xl border transition-all duration-300 overflow-hidden flex flex-col h-full ${
        isSelected ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-2xl scale-[1.01] z-10' : 'border-stone-200 hover:border-stone-300 hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-stone-100 flex justify-between items-start">
        <div>
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors tracking-tight">{design.name}</h3>
            <p className="text-xs text-stone-500 mt-1 font-medium uppercase tracking-wide">{design.description}</p>
        </div>
        <div className="flex items-center gap-1">
             <button 
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="p-2 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                title="Full Screen Edit"
            >
                <Maximize2 size={18} />
            </button>
            <button 
                onClick={onSelect}
                className={`p-2 rounded-full transition-colors ${isSelected ? 'text-amber-500 bg-amber-50' : 'text-stone-200 hover:text-stone-400'}`}
            >
                <CheckCircle2 size={22} className={isSelected ? 'fill-amber-500 text-white' : ''} />
            </button>
        </div>
      </div>

      {/* Visualizer Body */}
      <div className="p-6 bg-stone-50/50 flex-1 min-h-[380px] flex items-center justify-center select-none relative">
        {/* Graph paper background effect */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="w-full h-full shadow-sm relative bg-white border border-stone-100">
            <WardrobeSchematic 
                svgId={`schematic-${design.id}`}
                design={design} 
                dimensions={dimensions} 
                onDropItem={onDropItem} 
                onDeleteItem={onDeleteItem}
                onMoveItem={onMoveItem}
                onResizeColumn={onResizeColumn}
                onResizeItem={onResizeItem}
            />
        </div>
      </div>

      {/* Features Footer */}
      <div className="p-5 bg-white border-t border-stone-100 mt-auto">
        <div className="flex flex-wrap gap-2 mb-5">
            {design.features.slice(0, 3).map((feat, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-stone-100 text-stone-500 rounded-sm border border-stone-200">
                    {feat}
                </span>
            ))}
            {design.features.length > 3 && (
                <span className="text-[10px] font-bold px-2 py-1 bg-white text-stone-300 border border-dashed border-stone-200 rounded-sm">
                    +{design.features.length - 3}
                </span>
            )}
        </div>
        
        <button 
            onClick={(e) => { e.stopPropagation(); onVisualize(); }}
            className="w-full py-3 px-4 bg-[#1C1917] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] group-hover:shadow-lg"
        >
            <Sparkles size={14} className="text-amber-400" />
            Generate Render
        </button>
      </div>
    </div>
  );
};

export default DesignCard;
