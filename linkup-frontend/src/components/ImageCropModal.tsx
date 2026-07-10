import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

const CROP_RADIUS = 130;   // px — diameter 260, matches typical profile crop
const CONTAINER_H = 340;   // px — height of the crop stage

interface Props {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageUrl, onConfirm, onCancel }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for hot values so pointer callbacks never go stale
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [renderTick, setRenderTick] = useState(0); // force re-render after mutations
  const forceRender = useCallback(() => setRenderTick(t => t + 1), []);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // Measure container width on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Min scale: image just covers the crop circle — nothing empty inside it
  const minScale = useMemo(
    () => (dims.w > 0 ? (CROP_RADIUS * 2) / Math.min(dims.w, dims.h) : 1),
    [dims]
  );
  const maxScale = minScale * 4;

  // Clamp: ensure the crop circle is always covered by the image
  const clamp = useCallback(
    (ox: number, oy: number, s: number, cw: number) => {
      const cxPx = cw / 2;
      const cyPx = CONTAINER_H / 2;
      return {
        x: Math.min(cxPx - CROP_RADIUS, Math.max(cxPx + CROP_RADIUS - dims.w * s, ox)),
        y: Math.min(cyPx - CROP_RADIUS, Math.max(cyPx + CROP_RADIUS - dims.h * s, oy)),
      };
    },
    [dims]
  );

  // Load image and set initial centered position
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      setDims({ w, h });
      const s = (CROP_RADIUS * 2) / Math.min(w, h);
      scaleRef.current = s;
      const cw = containerRef.current?.offsetWidth || 340;
      offsetRef.current = {
        x: cw / 2 - (w * s) / 2,
        y: CONTAINER_H / 2 - (h * s) / 2,
      };
      forceRender();
    };
    img.src = imageUrl;
  }, [imageUrl, forceRender]);

  // Zoom toward the crop-circle center (= container center)
  const zoomTo = useCallback(
    (newScale: number, cw: number) => {
      const s = Math.max(minScale, Math.min(maxScale, newScale));
      const cxPx = cw / 2;
      const cyPx = CONTAINER_H / 2;
      const prev = offsetRef.current;
      const oldS = scaleRef.current;
      const imgCx = (cxPx - prev.x) / oldS;
      const imgCy = (cyPx - prev.y) / oldS;
      scaleRef.current = s;
      offsetRef.current = clamp(cxPx - imgCx * s, cyPx - imgCy * s, s, cw);
      forceRender();
    },
    [minScale, maxScale, clamp, forceRender]
  );

  const sliderValue =
    minScale < maxScale
      ? ((scaleRef.current - minScale) / (maxScale - minScale)) * 100
      : 0;

  // ── Pointer handlers (drag + pinch) ──────────────────────────────────────

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
      const cw = containerRef.current?.offsetWidth || containerW;

      if (activePointers.current.size === 2) {
        const pts = Array.from(activePointers.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        zoomTo(pinchStartScale.current * (dist / pinchStartDist.current), cw);
        return;
      }

      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      const prev = offsetRef.current;
      offsetRef.current = clamp(prev.x + dx, prev.y + dy, scaleRef.current, cw);
      forceRender();
    },
    [containerW, clamp, zoomTo, forceRender]
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
      const cw = containerRef.current?.offsetWidth || containerW;
      zoomTo(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.93), cw);
    },
    [containerW, zoomTo]
  );

  // ── Crop & export ─────────────────────────────────────────────────────────

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const cw = containerRef.current?.offsetWidth || containerW;
      const s = scaleRef.current;
      const off = offsetRef.current;
      // Crop circle top-left in image pixels
      const sx = (cw / 2 - CROP_RADIUS - off.x) / s;
      const sy = (CONTAINER_H / 2 - CROP_RADIUS - off.y) / s;
      const sw = (CROP_RADIUS * 2) / s;
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

  // SVG overlay values — computed each render from latest refs
  const scale = scaleRef.current;
  const offset = offsetRef.current;
  const cxStr = containerW > 0 ? `${containerW / 2}` : '50%';
  const cyStr = `${CONTAINER_H / 2}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center">
      <div className="bg-zinc-900 w-full max-w-sm rounded-2xl overflow-hidden mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <button onClick={onCancel} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
          <p className="text-white text-sm font-semibold">Crop Photo</p>
          <button
            onClick={handleConfirm}
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-1.5 rounded-full"
          >
            Save
          </button>
        </div>

        {/* Crop stage — full width, Facebook-style overlay */}
        <div
          ref={containerRef}
          className="relative bg-black overflow-hidden select-none"
          style={{ height: CONTAINER_H, cursor: 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={handleWheel}
        >
          {/* Full image — visible everywhere, dimmed outside circle */}
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

          {/* SVG: dark overlay with circular cutout + border ring */}
          {containerW > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={containerW}
              height={CONTAINER_H}
            >
              <defs>
                <mask id="circle-cutout">
                  <rect width={containerW} height={CONTAINER_H} fill="white" />
                  <circle cx={cxStr} cy={cyStr} r={CROP_RADIUS} fill="black" />
                </mask>
              </defs>
              {/* Dark vignette outside the circle */}
              <rect
                width={containerW}
                height={CONTAINER_H}
                fill="rgba(0,0,0,0.6)"
                mask="url(#circle-cutout)"
              />
              {/* White ring */}
              <circle
                cx={cxStr}
                cy={cyStr}
                r={CROP_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2"
              />
            </svg>
          )}
        </div>

        {/* Zoom controls */}
        <div className="px-5 pt-4 pb-5 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => zoomTo(scaleRef.current * 0.85, containerRef.current?.offsetWidth || containerW)}
              className="text-zinc-400 hover:text-white p-1 flex-shrink-0"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={sliderValue}
              onPointerDown={e => e.stopPropagation()}
              onChange={e => {
                const pct = Number(e.target.value) / 100;
                zoomTo(
                  minScale + pct * (maxScale - minScale),
                  containerRef.current?.offsetWidth || containerW
                );
              }}
              className="flex-1 h-1.5 rounded-full"
              style={{ accentColor: '#10b981' }}
            />
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => zoomTo(scaleRef.current * 1.18, containerRef.current?.offsetWidth || containerW)}
              className="text-zinc-400 hover:text-white p-1 flex-shrink-0"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-zinc-500 text-center">Drag to reposition · pinch or slide to zoom</p>
        </div>
      </div>
    </div>
  );
}
