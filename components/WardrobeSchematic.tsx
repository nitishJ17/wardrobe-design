
import React, { useRef, useState, useEffect } from 'react';
import { WardrobeDesign, Dimensions, SectionType } from '../types';
import { Trash2, Edit2, Check, X, Eye, EyeOff } from 'lucide-react';
import { ITEM_CONFIGS } from './ItemSidebar';

interface Props {
  design: WardrobeDesign;
  dimensions: Dimensions;
  svgId?: string;
  onDropItem?: (colIndex: number, itemType: SectionType, insertIndex?: number) => void;
  onDeleteItem?: (colIndex: number, itemIndex: number) => void;
  onMoveItem?: (fromCol: number, fromIndex: number, toCol: number, toIndex: number) => void;
  onResizeColumn?: (colIndex: number, deltaPercentage: number) => void;
  onResizeItem?: (colIndex: number, itemIndex: number, deltaPercentage: number) => void;
  onUpdateItem?: (colIndex: number, itemIndex: number, updates: { type?: SectionType, width?: number, height?: number }) => void;
}

const WardrobeSchematic: React.FC<Props> = ({ 
  design, 
  dimensions, 
  svgId,
  onDropItem, 
  onDeleteItem,
  onMoveItem,
  onResizeColumn, 
  onResizeItem,
  onUpdateItem
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Resize Drag state
  const [resizing, setResizing] = useState<{
    type: 'col' | 'item';
    index: number; // col index for col resize, item index for item resize
    colIndex?: number; // only for item resize
    startMouse: number; // x for col, y for item
  } | null>(null);

  // Drag & Drop State
  const [draggingSource, setDraggingSource] = useState<{ colIdx: number, itemIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ colIdx: number, insertIdx: number } | null>(null);

  // Edit Popover State
  const [editingItem, setEditingItem] = useState<{
    colIdx: number;
    itemIdx: number;
    rect: DOMRect;
    initialWidth: number;
    initialHeight: number;
    currentType: SectionType;
  } | null>(null);

  // Shelf Visibility State (Set of column indices where shelves are hidden)
  const [hiddenShelfCols, setHiddenShelfCols] = useState<Set<number>>(new Set());

  const toggleShelves = (colIdx: number) => {
    const next = new Set(hiddenShelfCols);
    if (next.has(colIdx)) {
        next.delete(colIdx);
    } else {
        next.add(colIdx);
    }
    setHiddenShelfCols(next);
  };

  const aspectRatio = dimensions.width / dimensions.height;
  const VIRTUAL_HEIGHT = 1000;
  const VIRTUAL_WIDTH = VIRTUAL_HEIGHT * aspectRatio;

  // Outer frame thickness
  const FRAME_THICKNESS = 15;
  const SHELF_THICKNESS = 10;
  
  // Architectural Dimension settings
  const DIM_OFFSET = 35; // Distance of dimension line from left edge of column
  const DIM_TICK_SIZE = 8;

  const { layout } = design;
  
  const topShelfHeight = layout.topShelfHeightPercentage 
    ? (layout.topShelfHeightPercentage / 100) * VIRTUAL_HEIGHT 
    : 0;

  const columnsStartY = topShelfHeight > 0 ? topShelfHeight + SHELF_THICKNESS : 0;
  const columnsAvailableHeight = VIRTUAL_HEIGHT - columnsStartY;

  // Calculate Real Dimensions helper
  const getRealDim = (virtualSize: number, isWidth: boolean) => {
    const ratio = isWidth ? dimensions.width / VIRTUAL_WIDTH : dimensions.height / VIRTUAL_HEIGHT;
    const val = virtualSize * ratio;
    // Keep precision for calculations, formatting happens in formatDim
    return val;
  };
  
  const formatDim = (val: number) => {
      if (dimensions.unit === 'ft') {
          // Convert decimal feet to feet and inches
          const feet = Math.floor(val);
          const inches = Math.round((val - feet) * 12);
          
          // Handle rounding roll-over (e.g. 5.99 ft -> 5' 12" -> 6' 0")
          if (inches === 12) {
              return `${feet + 1}' 0"`;
          }
          return `${feet}' ${inches}"`;
      }
      // Default for MM
      return `${Math.round(val)}`;
  };

  // Get insertion index based on mouse Y
  const getInsertIndex = (clientY: number, colIdx: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;

    const pt = svg.createSVGPoint();
    pt.x = 0; 
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    const col = layout.columns[colIdx];
    if (!col) return 0;
    
    let currentY = columnsStartY;
    for(let i = 0; i < col.items.length; i++) {
        const h = (col.items[i].heightPercentage / 100) * columnsAvailableHeight;
        const midY = currentY + h/2;
        if (svgP.y < midY) {
            return i;
        }
        currentY += h;
    }
    return col.items.length;
  };

  // Global mouse handlers for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !svgRef.current) return;

      e.preventDefault();
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      
      // Convert to SVG coordinates
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      if (resizing.type === 'col' && onResizeColumn) {
        const deltaSVG = svgP.x - resizing.startMouse;
        // Convert SVG delta to percentage delta
        const availableWidth = VIRTUAL_WIDTH - (FRAME_THICKNESS * 2);
        const deltaPercentage = (deltaSVG / availableWidth) * 100;
        
        // Check constraints for columns
        const colLeft = design.layout.columns[resizing.index];
        const colRight = design.layout.columns[resizing.index + 1];
        
        if (colLeft && colRight) {
            const MIN_COL_WIDTH = 10; // Minimum 10% width
            const newLeftW = colLeft.widthPercentage + deltaPercentage;
            const newRightW = colRight.widthPercentage - deltaPercentage;
            
            // Prevent move if constraint is violated
            if ((newLeftW < MIN_COL_WIDTH && deltaPercentage < 0) || 
                (newRightW < MIN_COL_WIDTH && deltaPercentage > 0)) {
                return;
            }
        }

        if (Math.abs(deltaPercentage) > 0.1) {
            onResizeColumn(resizing.index, deltaPercentage);
            setResizing(prev => prev ? { ...prev, startMouse: svgP.x } : null);
        }
      } else if (resizing.type === 'item' && onResizeItem && resizing.colIndex !== undefined) {
        const deltaSVG = svgP.y - resizing.startMouse;
        const deltaPercentage = (deltaSVG / columnsAvailableHeight) * 100;
        
        // Check constraints for items
        const col = design.layout.columns[resizing.colIndex];
        if (col) {
            const itemTop = col.items[resizing.index];
            const itemBottom = col.items[resizing.index + 1];
            
            if (itemTop && itemBottom) {
                const MIN_ITEM_HEIGHT = 5; // Minimum 5% height
                const newTopH = itemTop.heightPercentage + deltaPercentage;
                const newBottomH = itemBottom.heightPercentage - deltaPercentage;
                
                // Prevent move if constraint is violated (too small or negative/overlap)
                if ((newTopH < MIN_ITEM_HEIGHT && deltaPercentage < 0) || 
                    (newBottomH < MIN_ITEM_HEIGHT && deltaPercentage > 0)) {
                    return;
                }
            }
        }
        
        if (Math.abs(deltaPercentage) > 0.1) {
            onResizeItem(resizing.colIndex, resizing.index, deltaPercentage);
            setResizing(prev => prev ? { ...prev, startMouse: svgP.y } : null);
        }
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, onResizeColumn, onResizeItem, VIRTUAL_WIDTH, columnsAvailableHeight, design]);


  // Drag & Drop Handlers
  const handleDragStartItem = (e: React.DragEvent, colIdx: number, itemIdx: number) => {
    e.stopPropagation();
    setEditingItem(null); 
    setDraggingSource({ colIdx, itemIdx });
    e.dataTransfer.setData('application/wardrobe-move', JSON.stringify({ colIndex: colIdx, itemIndex: itemIdx }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverColumn = (e: React.DragEvent, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const insertIdx = getInsertIndex(e.clientY, colIdx);
    if (dropTarget?.colIdx !== colIdx || dropTarget?.insertIdx !== insertIdx) {
        setDropTarget({ colIdx, insertIdx });
    }
  };

  const handleDropOnColumn = (e: React.DragEvent, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const insertIndex = getInsertIndex(e.clientY, colIdx);
    setDraggingSource(null);
    setDropTarget(null);

    const moveData = e.dataTransfer.getData('application/wardrobe-move');
    if (moveData && onMoveItem) {
        try {
            const { colIndex: fromCol, itemIndex: fromIdx } = JSON.parse(moveData);
            onMoveItem(fromCol, fromIdx, colIdx, insertIndex);
        } catch (e) {}
    } else if (onDropItem) {
        const type = e.dataTransfer.getData('application/wardrobe-item') as SectionType;
        if (type) {
            onDropItem(colIdx, type, insertIndex);
        }
    }
  };

  const handleItemClick = (e: React.MouseEvent, colIdx: number, itemIdx: number, type: SectionType, w: number, h: number) => {
      if (!onUpdateItem) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = (e.currentTarget as Element).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
          setEditingItem({
              colIdx,
              itemIdx,
              rect: {
                  ...rect,
                  top: rect.top - containerRect.top,
                  left: rect.left - containerRect.left
              },
              initialWidth: Math.round(getRealDim(w, true)),
              initialHeight: Math.round(getRealDim(h, false)),
              currentType: type
          });
      }
  };


  const renderItemContent = (type: SectionType, x: number, y: number, w: number, h: number, label: string, colIdx: number, itemIdx: number) => {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    
    const realW = getRealDim(w, true);
    const realH = getRealDim(h, false);

    const isEditing = editingItem?.colIdx === colIdx && editingItem?.itemIdx === itemIdx;
    const isDraggingSource = draggingSource?.colIdx === colIdx && draggingSource?.itemIdx === itemIdx;
    const isHidden = type === SectionType.SHELF && hiddenShelfCols.has(colIdx);

    let content = null;

    // Styles for "Wood" look
    const WOOD_STROKE = "#A89F91"; 
    const WOOD_FILL = "#F0EAD6"; // Eggshell/Light Oak
    const DRAWER_FACE = "#E6DCC3"; 
    const METALLIC = "#cbd5e1";

    // Selection Highlight
    const selectionHighlight = isEditing ? (
       <rect
          x={x + 2}
          y={y + 2}
          width={Math.max(0, w - 4)}
          height={Math.max(0, h - 4)}
          fill="rgba(251, 191, 36, 0.1)" // Amber tint
          stroke="#d97706" // Amber-600
          strokeWidth="2"
          strokeDasharray="6 4"
          rx="2"
          pointerEvents="none"
          data-ignore-export="true"
       />
    ) : null;

    switch (type) {
      case SectionType.DRAWER:
        content = (
          <g>
            {/* Drawer Face */}
            <rect 
              x={x + 3} y={y + 3} width={w - 6} height={h - 6} 
              fill={DRAWER_FACE} 
              stroke={WOOD_STROKE} 
              strokeWidth="1.5" 
            />
            {/* Handle */}
            <rect 
              x={centerX - 30} y={centerY - 4} width={60} height={8} 
              rx={2} 
              fill="#94a3b8" // darker handle
              filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.1))"
            />
          </g>
        );
        break;
      case SectionType.SHELF:
      case SectionType.LONG_SHELF:
      case SectionType.SHOE_RACK:
        const opacity = isHidden ? 0 : 1;
        // Realistic shelf thickness
        content = (
          <g opacity={opacity}>
             <rect 
                x={x} y={y + h - SHELF_THICKNESS} 
                width={w} height={SHELF_THICKNESS} 
                fill="#D4C4A8" // Darker wood edge
                stroke="none"
             />
             {/* Suggestion of depth/folded clothes */}
             {h > 50 && type !== SectionType.SHOE_RACK && (
               <path 
                 d={`M${centerX - w * 0.2} ${y + h - SHELF_THICKNESS} L${centerX + w * 0.2} ${y + h - SHELF_THICKNESS} L${centerX + w * 0.22} ${y + h - 30} L${centerX - w * 0.22} ${y + h - 30} Z`}
                 fill="#f1f5f9"
                 stroke="#e2e8f0"
               />
             )}
             {/* Shoe Rack Angles */}
             {type === SectionType.SHOE_RACK && (
                <line x1={x} y1={y + h - 20} x2={x + w} y2={y + h - 5} stroke="#cbd5e1" strokeWidth="2" />
             )}
          </g>
        );
        break;
      case SectionType.HANGING_ROD:
        content = (
          <g>
            {/* Rod */}
            <line x1={x + 2} y1={y + 50} x2={x + w - 2} y2={y + 50} stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            
            {/* Hanger simplified */}
            <path d={`M${centerX} ${y+50} L${centerX - 20} ${y+80} L${centerX + 20} ${y+80} Z`} fill="none" stroke="#94a3b8" strokeWidth="2" />
            {/* Clothes shape */}
            <path 
                d={`M${centerX - 20} ${y+80} Q${centerX - 30} ${y+h-10} ${centerX} ${y+h-10} Q${centerX + 30} ${y+h-10} ${centerX + 20} ${y+80}`} 
                fill="#e2e8f0" 
                stroke="#cbd5e1" 
                strokeWidth="1" 
                opacity="0.6"
            />
          </g>
        );
        break;
      case SectionType.EMPTY:
        content = (
          <g>
             {/* Subtle hatching for void */}
             <rect 
              x={x} 
              y={y} 
              width={w} 
              height={h} 
              fill="url(#diagonalHatch)"
              opacity="0.3"
            />
          </g>
        );
        break;
      default:
        content = null;
    }

    const deleteBtnY = h < 50 ? y + h/2 : y + 30;
    const dimX = x + DIM_OFFSET;

    return (
      <g 
        className={`group ${isDraggingSource ? 'opacity-30' : ''}`} 
        draggable={!!onMoveItem}
        onDragStart={(e) => handleDragStartItem(e, colIdx, itemIdx)}
        onClick={(e) => handleItemClick(e, colIdx, itemIdx, type, w, h)}
        style={{ cursor: 'grab' }}
      >
        {/* Transparent Hit Area */}
        <rect x={x} y={y} width={w} height={h} fill="transparent" className="hover:fill-amber-50/30 transition-colors" />
        
        {selectionHighlight}

        {content}

        {!isHidden && (
            // ARCHITECTURAL DIMENSION LINE (VERTICAL)
            <g className="pointer-events-none">
                {/* Main vertical line segment for this item */}
                <line 
                    x1={dimX} y1={y} 
                    x2={dimX} y2={y + h} 
                    stroke="#44403c" strokeWidth="0.7" 
                />
                
                {/* Top Tick */}
                <line 
                    x1={dimX - DIM_TICK_SIZE} y1={y + DIM_TICK_SIZE} 
                    x2={dimX + DIM_TICK_SIZE} y2={y - DIM_TICK_SIZE} 
                    stroke="#44403c" strokeWidth="0.7" 
                />

                {/* Bottom Tick */}
                <line 
                    x1={dimX - DIM_TICK_SIZE} y1={y + h + DIM_TICK_SIZE} 
                    x2={dimX + DIM_TICK_SIZE} y2={y + h - DIM_TICK_SIZE} 
                    stroke="#44403c" strokeWidth="0.7" 
                />
                
                {/* Dimension Text - Rotated */}
                <text 
                    x={dimX + 14} 
                    y={y + h/2} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill="#1c1917" 
                    fontSize="18"
                    fontFamily="monospace"
                    transform={`rotate(-90, ${dimX + 14}, ${y + h/2})`}
                    style={{ textShadow: '0px 0px 4px white', letterSpacing: '-0.05em' }}
                >
                    {formatDim(realH)}
                </text>
            </g>
        )}

        {!isDraggingSource && (
          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-ignore-export="true">
              {onDeleteItem && (
                  <g 
                      transform={`translate(${x + w - 25}, ${deleteBtnY})`} 
                      className="cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteItem(colIdx, itemIdx);
                          setEditingItem(null);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                  >
                      <circle r="16" fill="#fff1f2" stroke="#be123c" strokeWidth="1.5" />
                      <line x1="-6" y1="-6" x2="6" y2="6" stroke="#be123c" strokeWidth="2" strokeLinecap="round" />
                      <line x1="6" y1="-6" x2="-6" y2="6" stroke="#be123c" strokeWidth="2" strokeLinecap="round" />
                  </g>
              )}
          </g>
        )}
      </g>
    );
  };

  // Edit Popover Component
  const EditPopover = () => {
      if (!editingItem || !onUpdateItem) return null;

      const { colIdx, itemIdx, rect, initialWidth, initialHeight, currentType } = editingItem;
      const isTopShelf = colIdx === -1;

      const style: React.CSSProperties = {
          position: 'absolute',
          top: Math.min(Math.max(0, rect.top + rect.height/2 - 100), (containerRef.current?.offsetHeight || 800) - 200),
          left: Math.min(Math.max(0, rect.left + rect.width/2 - 120), (containerRef.current?.offsetWidth || 800) - 240),
      };

      return (
          <div 
            className="absolute z-50 bg-stone-900 rounded-lg shadow-2xl border border-stone-700 p-4 w-64 animate-in zoom-in-95 duration-200"
            style={style}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-stone-200 text-xs uppercase tracking-widest flex items-center gap-2">
                      <Edit2 size={10} className="text-amber-500"/> {isTopShelf ? 'Top Shelf' : 'Edit Component'}
                  </h4>
                  <button onClick={() => setEditingItem(null)} className="text-stone-500 hover:text-stone-300">
                      <X size={14} />
                  </button>
              </div>

              <div className="mb-4">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Type</label>
                  <select 
                      value={currentType}
                      disabled={isTopShelf}
                      onChange={(e) => {
                          onUpdateItem(colIdx, itemIdx, { type: e.target.value as SectionType });
                          setEditingItem(prev => prev ? { ...prev, currentType: e.target.value as SectionType } : null);
                      }}
                      className={`w-full text-sm p-2 rounded bg-stone-800 border border-stone-700 text-stone-200 focus:border-amber-500 outline-none ${isTopShelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      {Object.entries(ITEM_CONFIGS).map(([type, config]) => (
                          <option key={type} value={type}>{config.label}</option>
                      ))}
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">W ({dimensions.unit})</label>
                      <input 
                        type="number" 
                        defaultValue={initialWidth}
                        disabled={isTopShelf}
                        className={`w-full text-sm p-2 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono ${isTopShelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== initialWidth) onUpdateItem(colIdx, itemIdx, { width: val });
                        }}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">H ({dimensions.unit})</label>
                      <input 
                        type="number" 
                        defaultValue={initialHeight}
                        autoFocus
                        className="w-full text-sm p-2 rounded bg-stone-800 border border-stone-700 text-stone-200 font-mono"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = Number(e.currentTarget.value);
                                if (val >= 0) {
                                    onUpdateItem(colIdx, itemIdx, { height: val });
                                    setEditingItem(null);
                                }
                            }
                        }}
                        onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 0 && val !== initialHeight) onUpdateItem(colIdx, itemIdx, { height: val });
                        }}
                      />
                  </div>
              </div>
              
              <div className="flex gap-2 pt-3">
                   <button 
                      onClick={() => {
                          if (onDeleteItem) onDeleteItem(colIdx, itemIdx);
                          setEditingItem(null);
                      }}
                      className="flex-1 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 rounded flex items-center justify-center gap-1 transition-colors"
                   >
                      <Trash2 size={12} /> Remove
                   </button>
                   <button 
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-1.5 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 rounded flex items-center justify-center gap-1 transition-colors"
                   >
                      <Check size={12} /> Done
                   </button>
              </div>
          </div>
      );
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-white rounded-sm border border-stone-200 relative select-none ${resizing ? (resizing.type === 'col' ? 'cursor-ew-resize' : 'cursor-ns-resize') : 'cursor-default'}`}
    >
      
      <EditPopover />

      <svg 
        id={svgId || "wardrobe-schematic-svg"}
        ref={svgRef}
        viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`} 
        className="w-full h-full bg-grid-pattern"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => setEditingItem(null)} 
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDropTarget(null)}
        onDragEnd={() => { setDraggingSource(null); setDropTarget(null); }}
      >
        <defs>
            <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" style={{stroke:'#e7e5e4', strokeWidth:1}} />
            </pattern>
        </defs>

        <rect 
            x={FRAME_THICKNESS/2} 
            y={FRAME_THICKNESS/2} 
            width={VIRTUAL_WIDTH - FRAME_THICKNESS} 
            height={VIRTUAL_HEIGHT - FRAME_THICKNESS} 
            fill="#fdf6e3" 
            stroke="#44403c" 
            strokeWidth={FRAME_THICKNESS} 
        />

        {topShelfHeight > 0 && (
          <g 
             onClick={(e) => {
                e.stopPropagation();
                if (onUpdateItem) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    if (containerRect) {
                         setEditingItem({
                            colIdx: -1,
                            itemIdx: -1,
                            rect: {
                                ...rect,
                                top: rect.top - containerRect.top,
                                left: rect.left - containerRect.left
                            },
                            initialWidth: dimensions.width, 
                            initialHeight: Math.round(getRealDim(topShelfHeight, false)),
                            currentType: SectionType.LONG_SHELF
                        });
                    }
                }
             }}
             className={`group ${onUpdateItem ? 'cursor-pointer' : ''}`}
          >
             <rect x={FRAME_THICKNESS} y={FRAME_THICKNESS} width={VIRTUAL_WIDTH - FRAME_THICKNESS*2} height={topShelfHeight} fill="transparent" />
             
             <rect 
                x={FRAME_THICKNESS} 
                y={FRAME_THICKNESS} 
                width={VIRTUAL_WIDTH - FRAME_THICKNESS*2} 
                height={topShelfHeight} 
                fill={editingItem?.colIdx === -1 ? "rgba(251, 191, 36, 0.1)" : "none"} 
                stroke={editingItem?.colIdx === -1 ? "#d97706" : "none"} 
                strokeWidth={editingItem?.colIdx === -1 ? "3" : "0"}
                strokeDasharray={editingItem?.colIdx === -1 ? "6 4" : "none"}
                data-ignore-export="true"
             />
             
             <line 
                x1={FRAME_THICKNESS} 
                y1={topShelfHeight + FRAME_THICKNESS/2} 
                x2={VIRTUAL_WIDTH - FRAME_THICKNESS} 
                y2={topShelfHeight + FRAME_THICKNESS/2} 
                stroke="#44403c" 
                strokeWidth={SHELF_THICKNESS} 
             />
             
             {/* Top Shelf Dimension */}
             <text 
               x={VIRTUAL_WIDTH/2} 
               y={topShelfHeight/2 + 15} 
               textAnchor="middle" 
               className="fill-stone-400 font-mono font-bold tracking-widest uppercase" 
               fontSize="24"
             >
               Upper Storage ({formatDim(getRealDim(topShelfHeight, false))} H)
             </text>
          </g>
        )}

        {(() => {
          let currentX = FRAME_THICKNESS;
          return layout.columns.map((col, colIdx) => {
            const colWidth = (col.widthPercentage / 100) * (VIRTUAL_WIDTH - (FRAME_THICKNESS * 2));
            const realColWidth = getRealDim(colWidth, true);
            
            const hasShelves = col.items.some(i => i.type === SectionType.SHELF);
            const shelvesHidden = hiddenShelfCols.has(colIdx);
            const isDropTarget = dropTarget?.colIdx === colIdx;
            
            let dropLineY = columnsStartY;
            if (isDropTarget && dropTarget) {
               const itemsBefore = col.items.slice(0, dropTarget.insertIdx);
               const heightPctBefore = itemsBefore.reduce((sum, i) => sum + i.heightPercentage, 0);
               dropLineY = columnsStartY + (heightPctBefore / 100) * columnsAvailableHeight;
            }

            const columnRender = (
              <g key={`col-${colIdx}`} className="group/column"
                  onDragOver={(e) => handleDragOverColumn(e, colIdx)}
                  onDrop={(e) => handleDropOnColumn(e, colIdx)}
              >
                 <rect 
                    x={currentX} 
                    y={columnsStartY} 
                    width={colWidth} 
                    height={columnsAvailableHeight} 
                    fill={isDropTarget ? "rgba(251, 191, 36, 0.1)" : "transparent"}
                    className="transition-colors duration-200"
                />

                {/* Horizontal Width Dimension for Column (Architectural Style) */}
                <g className="pointer-events-none">
                    <line 
                        x1={currentX} y1={columnsStartY + 25} 
                        x2={currentX + colWidth} y2={columnsStartY + 25} 
                        stroke="#44403c" strokeWidth="0.7" 
                    />
                    {/* Ticks */}
                    <line x1={currentX} y1={columnsStartY + 20} x2={currentX + 5} y2={columnsStartY + 30} stroke="#44403c" strokeWidth="0.7" />
                    <line x1={currentX + colWidth - 5} y1={columnsStartY + 20} x2={currentX + colWidth} y2={columnsStartY + 30} stroke="#44403c" strokeWidth="0.7" />
                    
                    <rect x={currentX + colWidth/2 - 30} y={columnsStartY + 12} width="60" height="26" fill="#fdf6e3" rx="2" />
                    <text 
                        x={currentX + colWidth/2} 
                        y={columnsStartY + 30} 
                        textAnchor="middle" 
                        fill="#1c1917" 
                        fontSize="18" 
                        fontFamily="monospace"
                        fontWeight="bold"
                    >
                        {formatDim(realColWidth)}
                    </text>
                </g>

                 {(() => {
                   let currentY = columnsStartY;
                   return col.items.map((item, itemIdx) => {
                     const itemHeight = (item.heightPercentage / 100) * columnsAvailableHeight;
                     const itemY = currentY;
                     
                     const itemContent = renderItemContent(
                       item.type as SectionType, 
                       currentX + (colIdx > 0 ? SHELF_THICKNESS/2 : 0), 
                       itemY, 
                       colWidth - (colIdx > 0 ? SHELF_THICKNESS/2 : 0), 
                       itemHeight,
                       item.label || '',
                       colIdx,
                       itemIdx
                     );
                     
                     const itemDividerY = itemY + itemHeight;
                     
                     const isLastItem = itemIdx === col.items.length - 1;
                     
                     const separator = !isLastItem ? (
                        <line 
                            x1={currentX + (colIdx > 0 ? SHELF_THICKNESS/2 : 0)} 
                            y1={itemDividerY} 
                            x2={currentX + colWidth} 
                            y2={itemDividerY} 
                            stroke="#d6d3d1" 
                            strokeWidth={SHELF_THICKNESS} 
                       />
                     ) : null;

                     const isResizingThisItem = resizing?.type === 'item' && resizing?.colIndex === colIdx && resizing?.index === itemIdx;
                     const resizeHandle = !isLastItem ? (
                       <g 
                        className="cursor-ns-resize group"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const svg = svgRef.current!;
                            const pt = svg.createSVGPoint();
                            pt.x = e.clientX; pt.y = e.clientY;
                            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                            setResizing({ type: 'item', index: itemIdx, colIndex: colIdx, startMouse: svgP.y });
                        }}
                        data-ignore-export="true"
                       >
                           <rect 
                            x={currentX} 
                            y={itemDividerY - 30} 
                            width={colWidth} 
                            height={60} 
                            fill={isResizingThisItem ? "rgba(251, 191, 36, 0.05)" : "transparent"} 
                           />
                           <line 
                            x1={currentX + 10} 
                            y1={itemDividerY} 
                            x2={currentX + colWidth - 10} 
                            y2={itemDividerY} 
                            stroke="#d97706" 
                            strokeWidth="4"
                            className={`transition-opacity duration-150 ${isResizingThisItem ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                           />
                       </g>
                     ) : null;

                     currentY += itemHeight;

                     return (
                       <g key={`item-${colIdx}-${itemIdx}`}>
                         {itemContent}
                         {separator}
                         {resizeHandle}
                       </g>
                     );
                   });
                 })()}

                {/* Drop Indicator */}
                {isDropTarget && (
                    <g pointerEvents="none">
                        <line 
                            x1={currentX + 4} 
                            y1={dropLineY} 
                            x2={currentX + colWidth - 4} 
                            y2={dropLineY} 
                            stroke="#d97706" 
                            strokeWidth="4" 
                            strokeDasharray="8 4" 
                            strokeLinecap="round"
                        />
                        <circle cx={currentX} cy={dropLineY} r="4" fill="#d97706" />
                        <circle cx={currentX + colWidth} cy={dropLineY} r="4" fill="#d97706" />
                    </g>
                )}

                {/* Vertical Divider */}
                {colIdx < layout.columns.length - 1 && (
                    <line 
                        x1={currentX + colWidth} 
                        y1={columnsStartY} 
                        x2={currentX + colWidth} 
                        y2={VIRTUAL_HEIGHT - FRAME_THICKNESS} 
                        stroke="#44403c" 
                        strokeWidth={SHELF_THICKNESS} 
                    />
                )}

                {/* Column Resize Handle */}
                {colIdx < layout.columns.length - 1 && (
                    <g 
                        className="cursor-ew-resize group"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const svg = svgRef.current!;
                            const pt = svg.createSVGPoint();
                            pt.x = e.clientX; pt.y = e.clientY;
                            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                            setResizing({ type: 'col', index: colIdx, startMouse: svgP.x });
                        }}
                        data-ignore-export="true"
                    >
                        {(() => {
                             const isResizingThisCol = resizing?.type === 'col' && resizing?.index === colIdx;
                             return (
                                <>
                                    <rect 
                                        x={currentX + colWidth - 30} 
                                        y={columnsStartY} 
                                        width={60} 
                                        height={columnsAvailableHeight} 
                                        fill={isResizingThisCol ? "rgba(251, 191, 36, 0.1)" : "transparent"}
                                    />
                                    <line 
                                        x1={currentX + colWidth} 
                                        y1={columnsStartY + 20} 
                                        x2={currentX + colWidth} 
                                        y2={VIRTUAL_HEIGHT - FRAME_THICKNESS - 20} 
                                        stroke="#d97706" 
                                        strokeWidth="4" 
                                        className={`transition-opacity duration-150 ${isResizingThisCol ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    />
                                </>
                             );
                        })()}
                    </g>
                )}
                
                {/* Eye Icon for Shelves */}
                {hasShelves && onUpdateItem && !isDropTarget && (
                    <g 
                        className={`cursor-pointer transition-opacity duration-200 ${shelvesHidden ? 'opacity-100' : 'opacity-0 group-hover/column:opacity-100'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleShelves(colIdx);
                        }}
                        transform={`translate(${currentX + colWidth/2}, ${columnsStartY + 50})`}
                        data-ignore-export="true"
                    >
                        <circle r="14" fill="white" stroke="#d6d3d1" strokeWidth="1" className="hover:stroke-amber-500 shadow-sm" />
                        {shelvesHidden ? (
                            <EyeOff size={14} className="text-stone-400" x="-7" y="-7" />
                        ) : (
                            <Eye size={14} className="text-stone-400" x="-7" y="-7" />
                        )}
                    </g>
                )}

              </g>
            );

            currentX += colWidth;
            return columnRender;
          });
        })()}

      </svg>
    </div>
  );
};

export default WardrobeSchematic;
