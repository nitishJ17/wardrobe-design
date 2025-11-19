import React, { useState } from 'react';
import { Dimensions, Unit } from '../types';
import { Ruler, ArrowRight, Settings2 } from 'lucide-react';

interface Props {
  onGenerate: (dimensions: Dimensions) => void;
  isLoading: boolean;
}

const WardrobeInput: React.FC<Props> = ({ onGenerate, isLoading }) => {
  const [unit, setUnit] = useState<Unit>('mm');
  const [width, setWidth] = useState<string>('2000');
  const [height, setHeight] = useState<string>('2400');
  const [depth, setDepth] = useState<string>('600');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      width: Number(width),
      height: Number(height),
      depth: Number(depth),
      unit,
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 max-w-4xl mx-auto -mt-10 relative z-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
          <Settings2 size={24} />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Dimensions & Configuration</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        
        {/* Unit Toggle */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Unit</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setUnit('mm')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                unit === 'mm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              mm
            </button>
            <button
              type="button"
              onClick={() => setUnit('ft')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                unit === 'ft' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ft
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Width ({unit})</label>
          <div className="relative">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              required
              min="1"
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700"
              placeholder={unit === 'mm' ? '2000' : '6.5'}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Height ({unit})</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            required
            min="1"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700"
            placeholder={unit === 'mm' ? '2400' : '8'}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Depth ({unit})</label>
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            required
            min="1"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700"
            placeholder={unit === 'mm' ? '600' : '2'}
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all ${
              isLoading 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Designing...</span>
              </>
            ) : (
              <>
                <Ruler size={20} />
                <span>Design</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default WardrobeInput;
