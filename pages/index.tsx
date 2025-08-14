import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// defaults 1k, 2k, …, 16k
const defaultPositions = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) * 1000);

function computeRectangles(positions: number[], width: number, minGap: number) {
  const rectangles: { start: number; end: number; pair: [number, number] }[] = [];
  let prevEnd = -Infinity;

  for (let i = 0; i + 1 < positions.length; i += 2) {
    const a = Math.min(positions[i], positions[i + 1]);
    const b = Math.max(positions[i], positions[i + 1]);
    const startMin = b - width;
    const startMax = a;
    if (startMin > startMax) continue; // cannot cover both

    // LEFT-to-RIGHT: pick leftmost feasible start that avoids overlap
    const start = Math.max(startMin, prevEnd + minGap);
    if (start > startMax) continue;

    const end = start + width;
    rectangles.push({ start, end, pair: [i + 1, i + 2] });
    prevEnd = end;
  }
  return rectangles;
}

const nice = (x: number) => Math.round(x * 100) / 100;

function Plot({
  positions,
  rects,
  width
}: {
  positions: number[];
  rects: { start: number; end: number; pair: [number, number] }[];
  width: number;
}) {
  const margin = 40;
  const maxX = Math.max(0, ...positions) + width * 0.6;
  const minX = 0;
  const W = 1000;
  const H = 260;
  const scaleX = (x: number) => ((x - minX) / Math.max(maxX - minX, 1)) * (W - margin * 2) + margin;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 280, background: "white", borderRadius: 16 }}>
      <line x1={margin} y1={H - margin} x2={W - margin} y2={H - margin} stroke="#111" />
      {positions.map((x, i) => (
        <g key={i}>
          <line x1={scaleX(x)} y1={30} x2={scaleX(x)} y2={H - margin} strokeDasharray="6 6" stroke="rgb(37,99,235)" strokeWidth={2} />
          <text x={scaleX(x)} y={20} textAnchor="middle" fontSize={10} fill="#111">
            {`P${i + 1} (${nice(x)})`}
          </text>
        </g>
      ))}
      {rects.map((r, i) => (
        <g key={i}>
          <rect
            x={scaleX(r.start)}
            y={40}
            width={Math.max(1, scaleX(r.end) - scaleX(r.start))}
            height={H - margin - 60}
            fill="rgba(251,146,60,0.35)"
            stroke="rgba(251,146,60,1)"
          />
          <text x={(scaleX(r.start) + scaleX(r.end)) / 2} y={H / 2} textAnchor="middle" fontSize={12} fill="#111">
            {`R${i + 1} [${r.pair[0]},${r.pair[1]}]`}
          </text>
        </g>
      ))}
      {Array.from({ length: 11 }).map((_, idx) => {
        const x = minX + (idx / 10) * Math.max(maxX - minX, 1);
        return (
          <g key={idx}>
            <line x1={scaleX(x)} y1={H - margin} x2={scaleX(x)} y2={H - margin + 6} stroke="#111" />
            <text x={scaleX(x)} y={H - margin + 18} textAnchor="middle" fontSize={10}>{nice(x)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function IndexPage() {
  const [count, setCount] = useState(8); // 1..16
  const [positions, setPositions] = useState<number[]>(defaultPositions(16));
  const [width, setWidth] = useState(1500);
  const [minGap, setMinGap] = useState(0);

  const activePositions = useMemo(() => positions.slice(0, count), [positions, count]);
  const rects = useMemo(() => computeRectangles(activePositions, width, minGap), [activePositions, width, minGap]);

  const clampCount = (n: number) => Math.max(1, Math.min(16, Math.round(n)));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Mounting Rectangles Visualizer</h1>
      <p className="text-sm text-muted-foreground">
        Configurable 1–16 positions. Defaults are P1=1000, …, P16=16000. Rectangles are left-to-right, width fixed, non-overlapping.
      </p>

      <Card className="rounded-2xl">
        <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <div className="font-medium mb-2">Number of mounting positions</div>
            <input type="range" min={1} max={16} value={count} onChange={(e) => setCount(clampCount(parseInt(e.target.value)))} className="w-full" />
            <div className="text-sm mt-1">{count}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button variant="secondary" onClick={() => { setPositions(defaultPositions(16)); setCount(16); }}>Reset to defaults (16)</Button>
              <Button onClick={() => setCount(8)}>Use first 8</Button>
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Rectangle width</div>
            <input type="range" min={200} max={4000} value={width} onChange={(e) => setWidth(parseInt(e.target.value))} className="w-full" />
            <div className="text-sm mt-1">{width} units</div>
          </div>

          <div>
            <div className="font-medium mb-2">Minimal gap</div>
            <input type="range" min={0} max={1000} value={minGap} onChange={(e) => setMinGap(parseInt(e.target.value))} className="w-full" />
            <div className="text-sm mt-1">{minGap} units</div>
          </div>

          <div>
            <div className="font-medium mb-2">Other</div>
            <div className="flex gap-2">
              <Button onClick={() => setPositions(p => [...p].sort((a, b) => a - b))}>Sort positions</Button>
              <Button variant="outline" onClick={() => setPositions(defaultPositions(16))}>Default positions</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activePositions.map((val, idx) => (
            <div key={idx} className="p-3 rounded-xl border">
              <div className="text-sm font-medium mb-2">Position P{idx + 1}</div>
              <input
                type="range"
                min={0}
                max={20000}
                step={1}
                value={val}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPositions((prev) => prev.map((p, i) => (i === idx ? v : p)));
                }}
                className="w-full"
              />
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value || "0");
                    setPositions((prev) => prev.map((p, i) => (i === idx ? v : p)));
                  }}
                />
                <Button variant="outline" onClick={() => setPositions((prev) => prev.map((p, i) => (i === idx ? defaultPositions(16)[idx] : p)))}>
                  Default
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Plot positions={activePositions} rects={rects} width={width} />
      <p className="text-xs text-muted-foreground">
        A rectangle of width W covers two positions a ≤ b iff b − a ≤ W. Feasible start range is [b − W, a]. We choose the leftmost start ≥ previousEnd+gap.
      </p>
    </div>
  );
}