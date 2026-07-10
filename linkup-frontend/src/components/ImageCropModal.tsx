import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

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
  // Track active pointers for pinch detection
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // Min scale = image fills the circle (no empty gap)
  const minScale = useMemo(
    () => (dims.w > 0 ? CROP_SIZE / Math.min(dims.w, dims.h) : 1),
    [dims]
  );
  const maxScale = minScale * 4;

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

  const clamp = useCallback(
    (ox: number, oy: number, s: number) => ({
      x: Math.min(0, Math.max(CROP_SIZE - dims.w * s, ox)),
      y: Math.min(0, Math.max(CROP_SIZE - dims.h * s, oy)),
    }),
    [dims]
  );

  // Zoom toward the viewport center
  const zoomTo = useCallback(
    (newScale: number) => {
      const clamped = Math.max(minScale, Math.min(maxScale, newScale));
      setOffset((prev) => {
        const cx = (CROP_SIZE / 2 - prev.x) / scale;
        const cy = (CROP_SIZE / 2 - prev.y) / scale;
        return clamp(CROP_SIZE / 2 - cx * clamped, CROP_SIZE / 2 - cy * clamped, clamped);
      });
      setScale(clamped);
    },
    [scale, minScale, maxScale, clamp]
  );

  // Slider: 0–100 maps to minScale–maxScale
  const sliderValue = minScale < maxScale ? ((scale - minScale) / (maxScale - minScale)) * 100 : 0;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value) / 100;
    zoomTo(minScale + pct * (maxScale - minScale));
  };

  // Scroll-wheel zoom (desktop)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? 1.08 : 0.93));
    },
    [scale, zoomTo]
  );

  // Pointer drag & pinch
  const onPointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (activePointers.current.size === 1) {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      dragging.current = false;
      const pts = Array.from(activePointers.current.values());
      pinchStartDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartScale.current = scale;
    }
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.current.size === 2) {
        const pts = Array.from(activePointers.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        zoomTo(pinchStartScale.current * (dist / pinchStartDist.current));
        return;
      }

      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => clamp(prev.x + dx, prev.y + dy, scale));
    },
    [scale, clamp, zoomTo]
  );

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      dragging.current = false;
    } else if (activePointers.current.size === 1) {
      const [pt] = activePointers.current.values();
      lastPos.current = { x: pt.x, y: pt.y };
      dragging.current = true;
    }
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = CROP_SIZE / scale;
      const sh = CROP_SIZE / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 400);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85
      );
    };
    img.src = imageUrl;
  };

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
            className="text-emerald-400 font-semibold text-sm hover:text-emerald-300 px-1"
          >
            Apply
          </button>
        </div>

        {/* Crop viewport — circular */}
        <div className="flex justify-center py-6 bg-black">
          <div
            className="relative overflow-hidden rounded-full select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={handleWheel}
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

        {/* Zoom controls */}
        <div className="px-6 pb-5 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => zoomTo(scale * 0.85)}
              className="text-slate-400 hover:text-white flex-shrink-0"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={sliderValue}
              onChange={handleSlider}
              className="flex-1 h-1.5 rounded-full accent-emerald-500"
              style={{ accentColor: '#10b981' }}
            />
            <button
              onClick={() => zoomTo(scale * 1.18)}
              className="text-slate-400 hover:text-white flex-shrink-0"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">Drag to reposition · pinch or scroll to zoom</p>
        </div>
      </div>
    </div>
  );
}
