import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RefreshCw } from "lucide-react";

// ---------- Math utilities ----------
function multiply2x2(
  a11: number, a12: number, a21: number, a22: number,
  b11: number, b12: number, b21: number, b22: number
) {
  // (A * B)
  return [
    a11 * b11 + a12 * b21, a11 * b12 + a12 * b22,
    a21 * b11 + a22 * b21, a21 * b12 + a22 * b22,
  ] as const;
}

function multiplyMatrixVector(a: number, b: number, c: number, d: number, x: number, y: number) {
  return [a * x + b * y, c * x + d * y] as const;
}

function makeGridPoints(extent: number) {
  const points: Array<[number, number]> = [];
  for (let x = -extent; x <= extent; x++) {
    for (let y = -extent; y <= extent; y++) {
      points.push([x, y]);
    }
  }
  return points;
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

type EigenResult =
  | { complex: true; real: number; imag: number }
  | { complex: false; lambdas: readonly [number, number]; v1: readonly [number, number]; v2: readonly [number, number] };

function eigen2x2(a: number, b: number, c: number, d: number): EigenResult {
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  if (discriminant < 0) {
    return { complex: true as const, real: trace / 2, imag: Math.sqrt(-discriminant) / 2 };
  }
  const root = Math.sqrt(discriminant);
  const lambda1 = (trace + root) / 2;
  const lambda2 = (trace - root) / 2;
  const v1 = Math.abs(b) > Math.abs(c) ? ([b, lambda1 - a] as const) : ([lambda1 - d, c] as const);
  const v2 = Math.abs(b) > Math.abs(c) ? ([b, lambda2 - a] as const) : ([lambda2 - d, c] as const);
  const n1 = Math.hypot(v1[0], v1[1]) || 1;
  const n2 = Math.hypot(v2[0], v2[1]) || 1;
  return { complex: false as const, lambdas: [lambda1, lambda2] as const, v1: [v1[0] / n1, v1[1] / n1] as const, v2: [v2[0] / n2, v2[1] / n2] as const };
}

function nearlyEqual(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

// Expose hue mapping for tests
function hueForPoint(x: number, y: number) {
  if (x === 0 && y === 0) return 0;
  const angle = Math.atan2(y, x); // [-π, π]
  const deg = (angle * 180) / Math.PI; // [-180, 180]
  const hue = (deg + 360) % 360; // [0, 360)
  return hue;
}

// ---------- Canvas constants ----------
const WIDTH = 720;
const HEIGHT = 720;

export default function MatrixVisualizer() {
  // ----- Parameters controlled by sliders -----
  const [translationX, setTranslationX] = useState(0);
  const [translationY, setTranslationY] = useState(0);
  const [skewX, setSkewX] = useState(0); // x' = x + skewX * y
  const [skewY, setSkewY] = useState(0); // y' = y + skewY * x
  const [rotationDeg, setRotationDeg] = useState(0);

  // View settings
  const [extent, setExtent] = useState(5);
  const [scale, setScale] = useState(50);
  const [showVectors, setShowVectors] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Build the 2x2 matrix from sliders.
  // Order of operations (right-to-left on vectors):
  // 1) SkewY(ky)   S_y = [[1, 0], [ky, 1]]
  // 2) SkewX(kx)   S_x = [[1, kx], [0, 1]]
  // 3) Rotation(θ) R   = [[cosθ, -sinθ], [sinθ, cosθ]]
  const { matrixA, matrixB, matrixC, matrixD } = useMemo(() => {
    const ky = skewY;
    const kx = skewX;
    const theta = degToRad(rotationDeg);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    // Compose: M = R * Sx * Sy
    const sx = [1, kx, 0, 1] as const;
    const sy = [1, 0, ky, 1] as const;
    const r = [cos, -sin, sin, cos] as const;

    const sxy = multiply2x2(sx[0], sx[1], sx[2], sx[3], sy[0], sy[1], sy[2], sy[3]);
    const m = multiply2x2(r[0], r[1], r[2], r[3], sxy[0], sxy[1], sxy[2], sxy[3]);

    return { matrixA: m[0], matrixB: m[1], matrixC: m[2], matrixD: m[3] };
  }, [skewX, skewY, rotationDeg]);

  const determinant = useMemo(() => matrixA * matrixD - matrixB * matrixC, [matrixA, matrixB, matrixC, matrixD]);

  // Eigenvalues / vectors of the linear part
  const eigen = useMemo(() => eigen2x2(matrixA, matrixB, matrixC, matrixD), [matrixA, matrixB, matrixC, matrixD]);

  // Points and transformed points
  const points = useMemo(() => makeGridPoints(extent), [extent]);

  const transformed = useMemo(() =>
    points.map(([x, y]) => {
      const [X, Y] = multiplyMatrixVector(matrixA, matrixB, matrixC, matrixD, x, y);
      return [X + translationX, Y + translationY] as const;
    }),
  [points, matrixA, matrixB, matrixC, matrixD, translationX, translationY]);

  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;

  // Grid drawing helpers
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const maxPix = Math.max(WIDTH, HEIGHT);
    const maxUnits = Math.ceil(maxPix / scale);
    for (let i = -maxUnits; i <= maxUnits; i++) {
      const x = centerX + i * scale;
      const y = centerY + i * scale;
      lines.push(<line key={`v-${i}`} x1={x} y1={0} x2={x} y2={HEIGHT} className="stroke-gray-200" strokeWidth={1} />);
      lines.push(<line key={`h-${i}`} x1={0} y1={y} x2={WIDTH} y2={y} className="stroke-gray-200" strokeWidth={1} />);
    }
    return lines;
  }, [scale, centerX, centerY]);

  const axes = (
    <g>
      <line x1={0} y1={centerY} x2={WIDTH} y2={centerY} className="stroke-black" strokeWidth={1.5} />
      <line x1={centerX} y1={0} x2={centerX} y2={HEIGHT} className="stroke-black" strokeWidth={1.5} />
    </g>
  );

  // ---------- Diagnostics (inline tests) ----------
  const diagnostics = useMemo(() => {
    const results: { name: string; pass: boolean; details?: string }[] = [];

    // 1) multiply2x2 identity test
    const I = [1, 0, 0, 1] as const;
    const B = [2, 3, 5, 7] as const;
    const IB = multiply2x2(I[0], I[1], I[2], I[3], B[0], B[1], B[2], B[3]);
    results.push({
      name: "A*I = A",
      pass: nearlyEqual(IB[0], B[0]) && nearlyEqual(IB[1], B[1]) && nearlyEqual(IB[2], B[2]) && nearlyEqual(IB[3], B[3]),
    });

    // 2) Rotation by +90° acting on (1,0) → (0,1)
    const theta = Math.PI / 2;
    const r = [Math.cos(theta), -Math.sin(theta), Math.sin(theta), Math.cos(theta)] as const;
    const v = multiplyMatrixVector(r[0], r[1], r[2], r[3], 1, 0);
    results.push({ name: "R(90°)·(1,0) → (0,1)", pass: nearlyEqual(v[0], 0) && nearlyEqual(v[1], 1) });

    // 3) Hue mapping sanity checks
    results.push({ name: "hue(1,0) ≈ 0°", pass: Math.abs(hueForPoint(1, 0) - 0) < 1e-6 });
    results.push({ name: "hue(0,1) ≈ 90°", pass: Math.abs(hueForPoint(0, 1) - 90) < 1e-6 });
    results.push({ name: "hue(-1,0) ≈ 180°", pass: Math.abs(hueForPoint(-1, 0) - 180) < 1e-6 });
    results.push({ name: "hue(0,-1) ≈ 270°", pass: Math.abs(hueForPoint(0, -1) - 270) < 1e-6 });

    // 4) Eigen for rotation 90° → complex ±i
  const eR = eigen2x2(r[0], r[1], r[2], r[3]);
  results.push({ name: "eig(R90) is complex", pass: eR.complex === true });

    // 5) Eigen for diag(2,3) → real 2,3
    const S = [2, 0, 0, 3] as const;
    const eS = eigen2x2(S[0], S[1], S[2], S[3]);
    if (eS.complex) {
      results.push({ name: "eig(diag(2,3)) real", pass: false, details: "returned complex" });
    } else {
      const lambdas = eS.lambdas;
      const set = new Set(lambdas.map((x) => Math.round(x * 1000) / 1000));
      const ok = set.has(2) && set.has(3);
      results.push({ name: "eig(diag(2,3)) = {2,3}", pass: ok });
    }

    return results;
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Affine Visualizer: Rotation ∘ SkewX ∘ SkewY + Translation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="space-y-6">
              <div>
                <Label className="text-sm">Translation X: {translationX.toFixed(2)}</Label>
                <Slider value={[translationX]} min={-10} max={10} step={0.1} onValueChange={(v) => setTranslationX(v[0])} />
              </div>
              <div>
                <Label className="text-sm">Translation Y: {translationY.toFixed(2)}</Label>
                <Slider value={[translationY]} min={-10} max={10} step={0.1} onValueChange={(v) => setTranslationY(v[0])} />
              </div>
              <div>
                <Label className="text-sm">Skew X (x += k·y): {skewX.toFixed(3)}</Label>
                <Slider value={[skewX]} min={-2} max={2} step={0.01} onValueChange={(v) => setSkewX(v[0])} />
              </div>
              <div>
                <Label className="text-sm">Skew Y (y += k·x): {skewY.toFixed(3)}</Label>
                <Slider value={[skewY]} min={-2} max={2} step={0.01} onValueChange={(v) => setSkewY(v[0])} />
              </div>
              <div>
                <Label className="text-sm">Rotation (°): {rotationDeg.toFixed(1)}</Label>
                <Slider value={[rotationDeg]} min={-180} max={180} step={0.1} onValueChange={(v) => setRotationDeg(v[0])} />
              </div>

              <div className="space-y-4 pt-2">
                <div className="text-xs text-muted-foreground">Order: vectors are transformed by <strong>SkewY</strong>, then <strong>SkewX</strong>, then <strong>Rotation</strong>, then translated.</div>
                <div className="flex items-center gap-2">
                  <input id="vectors" type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
                  <Label htmlFor="vectors">Show displacement vectors</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="diag" type="checkbox" checked={showDiagnostics} onChange={(e) => setShowDiagnostics(e.target.checked)} />
                  <Label htmlFor="diag">Show diagnostics</Label>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => { setTranslationX(0); setTranslationY(0); setSkewX(0); setSkewY(0); setRotationDeg(0); setExtent(5); setScale(50); setShowVectors(false); setShowDiagnostics(false); }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4"/> Reset
                </Button>
              </div>

              <div className="pt-2 text-sm space-y-1">
                <div>determinant = {determinant.toFixed(3)}</div>
                {eigen.complex ? (
                  <div>eigenvalues: {eigen.real.toFixed(3)} ± {eigen.imag.toFixed(3)}i</div>
                ) : (
                  <div>eigenvalues: {eigen.lambdas[0].toFixed(3)}, {eigen.lambdas[1].toFixed(3)}</div>
                )}
              </div>
            </div>

            {/* View Settings */}
            <div className="space-y-6">
              <div>
                <Label className="text-sm">Grid extent (−N … N): {extent}</Label>
                <Slider value={[extent]} min={1} max={12} step={1} onValueChange={(v) => setExtent(v[0])} />
              </div>
              <div>
                <Label className="text-sm">Scale (px / unit): {scale}</Label>
                <Slider value={[scale]} min={20} max={100} step={1} onValueChange={(v) => setScale(v[0])} />
              </div>

              {/* Matrix preview (read-only) */}
              <div>
                <Label className="text-sm">Resulting 2×2 matrix (read‑only)</Label>
                <div className="inline-grid grid-cols-2 gap-2 p-3 rounded-xl border bg-muted/30 text-sm w-fit select-none">
                  <div>[{matrixA.toFixed(3)}]</div>
                  <div>[{matrixB.toFixed(3)}]</div>
                  <div>[{matrixC.toFixed(3)}]</div>
                  <div>[{matrixD.toFixed(3)}]</div>
                </div>
                <div className="text-xs text-muted-foreground">Applied as (x&apos;, y&apos;) = M·(x, y) + (tₓ, tᵧ).</div>
              </div>

              {showDiagnostics && (
                <div className="text-xs bg-white rounded-xl border p-3 shadow-sm">
                  <div className="font-medium mb-2">Diagnostics</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {diagnostics.map((t, i) => (
                      <li key={i} className={t.pass ? "text-green-700" : "text-red-700"}>
                        {t.pass ? "✔" : "✘"} {t.name}{t.details ? ` — ${t.details}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="text-sm text-muted-foreground">
              <div className="bg-white rounded-xl border p-3 shadow-sm">
                <div>Original points = high saturation • Transformed points = same hue, lower saturation.</div>
                <div>Eigenvectors (if real) are drawn as highlighted lines through the origin.</div>
              </div>
            </div>
          </div>

          {/* SVG Stage */}
          <div className="mt-2 w-full overflow-auto rounded-2xl border bg-white">
            <svg width={WIDTH} height={HEIGHT} className="block">
              <g>{gridLines}</g>
              {axes}

              {/* Original lattice points + transformed points with hue from original angle */}
              <g>
                {points.map(([x, y], idx) => {
                  const screenX = centerX + x * scale;
                  const screenY = centerY - y * scale;
                  const hue = hueForPoint(x, y);
                  const originalColor = `hsl(${hue}, 85%, 45%)`;

                  const [txp, typ] = transformed[idx];
                  const screenXt = centerX + txp * scale;
                  const screenYt = centerY - typ * scale;
                  const transformedColor = `hsl(${hue}, 40%, 55%)`;

                  return (
                    <g key={`pt-${idx}`}>
                      {showVectors && (
                        <line x1={screenX} y1={screenY} x2={screenXt} y2={screenYt} className="stroke-black" strokeWidth={0.8} opacity={0.3} />
                      )}
                      <circle cx={screenX} cy={screenY} r={3} style={{ fill: originalColor }} />
                      <circle cx={screenXt} cy={screenYt} r={3} style={{ fill: transformedColor }} />
                    </g>
                  );
                })}
              </g>

              {/* Eigenvectors (if real) */}
              {!eigen.complex && (
                <g>
                  {(() => {
                    const L = Math.max(WIDTH, HEIGHT) / scale;
                    const [vx1, vy1] = eigen.v1;
                    const [vx2, vy2] = eigen.v2;
                    const lambdas = eigen.lambdas;

                    const drawEigen = (vx: number, vy: number, label: string, key: string): React.ReactElement | null => {
                      if (!Number.isFinite(vx) || !Number.isFinite(vy)) return null;
                      const x1 = centerX - vx * L * scale;
                      const y1 = centerY + vy * L * scale;
                      const x2 = centerX + vx * L * scale;
                      const y2 = centerY - vy * L * scale;
                      return (
                        <g key={key}>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-purple-600" strokeWidth={2} />
                          <text x={centerX + vx * (L * scale * 0.55)} y={centerY - vy * (L * scale * 0.55)} fontSize={12} className="fill-purple-700 select-none">{label}</text>
                        </g>
                      );
                    };

                    const elems: React.ReactNode[] = [];
                    if (lambdas && lambdas.length === 2) {
                      const e1 = drawEigen(vx1, vy1, `λ₁=${lambdas[0].toFixed(3)}`, "e1");
                      if (e1) elems.push(e1);
                      const e2 = drawEigen(vx2, vy2, `λ₂=${lambdas[1].toFixed(3)}`, "e2");
                      if (e2) elems.push(e2);
                    }
                    return elems;
                  })()}
                </g>
              )}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Tips panel with solid background to avoid bleed-through */}
      <div className="text-sm bg-white rounded-xl border p-4 shadow-sm">
        <div className="font-medium mb-1">Tips</div>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Use different grid extents and scales to see global behavior. Hue = angle from +x axis.</li>
          <li>Extreme skews can cause large deformations; determinant indicates area scaling and orientation flip if negative.</li>
          <li>Eigenvectors (if real) show invariant directions of the linear part; translation does not affect them.</li>
        </ul>
      </div>
    </div>
  );
}
