import React from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  isLoading: boolean;
  onClose: () => void;
}

const GeneratedImageModal: React.FC<Props> = ({ imageUrl, isLoading, onClose }) => {
  if (!isLoading && !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">AI Reality Preview</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="aspect-square w-full bg-slate-100 relative flex items-center justify-center">
            {isLoading ? (
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium animate-pulse">Rendering photorealistic view...</p>
                    <p className="text-slate-400 text-sm mt-2">This may take a few seconds</p>
                </div>
            ) : (
                <img 
                    src={imageUrl!} 
                    alt="AI Generated Wardrobe" 
                    className="w-full h-full object-cover"
                />
            )}
        </div>

        {/* Footer */}
        {!isLoading && imageUrl && (
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                <a 
                    href={imageUrl} 
                    download="wardrobe-design.jpg"
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                    <Download size={18} />
                    Download Image
                </a>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeneratedImageModal;
