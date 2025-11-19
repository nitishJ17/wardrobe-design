
import React, { useState } from 'react';
import { X, Maximize2, Download, Sparkles, Plus, Trash2, Columns } from 'lucide-react';
import { WardrobeDesign, Dimensions, SectionType } from '../types';
import WardrobeSchematic from './WardrobeSchematic';
import ItemSidebar from './ItemSidebar';

interface Props {
  design: WardrobeDesign;
  dimensions: Dimensions;
  onClose: () => void;
  onDropItem: (colIndex: number, itemType: SectionType, insertIndex?: number) => void;
  onDeleteItem: (colIndex: number, itemIndex: number) => void;
  onMoveItem: (fromCol: number, fromIndex: number, toCol: number, toIndex: number) => void;
  onResizeColumn: (colIndex: number, deltaPercentage: number) => void;
  onEqualizeColumns: () => void;
  onResizeItem: (colIndex: number, itemIndex: number, deltaPercentage: number) => void;
  onUpdateItem: (colIndex: number, itemIndex: number, updates: { type?: SectionType, width?: number, height?: number }) => void;
  onUpdateFeatures: (features: string[]) => void;
}

const EditDesignModal: React.FC<Props> = ({ 
  design, 
  dimensions, 
  onClose, 
  onDropItem,
  onDeleteItem,
  onMoveItem,
  onResizeColumn,
  onEqualizeColumns,
  onResizeItem,
  onUpdateItem,
  onUpdateFeatures
}) => {
  const [featureInput, setFeatureInput] = useState("");

  const addFeature = () => {
      if (!featureInput.trim()) return;
      onUpdateFeatures([...design.features, featureInput.trim()]);
      setFeatureInput("");
  };

  const handleDownload = () => {
    const svgElement = document.getElementById('edit-view-svg') as unknown as SVGSVGElement;
    if (!svgElement) return;

    // Clone the node to manipulate it without affecting the UI
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Remove UI-only elements (buttons, handles, highlights)
    const uiElements = clone.querySelectorAll('[data-ignore-export="true"]');
    uiElements.forEach(el => el.remove());

    // Get the actual viewBox dimensions to ensure correct aspect ratio
    const viewBox = svgElement.getAttribute('viewBox');
    // Default to 1000x1000 if missing (though WardrobeSchematic always sets it)
    const [vbX, vbY, vbW, vbH] = viewBox ? viewBox.split(' ').map(Number) : [0, 0, 1000, 1000];

    // Explicitly set width/height on clone to match viewBox (or scaled) to ensure consistent rendering
    clone.setAttribute('width', vbW.toString());
    clone.setAttribute('height', vbH.toString());

    // Serialize the SVG from the clean clone
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);

    // Add namespaces if missing
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Prepare for data URL
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

    // Create a canvas to draw the SVG and convert to PNG
    const canvas = document.createElement('canvas');
    
    // Resolution scale
    const scale = 2; 
    const padding = 40 * scale;
    
    // Set canvas dimensions based on the VIEWBOX aspect ratio, not screen rect
    canvas.width = (vbW * scale) + (padding * 2);
    canvas.height = (vbH * scale) + (padding * 2);
    
    const context = canvas.getContext('2d');
    const image = new Image();

    image.onload = function() {
        if (context) {
            context.fillStyle = "#ffffff"; 
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw based on viewBox dimensions
            context.drawImage(image, padding, padding, vbW * scale, vbH * scale);
            
            const pngUrl = canvas.toDataURL('image/png');
            
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `wardrobe-design-${design.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };
    
    image.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200 p-4 md:p-8">
      <div className="bg-white w-full h-full max-w-7xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Maximize2 size={20} className="text-indigo-600" />
              Edit Design: {design.name}
            </h3>
            <p className="text-sm text-slate-500">Click items to edit details. Drag to move/add. Use handles to resize.</p>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => {
                    if (window.confirm("Are you sure you want to make all columns equal width? This will override current widths.")) {
                        onEqualizeColumns();
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                title="Equalize all column widths"
            >
                <Columns size={16} />
                <span className="hidden sm:inline">Equalize Cols</span>
            </button>
             <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-indigo-100"
            >
                <Download size={16} />
                <span>Download</span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar in Modal */}
          <div className="w-80 border-r border-slate-100 bg-slate-50 p-6 overflow-y-auto hidden md:flex flex-col gap-6">
             <div className="[&>div]:!static">
                <ItemSidebar />
             </div>

             {/* Feature Manager */}
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600"/> Features
                </h3>
                
                <ul className="space-y-2 mb-4">
                    {design.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex justify-between items-center group">
                            <span className="truncate">{feature}</span>
                            <button 
                                onClick={() => {
                                    const newFeatures = [...design.features];
                                    newFeatures.splice(idx, 1);
                                    onUpdateFeatures(newFeatures);
                                }}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                    {design.features.length === 0 && (
                        <li className="text-xs text-slate-400 italic text-center py-2">No features added yet</li>
                    )}
                </ul>

                <div className="flex gap-2">
                    <input 
                        className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Add feature..."
                        value={featureInput}
                        onChange={e => setFeatureInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addFeature()}
                    />
                    <button 
                        onClick={addFeature}
                        disabled={!featureInput.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
             </div>
          </div>

          {/* Main Schematic Area */}
          <div className="flex-1 p-4 md:p-8 bg-slate-100/50 overflow-auto flex items-center justify-center">
             <div className="w-full h-full max-w-4xl aspect-[4/3] shadow-lg bg-white rounded-xl">
                <WardrobeSchematic 
                    svgId="edit-view-svg"
                    design={design} 
                    dimensions={dimensions} 
                    onDropItem={onDropItem} 
                    onDeleteItem={onDeleteItem}
                    onMoveItem={onMoveItem}
                    onResizeColumn={onResizeColumn}
                    onResizeItem={onResizeItem}
                    onUpdateItem={onUpdateItem}
                />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditDesignModal;
