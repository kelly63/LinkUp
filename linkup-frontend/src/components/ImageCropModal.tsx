import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface Props {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageUrl, onConfirm, onCancel }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  // Track container size so the crop circle adapts to the available space
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for hot values — pointer callbacks read these without going stale
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, setTick] = useState(0);
  const forceRender = useCallback(() => setTick(t => t + 1), []);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // Measure the crop stage and keep a ref in sync for pointer callbacks
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      containerSizeRef.current = { w, h };
      setContainerSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Crop circle fills ~44% of the smaller container dimension
  const cropRadius = useMemo(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return 140;
    return Math.floor(Math.min(containerSize.w, containerSize.h) * 0.44);
  }, [containerSize]);

  const minScale = useMemo(
    () => (dims.w > 0 ? (cropRadius * 2) / Math.min(dims.w, dims.h) : 1),
    [dims, cropRadius]
  );
  const maxScale = minScale * 5;

  const clamp = useCallback(
    (ox: number, oy: number, s: number) => {
      const { w: cw, h: ch } = containerSizeRef.current;
      const cx = cw / 2, cy = ch / 2;
      const r = cropRadius;
      return {
        x: Math.min(cx - r, Math.max(cx + r - dims.w * s, ox)),
        y: Math.min(cy - r, Math.max(cy + r - dims.h * s, oy)),
      };
    },
    [dims, cropRadius]
  );

  // Load image; set initial scale so it fills the crop circle
  useEffect(() => {
    if (!imageUrl || containerSize.w === 0) return;
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      setDims({ w, h });
      const { w: cw, h: ch } = containerSizeRef.current;
      const s = (cropRadius * 2) / Math.min(w, h);
      scaleRef.current = s;
      offsetRef.current = {
        x: cw / 2 - (w * s) / 2,
        y: ch / 2 - (h * s) / 2,
      };
      forceRender();
    };
    img.src = imageUrl;
  }, [imageUrl, containerSize.w, cropRadius, forceRender]);

  const zoomTo = useCallback(
    (newScale: number) => {
      const s = Math.max(minScale, Math.min(maxScale, newScale));
      const { w: cw, h: ch } = containerSizeRef.current;
      const cx = cw / 2, cy = ch / 2;
      const prev = offsetRef.current;
      const oldS = scaleRef.current;
      const imgCx = (cx - prev.x) / oldS;
      const imgCy = (cy - prev.y) / oldS;
      scaleRef.current = s;
      offsetRef.current = clamp(cx - imgCx * s, cy - imgCy * s, s);
      forceRender();
    },
    [minScale, maxScale, clamp, forceRender]
  );

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (activePointers.current.size === 1) {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      dragging.current = false;
      const pts = Array.from(activePointers.current.values());
      pinchStartDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartScale.current = scaleRef.current;
    }
  }, []);

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
      const prev = offsetRef.current;
      offsetRef.current = clamp(prev.x + dx, prev.y + dy, scaleRef.current);
      forceRender();
    },
    [clamp, zoomTo, forceRender]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      dragging.current = false;
    } else if (activePointers.current.size === 1) {
      const [pt] = activePointers.current.values();
      lastPos.current = { x: pt.x, y: pt.y };
      dragging.current = true;
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      zoomTo(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.93));
    },
    [zoomTo]
  );

  // ── Export ────────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const { w: cw, h: ch } = containerSizeRef.current;
      const s = scaleRef.current;
      const off = offsetRef.current;
      const sx = (cw / 2 - cropRadius - off.x) / s;
      const sy = (ch / 2 - cropRadius - off.y) / s;
      const sw = (cropRadius * 2) / s;
      ctx.drawImage(img, sx, sy, sw, sw, 0, 0, 400, 400);
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

  const scale = scaleRef.current;
  const offset = offsetRef.current;
  const sliderValue =
    minScale < maxScale ? ((scale - minScale) / (maxScale - minScale)) * 100 : 0;
  const cx = containerSize.w / 2;
  const cy = containerSize.h / 2;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 12 }}
      >
        <button
          onClick={onCancel}
          className="text-white/60 hover:text-white text-sm font-medium py-1 px-1"
        >
          Cancel
        </button>
        <p className="text-white text-sm font-semibold tracking-wide">Move and Scale</p>
        <button
          onClick={handleConfirm}
          className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
        >
          Choose
        </button>
      </div>

      {/* Crop stage — fills all space between header and controls */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={handleWheel}
      >
        {/* Image — draggable */}
        {dims.w > 0 && (
          <img
            src={imageUrl}
            alt="crop"
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

        {/* SVG overlay: dark vignette with circular cutout + white ring */}
        {containerSize.w > 0 && containerSize.h > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={containerSize.w}
            height={containerSize.h}
          >
            <defs>
              <mask id="crop-mask">
                <rect width={containerSize.w} height={containerSize.h} fill="white" />
                <circle cx={cx} cy={cy} r={cropRadius} fill="black" />
              </mask>
            </defs>
            <rect
              width={containerSize.w}
              height={containerSize.h}
              fill="rgba(0,0,0,0.62)"
              mask="url(#crop-mask)"
            />
            <circle
              cx={cx} cy={cy} r={cropRadius}
              fill="none"
              stroke="rgba(255,255,255,0.88)"
              strokeWidth="2"
            />
          </svg>
        )}
      </div>

      {/* Zoom slider */}
      <div
        className="flex-shrink-0 px-8 pt-5"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={sliderValue}
          onPointerDown={e => e.stopPropagation()}
          onChange={e => {
            const pct = Number(e.target.value) / 100;
            zoomTo(minScale + pct * (maxScale - minScale));
          }}
          className="w-full h-1.5 rounded-full"
          style={{ accentColor: '#10b981' }}
        />
        <p className="text-xs text-white/35 text-center mt-3">
          Drag to reposition · pinch or scroll to zoom
        </p>
      </div>
    </div>
  );
}
