import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Sheet Bend Visualizer (v2)
 * - All stop points share the same width; user specifies their CENTER positions.
 * - Draws rotated trapezoid (sheet) with light-gray fill, and the horizontal bending line ON TOP.
 * - Zoom & pan (wheel = zoom around cursor, drag = pan) + "Fit to scene" button.
 * - Vertical dashed lines at each center position.
 * - Bending line & center lines extend to the scene border rectangle with +100 mm padding.
 */

// ----------------- Types & helpers -----------------
interface Pt { x: number; y: number }
const EPS = 1e-9;

function rotate(p: Pt, deg: number, pivot: Pt): Pt {
  const th = (deg * Math.PI) / 180;
  const s = Math.sin(th), c = Math.cos(th);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + c * dx - s * dy, y: pivot.y + s * dx + c * dy };
}

function translate(points: Pt[], dx: number, dy: number): Pt[] {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

function bbox(points: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function trapezoidByWidth(leftLen: number, rightLen: number, sheetWidth: number, leftStartOffset: number): Pt[] {
  // Right side reference at x = 0 from y = 0 (bottom) to y = rightLen (top).
  // Left side at x = -sheetWidth, shifted by leftStartOffset along the sides direction (vertical).
  return [
    { x: -sheetWidth, y: leftStartOffset },
    { x: -sheetWidth, y: leftStartOffset + leftLen },
    { x: 0, y: rightLen },
    { x: 0, y: 0 }
  ];
}

function closeLoop(poly: Pt[]): Pt[] { return [...poly, poly[0]]; }

// Lowest y >= 0 where vertical line x intersects polygon
function maxIntersectionYForX(poly: Pt[], x: number): number | null {
  const edges = closeLoop(poly);
  const candidates: number[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;

    if (Math.abs(dx) < EPS) {
      if (Math.abs(x - a.x) < 1e-6) {
        const yTop = Math.max(a.y, b.y);
        if (yTop >= 0) candidates.push(yTop);
      }
      continue;
    }

    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    if (x < minX - EPS || x > maxX + EPS) continue;

    const t = (x - a.x) / dx;
    if (t < -EPS || t > 1 + EPS) continue;
    const y = a.y + t * dy;
    if (y >= -EPS) candidates.push(Math.max(0, y));
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function sampleMaxYOverInterval(poly: Pt[], x0: number, x1: number): { y: number | null, xAt: number | null } {
  const width = Math.max(0, x1 - x0);
  const steps = Math.max(6, Math.ceil(width / 1));
  let bestY: number | null = null; let bestX: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (width * i) / steps;
    const y = maxIntersectionYForX(poly, x);
    if (y != null) {
      if (bestY == null || y > bestY) { bestY = y; bestX = x; }
    }
  }
  return { y: bestY, xAt: bestX };
}

// ----------------- Component -----------------
export default function SheetBendVisualizer() {
  // Sheet params (mm)
  const [leftLen, setLeftLen] = useState(350);
  const [rightLen, setRightLen] = useState(300);
  const [sheetWidth, setSheetWidth] = useState(260); // width of sheet (normal to sides)
  const [leftStartOffset, setLeftStartOffset] = useState(0); // vertical offset of left side start from right side start // horizontal distance between left & right sides

  // Bend: translate along right side then rotate about pivot (right side of rectangle ∩ bending line)
  const [angleDeg, setAngleDeg] = useState(-12);
  const [feedAlongRight, setFeedAlongRight] = useState(40);

  // Stops: shared width, user-provided center positions
  const [stopWidth, setStopWidth] = useState(40);
  const [centersCsv, setCentersCsv] = useState("260, 320, 380, 440, 500");

  // View (screen) transform: x' = x * zoom + panX,  y' = -y * zoom + panY
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number, sy: number, px: number, py: number } | null>(null);

  const centers = useMemo(() => centersCsv
    .split(/[;,\s]+/)
    .map(s => Number(s))
    .filter(n => Number.isFinite(n))
    .slice(0, 16), [centersCsv]);

  const basePoly = trapezoidByWidth(leftLen, rightLen, sheetWidth, leftStartOffset);
  const moved = translate(basePoly, 0, -feedAlongRight);
  const pivot: Pt = { x: 0, y: 0 };
  const sheetPoly = moved.map(p => rotate(p, angleDeg, pivot));

  // Stop rectangles from centers
  const stopRects = centers.map((cx) => {
    const x0 = cx - stopWidth / 2;
    const x1 = cx + stopWidth / 2;
    const { y, xAt } = sampleMaxYOverInterval(sheetPoly, x0, x1);
    return { center: cx, x0, x1, width: stopWidth, height: y ?? 0, touchX: xAt ?? cx };
  });

  // Scene bounds (mm) include sheet, stops, and bending line y=0
  const sheetBB = bbox(sheetPoly);
  const stopsPts: Pt[] = stopRects.flatMap(r => [{ x: r.x0, y: 0 }, { x: r.x1, y: r.height }]);
  const rawBB = bbox([
    ...sheetPoly,
    ...stopsPts,
    { x: sheetBB.minX, y: 0 }, { x: sheetBB.maxX, y: 0 }
  ]);
  const pad = 100; // mm
  const border = {
    minX: rawBB.minX - pad,
    maxX: rawBB.maxX + pad,
    minY: Math.min(rawBB.minY, 0) - pad,
    maxY: Math.max(rawBB.maxY, 0) + pad
  };
  const borderW = border.maxX - border.minX;
  const borderH = border.maxY - border.minY;

  // Fit to border rectangle (memoized so effect deps stay minimal)
  const fitToScene = useCallback(() => {
    const svg = svgRef.current; if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const s = 0.92 * Math.min(width / Math.max(1, borderW), height / Math.max(1, borderH));
    const panX = (width - s * borderW) / 2 - s * border.minX;
    const panY = (height - s * borderH) / 2 + s * border.maxY; // y flips in world-to-screen
    setZoom(s);
    setPan({ x: panX, y: panY });
  }, [border.minX, border.maxY, borderW, borderH]);

  // Auto-fit when geometry changes (those changes will update border values triggering new callback identity)
  useEffect(() => { fitToScene(); }, [fitToScene]);

  function screenToWorld(clientX: number, clientY: number): Pt {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = - (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }

  // Wheel zoom around cursor
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current; if (!svg) return;
    const { clientX, clientY, deltaY } = e;
    const pivotW = screenToWorld(clientX, clientY);

    const factor = Math.pow(1.0015, -deltaY);
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor));

    const panX = clientX - svg.getBoundingClientRect().left - pivotW.x * newZoom;
    const panY = clientY - svg.getBoundingClientRect().top + pivotW.y * newZoom; // y flip

    setZoom(newZoom);
    setPan({ x: panX, y: panY });
  }

  // Drag to pan
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    setDrag({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drag) return;
    setPan({ x: drag.px + (e.clientX - drag.sx), y: drag.py + (e.clientY - drag.sy) });
  }
  function onMouseUp() { setDrag(null); }
  function onMouseLeave() { setDrag(null); }

  // Sheet path (world coords, y negated in commands)
  const sheetPath = `M ${sheetPoly[0].x},${-sheetPoly[0].y} L ${sheetPoly[1].x},${-sheetPoly[1].y} L ${sheetPoly[2].x},${-sheetPoly[2].y} L ${sheetPoly[3].x},${-sheetPoly[3].y} Z`;

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-4 p-4">
      <div className="xl:col-span-1 space-y-4">
        <div className="p-4 rounded-2xl shadow bg-white text-black">
          <h2 className="text-xl font-semibold mb-3 text-black">Sheet geometry (mm)</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-black">Left side length
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={leftLen}
                     onChange={e => setLeftLen(Number(e.target.value))} />
            </label>
            <label className="text-sm text-black">Right side length
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={rightLen}
                     onChange={e => setRightLen(Number(e.target.value))} />
            </label>
            <label className="text-sm col-span-2 text-black">Sheet width (normal to sides)
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={sheetWidth}
                     onChange={e => setSheetWidth(Number(e.target.value))} />
            </label>
            <label className="text-sm col-span-2 text-black">Left start offset from right side (along sides)
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={leftStartOffset}
                     onChange={e => setLeftStartOffset(Number(e.target.value))} />
            </label>
          </div>
        </div>

        <div className="p-4 rounded-2xl shadow bg-white text-black">
          <h2 className="text-xl font-semibold mb-3 text-black">Bend setup</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-black">Angle (deg)
              <input type="number" step={0.1} className="mt-1 w-full border rounded px-2 py-1 text-black" value={angleDeg}
                     onChange={e => setAngleDeg(Number(e.target.value))} />
            </label>
            <label className="text-sm text-black">Forward along right side (mm)
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={feedAlongRight}
                     onChange={e => setFeedAlongRight(Number(e.target.value))} />
            </label>
            <div className="col-span-2 text-xs text-black">Bending line is horizontal at y=0. The sheet is translated so the point on the right edge at this distance lies on the line, then rotated around the intersection of the rectangle&#39;s right edge and the bending line.</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl shadow bg-white text-black">
          <h2 className="text-xl font-semibold mb-3 text-black">Stop points</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-black">Width (mm)
              <input type="number" className="mt-1 w-full border rounded px-2 py-1 text-black" value={stopWidth} min={1}
                     onChange={e => setStopWidth(Number(e.target.value))} />
            </label>
            <label className="text-sm col-span-2 text-black">Center positions (mm, 2–16; comma/space separated)
              <input type="text" className="mt-1 w-full border rounded px-2 py-1 text-black" value={centersCsv}
                     onChange={e => setCentersCsv(e.target.value)} />
            </label>
            <div className="col-span-2 text-xs text-black">Each rectangle is centered at the given X, axis-aligned, and pushed upward until its bottom touches the sheet polygon at the lowest contact point across its width.</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl shadow bg-white flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl shadow bg-gray-900 text-white" onClick={fitToScene}>Fit to scene</button>
          <div className="text-xs text-black">Wheel = zoom, drag = pan.</div>
        </div>
      </div>

      <div className="xl:col-span-2 p-4 rounded-2xl shadow bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-black">Stops: {centers.length} | Width: {stopWidth} mm</div>
          <div className="text-sm text-black">Scene border: {borderW.toFixed(0)} × {borderH.toFixed(0)} mm (+100 mm padding)</div>
        </div>

        <svg ref={svgRef} width="100%" height="640" className="border rounded-2xl bg-white cursor-grab"
             onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}>
          {/* Apply transform to world space (we negate y in the path commands) */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom}, ${zoom})`}>

            {/* Border rectangle (scene bounds) */}
            <rect x={border.minX} y={-border.maxY} width={borderW} height={borderH}
                  fill="none" stroke="#C7CCD1" strokeDasharray="6 4" strokeWidth={0.8} />

            {/* Center position vertical dashed lines (extend across border rectangle) */}
            {centers.map((cx, i) => (
              <line key={`cx-${i}`} x1={cx} y1={-border.maxY} x2={cx} y2={-border.minY}
                    stroke="#888" strokeWidth={0.8} strokeDasharray="4 3" />
            ))}

            {/* Sheet polygon (light gray) */}
            <path d={sheetPath} fill="#ECEFF1" stroke="#111" strokeWidth={0.9} />

            {/* Stop rectangles and labels */}
            {stopRects.map((r, i) => (
              <g key={`stop-${i}`}>
                <rect x={r.x0} y={-r.height} width={r.width} height={r.height}
                      fill="#ff3b30" fillOpacity={0.85} stroke="#a00" strokeWidth={0.5} />
                <line x1={r.touchX} y1={0} x2={r.touchX} y2={-r.height} stroke="#a00" strokeWidth={0.4} strokeDasharray="2 2" />
                <text x={r.center} y={-r.height - 6} textAnchor="middle" fontSize={8} fill="#000">{r.height.toFixed(1)} mm</text>
              </g>
            ))}

            {/* Bending line ON TOP; spanning border horizontally */}
            <line x1={border.minX} y1={0} x2={border.maxX} y2={0} stroke="#5B6BF0" strokeWidth={1.4} />

          </g>
        </svg>

        <div className="text-xs text-black mt-2">
          Notes:
          <ul className="list-disc ml-5">
            <li>Center guide lines and the bending line extend to the scene border rectangle with +100&nbsp;mm padding.</li>
            <li>Use the <em>Fit to scene</em> button anytime to reframe everything.</li>
            <li>Wheel to zoom around cursor, drag to pan.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
