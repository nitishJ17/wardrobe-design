
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
  const DIM_OFFSET = 25; // Distance of dimension line from left edge of column
  const DIM_TICK_SIZE = 6;

  const { layout } = design;
  
  const topShelfHeight = layout.topShelfHeightPercentage 
    ? (layout.topShelfHeightPercentage / 100) * VIRTUAL_HEIGHT 
    : 0;

  const columnsStartY = topShelfHeight > 0 ? topShelfHeight + SHELF_THICKNESS : 0;
  const columnsAvailableHeight = VIRTUAL_HEIGHT - columnsStartY;

  // Calculate Real Dimensions helper
  const getRealDim = (virtualSize: number, isWidth: boolean) => {
    const ratio = isWidth ? dimensions.width / VIRTUAL_WIDTH : dimensions.height / VIRTUAL_HEIGHT;
    const val = Math.round(virtualSize * ratio);
    
    // If feet, maybe format nicely, but for now raw number is cleaner for arch drawings
    if (dimensions.unit === 'ft') {
        // Optional: formatting for feet and inches could go here, keeping simple for now
        return Math.round(val * 100) / 100;
    }
    return val;
  };
  
  const formatDim = (val: number) => {
      return `${val}${dimensions.unit === 'mm' ? '' : '"'}`;
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
              initialWidth: getRealDim(w, true),
              initialHeight: getRealDim(h, false),
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

    // Selection Highlight
    const selectionHighlight = isEditing ? (
       <rect
          x={x + 2}
          y={y + 2}
          width={Math.max(0, w - 4)}
          height={Math.max(0, h - 4)}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="6 4"
          rx="4"
          pointerEvents="none"
          data-ignore-export="true"
       />
    ) : null;

    switch (type) {
      case SectionType.DRAWER:
        content = (
          <g>
            <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={4} fill={isEditing ? "#e0e7ff" : "#f1f5f9"} stroke={isEditing ? "#6366f1" : "#cbd5e1"} strokeWidth={isEditing ? 3 : 2} />
            <rect x={centerX - 40} y={centerY - 5} width={80} height={10} rx={5} fill={isEditing ? "#818cf8" : "#94a3b8"} />
          </g>
        );
        break;
      case SectionType.SHELF:
      case SectionType.LONG_SHELF:
      case SectionType.SHOE_RACK:
        const opacity = isHidden ? 0 : 1;
        content = (
          <g opacity={opacity}>
             <line x1={x} y1={y + h - SHELF_THICKNESS} x2={x + w} y2={y + h - SHELF_THICKNESS} stroke={isEditing ? "#6366f1" : "#e2e8f0"} strokeWidth={SHELF_THICKNESS} />
             {h > 50 && <rect x={centerX - w * 0.25} y={y + h - 40} width={w * 0.5} height={20} rx={4} fill={isEditing ? "#c7d2fe" : "#bfdbfe"} opacity="0.5" />}
          </g>
        );
        break;
      case SectionType.HANGING_ROD:
        content = (
          <g>
            <line x1={x + 5} y1={y + 50} x2={x + w - 5} y2={y + 50} stroke={isEditing ? "#818cf8" : "#cbd5e1"} strokeWidth="8" strokeLinecap="round" />
            <path d={`M${centerX} ${y+50} L${centerX - 25} ${y+85} L${centerX + 25} ${y+85} Z`} fill="none" stroke={isEditing ? "#818cf8" : "#94a3b8"} strokeWidth="3" />
            <path d={`M${centerX - 25} ${y+85} Q${centerX - 35} ${y+h-20} ${centerX} ${y+h-20} Q${centerX + 35} ${y+h-20} ${centerX + 25} ${y+85}`} fill="#f0f9ff" stroke={isEditing ? "#c7d2fe" : "#e0f2fe"} strokeWidth="3" />
          </g>
        );
        break;
      case SectionType.EMPTY:
        content = (
          <g>
             {/* Dashed border and distinctive background for empty space */}
            <rect 
              x={x + 4} 
              y={y + 4} 
              width={w - 8} 
              height={h - 8} 
              rx={4} 
              fill="url(#diagonalHatch)"
              stroke={isEditing ? "#64748b" : "#94a3b8"} 
              strokeWidth="2" 
              strokeDasharray="8 4"
              opacity="0.6"
            />
          </g>
        );
        break;
      default:
        content = null;
    }

    const TYPE_FONT_SIZE = 32;
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
        <rect x={x} y={y} width={w} height={h} fill="transparent" className="hover:fill-indigo-50/30 transition-colors" />
        
        {selectionHighlight}

        {content}

        {!isHidden && (
            // ARCHITECTURAL DIMENSION LINE (VERTICAL)
            <g className="pointer-events-none">
                {/* Main vertical line segment for this item */}
                <line 
                    x1={dimX} y1={y} 
                    x2={dimX} y2={y + h} 
                    stroke="#64748b" strokeWidth="1" 
                />
                
                {/* Top Tick */}
                <line 
                    x1={dimX - DIM_TICK_SIZE} y1={y} 
                    x2={dimX + DIM_TICK_SIZE} y2={y} 
                    stroke="#64748b" strokeWidth="1" 
                />

                {/* Bottom Tick (only if not last item, or strictly draw both to be safe) */}
                <line 
                    x1={dimX - DIM_TICK_SIZE} y1={y + h} 
                    x2={dimX + DIM_TICK_SIZE} y2={y + h} 
                    stroke="#64748b" strokeWidth="1" 
                />
                
                {/* Dimension Text - Rotated */}
                <text 
                    x={dimX + 12} 
                    y={y + h/2} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill="#475569" 
                    fontSize="20"
                    fontFamily="monospace"
                    fontWeight="bold"
                    transform={`rotate(-90, ${dimX + 12}, ${y + h/2})`}
                    style={{ textShadow: '0px 0px 4px white' }}
                >
                    {formatDim(realH)}
                </text>
            </g>
        )}
        
        {!isHidden && (w > 120 && h > 100) && (
            <text 
                x={centerX} 
                y={centerY} 
                textAnchor="middle" 
                dominantBaseline="middle"
                fill={type === SectionType.EMPTY ? "#64748b" : "#64748b"} 
                fontSize={TYPE_FONT_SIZE} 
                opacity={type === SectionType.EMPTY ? "0.8" : "0.15"}
                className="pointer-events-none select-none uppercase font-bold tracking-wider"
                style={type === SectionType.EMPTY ? {textShadow: '0px 0px 5px white'} : {}}
            >
                {type.split(' ')[0]}
            </text>
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
                      <circle r="20" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
                      <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                      <line x1="8" y1="-8" x2="-8" y2="8" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  </g>
              )}
              {onUpdateItem && (
                <g transform={`translate(${x + 25}, ${deleteBtnY})`} className="pointer-events-none">
                    <circle r="16" fill="#f1f5f9" opacity="0.8" />
                    <text textAnchor="middle" dy="5" fontSize="20" className="fill-slate-500">✎</text>
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
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-indigo-100 p-4 w-64 animate-in zoom-in-95 duration-200 ring-4 ring-indigo-500/10"
            style={style}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Edit2 size={12} className="text-indigo-600"/> {isTopShelf ? 'Edit Top Shelf' : 'Edit Item'}
                  </h4>
                  <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                  </button>
              </div>

              <div className="mb-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Type</label>
                  <select 
                      value={currentType}
                      disabled={isTopShelf}
                      onChange={(e) => {
                          onUpdateItem(colIdx, itemIdx, { type: e.target.value as SectionType });
                          setEditingItem(prev => prev ? { ...prev, currentType: e.target.value as SectionType } : null);
                      }}
                      className={`w-full text-sm p-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none transition-all ${isTopShelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      {Object.entries(ITEM_CONFIGS).map(([type, config]) => (
                          <option key={type} value={type}>{config.label}</option>
                      ))}
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">W ({dimensions.unit})</label>
                      <input 
                        type="number" 
                        defaultValue={initialWidth}
                        disabled={isTopShelf}
                        title={isTopShelf ? "Top shelf width is fixed to wardrobe width" : ""}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = Number(e.currentTarget.value);
                                if (val > 0) {
                                    onUpdateItem(colIdx, itemIdx, { width: val });
                                    setEditingItem(null); 
                                }
                            }
                        }}
                        onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== initialWidth) onUpdateItem(colIdx, itemIdx, { width: val });
                        }}
                        className={`w-full text-sm p-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none font-mono font-medium ${isTopShelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">H ({dimensions.unit})</label>
                      <input 
                        type="number" 
                        defaultValue={initialHeight}
                        autoFocus
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
                        className="w-full text-sm p-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none font-mono font-medium"
                      />
                  </div>
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-slate-50">
                   <button 
                      onClick={() => {
                          if (onDeleteItem) onDeleteItem(colIdx, itemIdx);
                          setEditingItem(null);
                      }}
                      className="flex-1 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center justify-center gap-1 transition-colors"
                   >
                      <Trash2 size={14} /> Remove
                   </button>
                   <button 
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md flex items-center justify-center gap-1 transition-colors"
                   >
                      <Check size={14} /> Done
                   </button>
              </div>
          </div>
      );
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-white rounded-lg overflow-hidden border-2 border-slate-100 relative select-none ${resizing ? (resizing.type === 'col' ? 'cursor-ew-resize' : 'cursor-ns-resize') : 'cursor-default'}`}
    >
      
      <EditPopover />

      <svg 
        id={svgId || "wardrobe-schematic-svg"}
        ref={svgRef}
        viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`} 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => setEditingItem(null)} 
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDropTarget(null)}
        onDragEnd={() => { setDraggingSource(null); setDropTarget(null); }}
      >
        <defs>
            <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" style={{stroke:'#e2e8f0', strokeWidth:2}} />
            </pattern>
        </defs>

        <rect 
            x={FRAME_THICKNESS/2} 
            y={FRAME_THICKNESS/2} 
            width={VIRTUAL_WIDTH - FRAME_THICKNESS} 
            height={VIRTUAL_HEIGHT - FRAME_THICKNESS} 
            fill="#fff" 
            stroke="#334155" 
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
                            initialHeight: getRealDim(topShelfHeight, false),
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
                fill={editingItem?.colIdx === -1 ? "rgba(99, 102, 241, 0.1)" : "none"} 
                stroke={editingItem?.colIdx === -1 ? "#6366f1" : "none"} 
                strokeWidth={editingItem?.colIdx === -1 ? "3" : "0"}
                strokeDasharray={editingItem?.colIdx === -1 ? "6 4" : "none"}
                data-ignore-export="true"
             />
             
             <line 
                x1={FRAME_THICKNESS} 
                y1={topShelfHeight + FRAME_THICKNESS/2} 
                x2={VIRTUAL_WIDTH - FRAME_THICKNESS} 
                y2={topShelfHeight + FRAME_THICKNESS/2} 
                stroke="#334155" 
                strokeWidth={SHELF_THICKNESS} 
             />
             
             {/* Top Shelf Dimension */}
             <text 
               x={VIRTUAL_WIDTH/2} 
               y={topShelfHeight/2 + 15} 
               textAnchor="middle" 
               className="fill-slate-400 font-mono font-bold tracking-wider transition-colors" 
               fontSize="30"
             >
               Top Shelf ({formatDim(getRealDim(topShelfHeight, false))} H)
             </text>

             {onUpdateItem && (
                 <g className="opacity-0 group-hover:opacity-100 transition-opacity" transform={`translate(${VIRTUAL_WIDTH/2}, ${topShelfHeight/2 + 50})`} data-ignore-export="true">
                     <circle r="12" fill="#f1f5f9" opacity="0.9"/>
                     <text textAnchor="middle" dy="4" fontSize="14" fill="#64748b">✎</text>
                 </g>
             )}
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
                    fill={isDropTarget ? "rgba(99, 102, 241, 0.08)" : "transparent"}
                    className="transition-colors duration-200"
                />

                {/* Horizontal Width Dimension for Column (Architectural Style) */}
                <g className="pointer-events-none">
                    <line 
                        x1={currentX} y1={columnsStartY + 20} 
                        x2={currentX + colWidth} y2={columnsStartY + 20} 
                        stroke="#64748b" strokeWidth="1" 
                    />
                    <line x1={currentX} y1={columnsStartY + 15} x2={currentX} y2={columnsStartY + 25} stroke="#64748b" strokeWidth="1" />
                    <line x1={currentX + colWidth} y1={columnsStartY + 15} x2={currentX + colWidth} y2={columnsStartY + 25} stroke="#64748b" strokeWidth="1" />
                    <rect x={currentX + colWidth/2 - 25} y={columnsStartY + 8} width="50" height="24" fill="white" fillOpacity="0.8" />
                    <text 
                        x={currentX + colWidth/2} 
                        y={columnsStartY + 25} 
                        textAnchor="middle" 
                        fill="#475569" 
                        fontSize="20" 
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
                            stroke="#cbd5e1" 
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
                            fill={isResizingThisItem ? "rgba(99, 102, 241, 0.05)" : "transparent"} 
                           />
                           <line 
                            x1={currentX + 10} 
                            y1={itemDividerY} 
                            x2={currentX + colWidth - 10} 
                            y2={itemDividerY} 
                            stroke="#6366f1" 
                            strokeWidth="8"
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

                {isDropTarget && (
                    <g pointerEvents="none">
                        <line 
                            x1={currentX + 4} 
                            y1={dropLineY} 
                            x2={currentX + colWidth - 4} 
                            y2={dropLineY} 
                            stroke="#4f46e5" 
                            strokeWidth="6" 
                            strokeDasharray="8 4" 
                            strokeLinecap="round"
                        />
                        <circle cx={currentX} cy={dropLineY} r="6" fill="#4f46e5" />
                        <circle cx={currentX + colWidth} cy={dropLineY} r="6" fill="#4f46e5" />
                    </g>
                )}

                {colIdx < layout.columns.length - 1 && (
                    <line 
                        x1={currentX + colWidth} 
                        y1={columnsStartY} 
                        x2={currentX + colWidth} 
                        y2={VIRTUAL_HEIGHT - FRAME_THICKNESS} 
                        stroke="#334155" 
                        strokeWidth={SHELF_THICKNESS} 
                    />
                )}

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
                                        fill={isResizingThisCol ? "rgba(99, 102, 241, 0.1)" : "transparent"}
                                    />
                                    <line 
                                        x1={currentX + colWidth} 
                                        y1={columnsStartY + 20} 
                                        x2={currentX + colWidth} 
                                        y2={VIRTUAL_HEIGHT - FRAME_THICKNESS - 20} 
                                        stroke="#6366f1" 
                                        strokeWidth="8" 
                                        className={`transition-opacity duration-150 ${isResizingThisCol ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    />
                                </>
                             );
                        })()}
                    </g>
                )}
                
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
                        <circle r="16" fill="white" stroke="#cbd5e1" strokeWidth="1" className="hover:stroke-indigo-400 shadow-sm" />
                        {shelvesHidden ? (
                            <EyeOff size={16} className="text-slate-400" x="-8" y="-8" />
                        ) : (
                            <Eye size={16} className="text-slate-400" x="-8" y="-8" />
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
      
      <div className="absolute bottom-0 right-0 bg-slate-800/90 text-white text-xs px-3 py-1.5 rounded-tl-lg pointer-events-none font-mono z-10" data-ignore-export="true">
        Total: {dimensions.width}{dimensions.unit} x {dimensions.height}{dimensions.unit}
      </div>
    </div>
  );
};

export default WardrobeSchematic;
