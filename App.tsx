
import React, { useState } from 'react';
import { Dimensions, WardrobeDesign, SectionType } from './types';
import { generateWardrobeLayouts, generatePhotorealisticImage } from './services/geminiService';
import WardrobeInput from './components/WardrobeInput';
import DesignCard from './components/DesignCard';
import GeneratedImageModal from './components/GeneratedImageModal';
import EditDesignModal from './components/EditDesignModal';
import ItemSidebar, { ITEM_CONFIGS } from './components/ItemSidebar';
import { Layout, Armchair } from 'lucide-react';

const App: React.FC = () => {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [designs, setDesigns] = useState<WardrobeDesign[]>([]);
  const [isGeneratingLayouts, setIsGeneratingLayouts] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  
  // Image gen state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Editing state
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);

  const handleGenerateLayouts = async (inputDims: Dimensions) => {
    setDimensions(inputDims);
    setIsGeneratingLayouts(true);
    setDesigns([]);
    setSelectedDesignId(null);
    setEditingDesignId(null);
    
    try {
      const results = await generateWardrobeLayouts(inputDims);
      setDesigns(results);
      if (results.length > 0) {
        setSelectedDesignId(results[0].id);
      }
    } catch (error) {
      console.error("Failed to generate layouts", error);
      alert("Something went wrong generating the designs. Please check your API key and try again.");
    } finally {
      setIsGeneratingLayouts(false);
    }
  };

  const handleVisualizeRealism = async (design: WardrobeDesign) => {
    if (!dimensions) return;
    
    setShowImageModal(true);
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    
    try {
      const url = await generatePhotorealisticImage(design, dimensions);
      setGeneratedImageUrl(url);
    } catch (error) {
        console.error("Failed to generate image", error);
        setShowImageModal(false);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDropItem = (designId: string, colIdx: number, itemType: SectionType, insertIndex?: number) => {
    setDesigns(prevDesigns => prevDesigns.map(design => {
      if (design.id !== designId) return design;

      // Deep clone of the design to modify it immutably
      const newDesign = { 
        ...design, 
        layout: { 
            ...design.layout, 
            columns: design.layout.columns.map(c => ({ ...c, items: [...c.items] })) 
        } 
      };
      
      const column = newDesign.layout.columns[colIdx];
      
      // Get default height logic
      const defaultHeight = ITEM_CONFIGS[itemType]?.defaultHeight || 10;
      
      const newItem = {
        type: itemType,
        heightPercentage: defaultHeight,
        label: 'Added ' + itemType
      };

      // Insert at specific index or append
      if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= column.items.length) {
        column.items.splice(insertIndex, 0, newItem);
      } else {
        column.items.push(newItem);
      }

      // Normalize heights so they equal 100
      const totalHeight = column.items.reduce((sum, item) => sum + item.heightPercentage, 0);
      if (totalHeight > 0) {
        column.items = column.items.map(item => ({
            ...item,
            heightPercentage: (item.heightPercentage / totalHeight) * 100
        }));
      }

      return newDesign;
    }));
  };

  const handleDeleteItem = (designId: string, colIndex: number, itemIndex: number) => {
    setDesigns(prev => prev.map(d => {
      if (d.id !== designId) return d;
      
      // Handle Top Shelf Deletion (colIndex -1)
      if (colIndex === -1) {
          return {
              ...d,
              layout: { ...d.layout, topShelfHeightPercentage: 0 }
          };
      }

      const newCols = [...d.layout.columns];
      const col = { ...newCols[colIndex], items: [...newCols[colIndex].items] };
      
      // Remove item
      col.items.splice(itemIndex, 1);
      
      // Normalize remaining items to fill space
      if (col.items.length > 0) {
         const totalH = col.items.reduce((sum, i) => sum + i.heightPercentage, 0);
         // Guard against zero height (unlikely but possible if all items are empty space of 0 height)
         if (totalH > 0.01) {
            col.items = col.items.map(i => ({...i, heightPercentage: (i.heightPercentage / totalH) * 100}));
         } else {
            // Distribute evenly if total is effectively 0
            const evenSplit = 100 / col.items.length;
            col.items = col.items.map(i => ({...i, heightPercentage: evenSplit}));
         }
      }
      
      newCols[colIndex] = col;
      return { ...d, layout: { ...d.layout, columns: newCols }};
    }));
  };

  const handleMoveItem = (designId: string, fromCol: number, fromIdx: number, toCol: number, toIdx: number) => {
    setDesigns(prev => prev.map(d => {
        if (d.id !== designId) return d;
        // Deep copy columns and items
        const newCols = d.layout.columns.map(c => ({...c, items: [...c.items]}));
        
        // Get item to move
        const item = { ...newCols[fromCol].items[fromIdx] };
        
        // Remove from source
        newCols[fromCol].items.splice(fromIdx, 1);
        
        // Normalize source column if it still has items
        if (newCols[fromCol].items.length > 0) {
             const totalH = newCols[fromCol].items.reduce((sum, i) => sum + i.heightPercentage, 0);
             if (totalH > 0.01) {
                newCols[fromCol].items = newCols[fromCol].items.map(i => ({...i, heightPercentage: (i.heightPercentage / totalH) * 100}));
             }
        }

        // Calculate actual insertion index
        // If moving within same column and moving downwards, the index shifts by 1 because of removal
        let finalToIdx = toIdx;
        if (fromCol === toCol && fromIdx < toIdx) {
            finalToIdx -= 1;
        }
        
        // Ensure target column exists and insert
        if (newCols[toCol]) {
            newCols[toCol].items.splice(finalToIdx, 0, item);
            
            // Normalize target column
            if (newCols[toCol].items.length > 0) {
                const totalH = newCols[toCol].items.reduce((sum, i) => sum + i.heightPercentage, 0);
                if (totalH > 0.01) {
                    newCols[toCol].items = newCols[toCol].items.map(i => ({...i, heightPercentage: (i.heightPercentage / totalH) * 100}));
                }
            }
        }
        
        return { ...d, layout: { ...d.layout, columns: newCols }};
    }));
  };

  const handleResizeColumn = (designId: string, colIndex: number, deltaPercentage: number) => {
    setDesigns(prev => prev.map(design => {
      if (design.id !== designId) return design;
      const newLayout = { ...design.layout, columns: [...design.layout.columns] };
      
      // Modify current column and the next column
      const colLeft = { ...newLayout.columns[colIndex] };
      const colRight = { ...newLayout.columns[colIndex + 1] };

      const MIN_WIDTH = 8; 
      
      const maxPosDelta = colRight.widthPercentage - MIN_WIDTH;
      const maxNegDelta = -(colLeft.widthPercentage - MIN_WIDTH);

      const clampedDelta = Math.max(maxNegDelta, Math.min(maxPosDelta, deltaPercentage));

      if (Math.abs(clampedDelta) < 0.01) return design;

      colLeft.widthPercentage += clampedDelta;
      colRight.widthPercentage -= clampedDelta;

      newLayout.columns[colIndex] = colLeft;
      newLayout.columns[colIndex + 1] = colRight;

      return { ...design, layout: newLayout };
    }));
  };

  const handleEqualizeColumns = (designId: string) => {
    setDesigns(prev => prev.map(design => {
      if (design.id !== designId) return design;
      const numCols = design.layout.columns.length;
      if (numCols === 0) return design;
      
      const equalWidth = 100 / numCols;
      const newLayout = {
        ...design.layout,
        columns: design.layout.columns.map(col => ({
          ...col,
          widthPercentage: equalWidth
        }))
      };
      return { ...design, layout: newLayout };
    }));
  };

  const handleResizeItem = (designId: string, colIndex: number, itemIndex: number, deltaPercentage: number) => {
    setDesigns(prev => prev.map(design => {
      if (design.id !== designId) return design;
      
      const newLayout = { ...design.layout, columns: [...design.layout.columns] };
      const column = { ...newLayout.columns[colIndex], items: [...newLayout.columns[colIndex].items] };

      const itemTop = { ...column.items[itemIndex] };
      const itemBottom = { ...column.items[itemIndex + 1] };

      const MIN_HEIGHT = 5; 
      
      const maxPosDelta = itemBottom.heightPercentage - MIN_HEIGHT;
      const maxNegDelta = -(itemTop.heightPercentage - MIN_HEIGHT);
      
      const clampedDelta = Math.max(maxNegDelta, Math.min(maxPosDelta, deltaPercentage));

      if (Math.abs(clampedDelta) < 0.01) return design;

      itemTop.heightPercentage += clampedDelta;
      itemBottom.heightPercentage -= clampedDelta;

      column.items[itemIndex] = itemTop;
      column.items[itemIndex + 1] = itemBottom;
      
      newLayout.columns[colIndex] = column;
      return { ...design, layout: newLayout };
    }));
  };

  // Handle direct property updates from the Edit Popover
  const handleUpdateItem = (designId: string, colIndex: number, itemIndex: number, updates: { type?: SectionType, width?: number, height?: number }) => {
      if (!dimensions) return;

      setDesigns(prev => prev.map(design => {
          if (design.id !== designId) return design;

          const newLayout = { ...design.layout, columns: [...design.layout.columns] };

          // 0. Handle Top Shelf Update (colIndex -1)
          if (colIndex === -1) {
              if (updates.height !== undefined) {
                  const newPct = (updates.height / dimensions.height) * 100;
                  newLayout.topShelfHeightPercentage = Math.max(0, Math.min(newPct, 60)); // Allow up to 60%
              }
              return { ...design, layout: newLayout };
          }

          const column = { ...newLayout.columns[colIndex], items: [...newLayout.columns[colIndex].items] };
          const item = { ...column.items[itemIndex] };

          // 1. Handle Type Change
          if (updates.type) {
              item.type = updates.type;
              item.label = `Added ${updates.type}`;
              column.items[itemIndex] = item;
          }

          // 2. Handle Height Change (MM/FT input) - PROPORTIONAL RESIZING
          if (updates.height !== undefined) {
             const topShelfH = design.layout.topShelfHeightPercentage 
                ? (design.layout.topShelfHeightPercentage / 100) * dimensions.height 
                : 0;
             const availableH = dimensions.height - topShelfH;
             
             // Calculate requested percentage
             const rawHeightPct = (updates.height / availableH) * 100;
             
             // Clamp to reasonable bounds (e.g., min 2% or whatever makes sense)
             // If there are other items, max is less than 100
             const otherItems = column.items.filter((_, idx) => idx !== itemIndex);
             const currentOthersTotal = otherItems.reduce((sum, i) => sum + i.heightPercentage, 0);
             
             let targetHeightPct = rawHeightPct;
             
             // If there are other items, we need to leave them some space (e.g., 1% each minimum)
             if (otherItems.length > 0) {
                 const minOthers = otherItems.length * 2; // 2% per other item
                 targetHeightPct = Math.min(targetHeightPct, 100 - minOthers);
                 targetHeightPct = Math.max(targetHeightPct, 2);
                 
                 // Distribute remaining space proportionally among others
                 const remainingSpace = 100 - targetHeightPct;
                 const scaleFactor = remainingSpace / currentOthersTotal;
                 
                 column.items = column.items.map((it, idx) => {
                    if (idx === itemIndex) {
                        return { ...it, heightPercentage: targetHeightPct };
                    }
                    return { ...it, heightPercentage: it.heightPercentage * scaleFactor };
                 });
             } else {
                 // Single item column: height is always 100% of the column visually
                 column.items[itemIndex].heightPercentage = 100;
             }
          }

          newLayout.columns[colIndex] = column;

          // 3. Handle Width Change (MM/FT input) - PROPORTIONAL RESIZING
          if (updates.width !== undefined) {
              const rawWidthPct = (updates.width / dimensions.width) * 100;
              
              const otherCols = newLayout.columns.filter((_, idx) => idx !== colIndex);
              const currentOthersTotal = otherCols.reduce((sum, c) => sum + c.widthPercentage, 0);

              let targetWidthPct = rawWidthPct;

              if (otherCols.length > 0) {
                  const minOthers = otherCols.length * 5; // 5% per other column minimum
                  targetWidthPct = Math.min(targetWidthPct, 100 - minOthers);
                  targetWidthPct = Math.max(targetWidthPct, 5);

                  const remainingSpace = 100 - targetWidthPct;
                  const scaleFactor = remainingSpace / currentOthersTotal;

                  newLayout.columns = newLayout.columns.map((c, idx) => {
                      if (idx === colIndex) {
                          return { ...c, widthPercentage: targetWidthPct };
                      }
                      return { ...c, widthPercentage: c.widthPercentage * scaleFactor };
                  });
              } else {
                  newLayout.columns[colIndex].widthPercentage = 100;
              }
          }

          return { ...design, layout: newLayout };
      }));
  };

  const handleUpdateFeatures = (designId: string, newFeatures: string[]) => {
    setDesigns(prev => prev.map(design => {
      if (design.id !== designId) return design;
      return { ...design, features: newFeatures };
    }));
  };

  const getEditingDesign = () => designs.find(d => d.id === editingDesignId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      
      {/* Hero Header */}
      <header className="bg-slate-900 text-white pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-6 ring-1 ring-white/20 shadow-2xl">
            <Armchair size={32} className="text-indigo-300 mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">WardrobeAI</h1>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Design Your Perfect Space
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Enter your measurements and let AI create the optimal interior organization for your wardrobe, complete with drawers, shelves, and hanging space.
          </p>
        </div>
      </header>

      <main className="px-6">
        {/* Input Section */}
        <WardrobeInput onGenerate={handleGenerateLayouts} isLoading={isGeneratingLayouts} />

        {/* Results Section */}
        {dimensions && (
            <div className="max-w-[90rem] mx-auto mt-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
                
                {isGeneratingLayouts ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[500px] bg-white rounded-2xl animate-pulse shadow-lg border border-slate-100" />
                        ))}
                    </div>
                ) : designs.length > 0 ? (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Sidebar for Items */}
                        <div className="w-full lg:w-64 shrink-0 animate-in slide-in-from-left-4 duration-500 delay-100 hidden lg:block">
                            <ItemSidebar />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">Generated Designs</h3>
                                    <p className="text-slate-500">Found {designs.length} optimized layouts for {dimensions.width}x{dimensions.height}{dimensions.unit}</p>
                                </div>
                                <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                    <Layout size={16} />
                                    <span>Schematic View</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                                {designs.map(design => (
                                    <DesignCard 
                                        key={design.id} 
                                        design={design} 
                                        dimensions={dimensions} 
                                        isSelected={selectedDesignId === design.id}
                                        onSelect={() => setSelectedDesignId(design.id)}
                                        onVisualize={() => handleVisualizeRealism(design)}
                                        onDropItem={(colIdx, itemType, idx) => handleDropItem(design.id, colIdx, itemType, idx)}
                                        onDeleteItem={(colIdx, itemIdx) => handleDeleteItem(design.id, colIdx, itemIdx)}
                                        onMoveItem={(fc, fi, tc, ti) => handleMoveItem(design.id, fc, fi, tc, ti)}
                                        onResizeColumn={(colIdx, delta) => handleResizeColumn(design.id, colIdx, delta)}
                                        onResizeItem={(colIdx, itemIdx, delta) => handleResizeItem(design.id, colIdx, itemIdx, delta)}
                                        onExpand={() => setEditingDesignId(design.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        )}
      </main>

      {/* Visualization Modal */}
      {(showImageModal || isGeneratingImage) && (
        <GeneratedImageModal 
            imageUrl={generatedImageUrl} 
            isLoading={isGeneratingImage} 
            onClose={() => setShowImageModal(false)} 
        />
      )}

      {/* Edit Design Modal */}
      {editingDesignId && getEditingDesign() && dimensions && (
        <EditDesignModal
            design={getEditingDesign()!}
            dimensions={dimensions}
            onClose={() => setEditingDesignId(null)}
            onDropItem={(colIdx, itemType, idx) => handleDropItem(editingDesignId, colIdx, itemType, idx)}
            onDeleteItem={(colIdx, itemIdx) => handleDeleteItem(editingDesignId, colIdx, itemIdx)}
            onMoveItem={(fc, fi, tc, ti) => handleMoveItem(editingDesignId, fc, fi, tc, ti)}
            onResizeColumn={(colIdx, delta) => handleResizeColumn(editingDesignId, colIdx, delta)}
            onEqualizeColumns={() => handleEqualizeColumns(editingDesignId)}
            onResizeItem={(colIdx, itemIdx, delta) => handleResizeItem(editingDesignId, colIdx, itemIdx, delta)}
            onUpdateItem={(colIdx, itemIdx, updates) => handleUpdateItem(editingDesignId, colIdx, itemIdx, updates)}
            onUpdateFeatures={(features) => handleUpdateFeatures(editingDesignId, features)}
        />
      )}

    </div>
  );
};

export default App;
