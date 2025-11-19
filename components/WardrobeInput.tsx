
import React, { useState } from 'react';
import { Dimensions, Unit } from '../types';
import { Ruler, ArrowRight, Settings2 } from 'lucide-react';

interface Props {
  onGenerate: (dimensions: Dimensions) => void;
  isLoading: boolean;
}

const WardrobeInput: React.FC<Props> = ({ onGenerate, isLoading }) => {
  const [unit, setUnit] = useState<Unit>('mm');
  
  // Main values (mm value OR feet value)
  const [width, setWidth] = useState<string>('2000');
  const [height, setHeight] = useState<string>('2400');
  const [depth, setDepth] = useState<string>('600');

  // Inches values (only used when unit is 'ft')
  const [widthIn, setWidthIn] = useState<string>('0');
  const [heightIn, setHeightIn] = useState<string>('0');
  const [depthIn, setDepthIn] = useState<string>('0');

  const handleUnitChange = (newUnit: Unit) => {
    setUnit(newUnit);
    // Reset defaults for better UX when switching
    if (newUnit === 'mm') {
      setWidth('2000'); setHeight('2400'); setDepth('600');
    } else {
      setWidth('6'); setWidthIn('6');
      setHeight('8'); setHeightIn('0');
      setDepth('2'); setDepthIn('0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalWidth = Number(width);
    let finalHeight = Number(height);
    let finalDepth = Number(depth);

    // If feet, combine feet and inches into decimal feet
    if (unit === 'ft') {
      finalWidth = finalWidth + (Number(widthIn || 0) / 12);
      finalHeight = finalHeight + (Number(heightIn || 0) / 12);
      finalDepth = finalDepth + (Number(depthIn || 0) / 12);
    }

    onGenerate({
      width: finalWidth,
      height: finalHeight,
      depth: finalDepth,
      unit,
    });
  };

  // Helper to render a dimension input group
  const DimensionField = ({ 
    label, 
    val, 
    setVal, 
    valIn, 
    setValIn 
  }: { 
    label: string, 
    val: string, 
    setVal: (v: string) => void,
    valIn: string,
    setValIn: (v: string) => void
  }) => (
    <div className="md:col-span-3 group">
      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 transition-colors group-hover:text-stone-600">{label}</label>
      {unit === 'mm' ? (
        <div className="relative">
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            required
            min="1"
            className="w-full pl-4 pr-10 py-4 bg-stone-50 border-0 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono text-lg text-stone-800 font-medium shadow-sm"
            placeholder="2000"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">mm</span>
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              required
              min="0"
              className="w-full pl-3 pr-8 py-4 bg-stone-50 border-0 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono text-lg text-stone-800 font-medium shadow-sm"
              placeholder="6"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">ft</span>
          </div>
          <div className="relative w-24">
            <input
              type="number"
              value={valIn}
              onChange={(e) => setValIn(e.target.value)}
              min="0"
              max="11"
              className="w-full pl-3 pr-8 py-4 bg-stone-50 border-0 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono text-lg text-stone-800 font-medium shadow-sm"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">in</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-100 max-w-5xl mx-auto relative">
      <div className="flex items-center gap-3 mb-8 border-b border-stone-100 pb-4">
        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
          <Settings2 size={20} />
        </div>
        <div>
            <h2 className="text-lg font-bold text-stone-800 tracking-tight">Project Configuration</h2>
            <p className="text-stone-500 text-xs">Define the physical constraints of your space</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        
        {/* Unit Toggle */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Measurement Unit</label>
          <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => handleUnitChange('mm')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${
                unit === 'mm' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              MM
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange('ft')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${
                unit === 'ft' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              FT
            </button>
          </div>
        </div>

        {/* Inputs */}
        <DimensionField 
          label="Total Width" 
          val={width} setVal={setWidth} 
          valIn={widthIn} setValIn={setWidthIn} 
        />
        
        <DimensionField 
          label="Ceiling Height" 
          val={height} setVal={setHeight} 
          valIn={heightIn} setValIn={setHeightIn} 
        />

        <div className="md:col-span-2">
           <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Depth</label>
           {unit === 'mm' ? (
              <div className="relative">
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-4 bg-stone-50 border-0 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono text-lg text-stone-800 font-medium shadow-sm"
                  placeholder="600"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">mm</span>
              </div>
           ) : (
             <div className="relative">
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  required
                  min="0"
                  className="w-full px-4 py-4 bg-stone-50 border-0 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono text-lg text-stone-800 font-medium shadow-sm"
                  placeholder="2"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">ft</span>
             </div>
           )}
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-stone-200 flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
              isLoading 
                ? 'bg-stone-400 cursor-not-allowed' 
                : 'bg-[#1C1917] hover:bg-black'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm">Calculating...</span>
              </>
            ) : (
              <>
                <Ruler size={18} className="text-amber-400" />
                <span className="text-sm tracking-wide">GENERATE</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default WardrobeInput;
