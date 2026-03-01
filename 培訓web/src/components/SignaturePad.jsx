import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';
import { Eraser, RotateCcw, Check, X } from 'lucide-react';

const SignaturePadComponent = ({ onConfirm, onCancel, isOpen }) => {
  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    const w = container.clientWidth;
    const h = Math.min(container.clientHeight, 300);

    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const pad = new SignaturePadLib(canvasRef.current, {
      penColor: '#1a1a2e',
      minWidth: 1.5,
      maxWidth: 3.5,
      throttle: 16,
      velocityFilterWeight: 0.7,
    });

    pad.addEventListener('beginStroke', () => setIsEmpty(false));
    padRef.current = pad;

    const timer = setTimeout(resizeCanvas, 50);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
      pad.off();
    };
  }, [isOpen, resizeCanvas]);

  const handleClear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">電子簽名</h3>
            <p className="text-sm text-slate-500 mt-0.5">請在下方白色區域簽下您的姓名</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Canvas area */}
        <div className="p-5">
          <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-white overflow-hidden"
            style={{ height: '280px' }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair touch-none"
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-300 text-lg font-medium select-none">在此簽名</p>
              </div>
            )}
            {/* Signature line */}
            <div className="absolute bottom-12 left-8 right-8 border-b border-slate-200 pointer-events-none" />
            <div className="absolute bottom-8 left-8 pointer-events-none">
              <span className="text-xs text-slate-300">甲方簽名</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            清除重簽
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleConfirm}
              disabled={isEmpty}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
                isEmpty
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25'
              }`}
            >
              <Check className="w-4 h-4" />
              確認簽名
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePadComponent;
