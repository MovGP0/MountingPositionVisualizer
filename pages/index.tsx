import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Visualization Demos</h1>
        <p className="text-sm text-muted-foreground">Choose a demo below.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        <li className="rounded-xl border p-4 hover:shadow-sm transition-shadow bg-white/60">
          <h2 className="font-medium mb-1"><Link href="/rectangles_visualizer" className="hover:underline">Mounting Rectangles Visualizer</Link></h2>
          <p className="text-xs text-muted-foreground">Configure positions and compute non-overlapping rectangles.</p>
        </li>
        <li className="rounded-xl border p-4 hover:shadow-sm transition-shadow bg-white/60">
          <h2 className="font-medium mb-1"><Link href="/interactive_2_2_matrix_visualizer_grid_transform" className="hover:underline">2×2 Affine Transform Visualizer</Link></h2>
          <p className="text-xs text-muted-foreground">Interactively explore rotation, skew, translation, eigen data.</p>
        </li>
      </ul>
      <footer className="text-xs text-muted-foreground pt-4 border-t">
        New components can be added here as the project grows.
      </footer>
    </main>
  );
}