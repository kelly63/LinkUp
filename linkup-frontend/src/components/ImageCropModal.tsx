import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const CROP_SIZE = 280;

interface Props {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageUrl, onConfirm, onCancel }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      setDims({ w, h });
      const s = CROP_SIZE / Math.min(w, h);
      setScale(s);
      setOffset({ x: (CROP_SIZE - w * s) / 2, y: (CROP_SIZE - h * s) / 2 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const clamp = useCallback((ox: number, oy: number, s: number) => {
    return {
      x: Math.min(0, Math.max(CROP_SIZE - dims.w * s, ox)),
      y: Math.min(0, Math.max(CROP_SIZE - dims.h * s, oy)),
    };
  }, [dims]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(prev => clamp(prev.x + dx, prev.y + dy, scale));
  }, [scale, clamp]);

  const onPointerUp = () => { dragging.current = false; };

  const handleScaleChange = (s: number) => {
    setScale(s);
    setOffset(prev => clamp(prev.x, prev.y, s));
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      // offset.x/y = where image top-left sits in the viewport
      // Source pixel corresponding to viewport (0,0) = -offset / scale
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = CROP_SIZE / scale;
      const sh = CROP_SIZE / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 400);
      canvas.toBlob(blob => {
        if (blob) onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.src = imageUrl;
  };

  const minScale = dims.w > 0 ? CROP_SIZE / Math.min(dims.w, dims.h) : 0.5;

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <button onClick={onCancel} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
          <p className="text-white text-sm font-semibold">Move and Scale</p>
          <button
            onClick={handleConfirm}
            className="text-blue-400 font-semibold text-sm hover:text-blue-300 px-1"
          >
            Apply
          </button>
        </div>

        {/* Crop viewport — circular preview */}
        <div className="flex justify-center py-6 bg-black">
          <div
            className="relative overflow-hidden rounded-full select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {dims.w > 0 && (
              <img
                src={imageUrl}
                alt="crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: dims.w * scale,
                  height: dims.h * scale,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* Circle border */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: '2px solid rgba(255,255,255,0.4)' }}
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="px-6 pb-6">
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.005}
            value={scale}
            onChange={e => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
            style={{ touchAction: 'none' }}
          />
          <p className="text-xs text-slate-500 text-center mt-1">Slide to zoom · Drag to reposition</p>
        </div>
      </div>
    </div>
  );
}
