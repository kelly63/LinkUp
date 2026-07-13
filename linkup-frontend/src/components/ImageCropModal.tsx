import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';

interface Props {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageUrl, onConfirm, onCancel }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, setTick] = useState(0);
  const forceRender = useCallback(() => setTick(t => t + 1), []);

  // Measure crop stage; keep ref in sync for use inside imperative handlers
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

  // Refs so imperative handlers always call the latest clamp/zoomTo
  const clampRef = useRef(clamp);
  useLayoutEffect(() => { clampRef.current = clamp; }, [clamp]);

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
      offsetRef.current = clampRef.current(cx - imgCx * s, cy - imgCy * s, s);
      forceRender();
    },
    [minScale, maxScale, forceRender]
  );

  const zoomToRef = useRef(zoomTo);
  useLayoutEffect(() => { zoomToRef.current = zoomTo; }, [zoomTo]);

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

  // ── Imperative touch + mouse handlers ─────────────────────────────────────
  // Touch handlers use { passive: false } so preventDefault() actually blocks
  // iOS from stealing the gesture. Pointer events alone aren't reliable in
  // Capacitor's WKWebView — switching to raw touch events fixes drag on iOS.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let dragging = false;
    let lastX = 0, lastY = 0;
    let pinchDist0 = 0, pinchScale0 = 1;

    // ── Touch ──────────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        dragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        dragging = false;
        pinchDist0 = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        pinchScale0 = scaleRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        zoomToRef.current(pinchScale0 * (dist / pinchDist0));
        return;
      }
      if (!dragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      offsetRef.current = clampRef.current(
        offsetRef.current.x + dx,
        offsetRef.current.y + dy,
        scaleRef.current,
      );
      forceRender();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        dragging = false;
      } else if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        dragging = true;
      }
    };

    // ── Mouse (web / desktop preview) ──────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      offsetRef.current = clampRef.current(
        offsetRef.current.x + dx,
        offsetRef.current.y + dy,
        scaleRef.current,
      );
      forceRender();
    };

    const onMouseUp = () => { dragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomToRef.current(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.93));
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    // mousemove/mouseup on window so drag works even if cursor leaves the box
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [forceRender]); // stable dep — handlers read live values via refs

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

      {/* Crop stage */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ touchAction: 'none', cursor: 'grab' }}
      >
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
          onChange={e => {
            const pct = Number(e.target.value) / 100;
            zoomToRef.current(minScale + pct * (maxScale - minScale));
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
