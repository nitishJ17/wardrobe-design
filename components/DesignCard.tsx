
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
      className={`group relative bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden hover:shadow-xl flex flex-col h-full ${
        isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl scale-[1.01]' : 'border-slate-100 hover:border-slate-300'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
        <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{design.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{design.description}</p>
        </div>
        <div className="flex items-center gap-1">
             <button 
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Full Screen Edit"
            >
                <Maximize2 size={20} />
            </button>
            <button 
                onClick={onSelect}
                className={`p-2 rounded-full transition-colors ${isSelected ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-slate-400'}`}
            >
                <CheckCircle2 size={24} className={isSelected ? 'fill-indigo-600 text-white' : ''} />
            </button>
        </div>
      </div>

      {/* Visualizer Body */}
      <div className="p-4 bg-slate-50 flex-1 min-h-[350px] flex items-center justify-center select-none">
        <div className="w-full h-full shadow-sm relative bg-white rounded-lg">
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
      <div className="p-5 bg-white mt-auto">
        <div className="flex flex-wrap gap-2 mb-4">
            {design.features.slice(0, 3).map((feat, i) => (
                <span key={i} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {feat}
                </span>
            ))}
            {design.features.length > 3 && (
                <span className="text-xs font-medium px-2 py-1 bg-slate-50 text-slate-400 rounded-md">
                    +{design.features.length - 3} more
                </span>
            )}
        </div>
        
        <button 
            onClick={(e) => { e.stopPropagation(); onVisualize(); }}
            className="w-full py-2.5 px-4 bg-slate-900 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors group-hover:shadow-lg group-hover:shadow-slate-200"
        >
            <Sparkles size={16} className="text-yellow-300" />
            Visualize Realism
        </button>
      </div>
    </div>
  );
};

export default DesignCard;
