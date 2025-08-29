import Link from "next/link";
import React, { useEffect, useRef } from "react";

export default function Home() {
  const listRef = useRef<HTMLUListElement | null>(null);

  // Track pointer for radial highlight inside each card
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    function handle(e: PointerEvent) {
      if (!listRef.current) return;
      const targets = listRef.current.querySelectorAll<HTMLElement>(".liquid-glass-card");
      targets.forEach(card => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        card.style.setProperty('--pointer-x', x + 'px');
        card.style.setProperty('--pointer-y', y + 'px');
      });
    }
    el.addEventListener('pointermove', handle);
    return () => { el.removeEventListener('pointermove', handle); };
  }, []);

  const items = [
    {
      href: '/rectangles_visualizer',
      title: 'Mounting Rectangles Visualizer',
      desc: 'Configure positions and compute non-overlapping rectangles.'
    },
    {
      href: '/interactive_2_2_matrix_visualizer_grid_transform',
      title: '2×2 Affine Transform Visualizer',
      desc: 'Interactively explore rotation, skew, translation, eigen data.'
    },
    {
      href: '/sheet_bend_visualizer_v_2_zoom_centers',
      title: 'Sheet Bend Visualizer (Zoom Centers)',
      desc: 'Visualize sheet bend rope paths with zoom center calculations.'
    }
  ];

  return (
    <main className="relative px-6 py-14 md:py-20 max-w-6xl mx-auto">
      <div className="absolute inset-0 -z-10 liquid-bg-gradient opacity-70" />
      <header className="mb-10 md:mb-14">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-neutral-900/90 via-neutral-800 to-neutral-600 dark:from-neutral-100 dark:via-neutral-200 dark:to-neutral-400">Visualization Demos</h1>
        <p className="mt-3 text-sm md:text-base text-neutral-700 dark:text-neutral-300 max-w-prose">Interactive geometry & transformation playgrounds with rich canvas / SVG rendering and parameter exploration.</p>
      </header>
      <ul ref={listRef} className="grid gap-6 md:gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.href} className="group">
            <Link href={item.href} className="block focus-visible:outline-none">
              {(() => {
                const t1 = i===1? 'rgba(255,120,60,0.35)': i===2? 'rgba(120,85,255,0.35)': 'rgba(88,146,255,0.35)';
                const tStrong = i===1? 'rgba(255,120,60,0.65)': i===2? 'rgba(120,85,255,0.55)': 'rgba(88,146,255,0.65)';
                const tBorder = i===1? 'rgba(255,120,60,0.55)': i===2? 'rgba(120,85,255,0.5)': 'rgba(88,146,255,0.55)';
                const styleVars = { '--tint': t1, '--tint-strong': tStrong, '--tint-border': tBorder } as Record<string, string>;
                const style: React.CSSProperties = styleVars as unknown as React.CSSProperties;
                return (
                  <div className="liquid-glass-card h-full" style={style}>
                    <div className="flex flex-col h-full">
                      <h2 className="font-semibold mb-1 text-[0.95rem] md:text-base tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:underline decoration-neutral-800/40 dark:decoration-neutral-100/30 underline-offset-4">{item.title}</h2>
                      <p className="text-[0.72rem] md:text-[0.7rem] text-neutral-800/90 dark:text-neutral-200/85 leading-snug flex-1 font-medium">{item.desc}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-neutral-900/80 dark:text-neutral-50/80 group-hover:text-neutral-900 dark:group-hover:text-neutral-50 transition-colors">Open ↗</span>
                    </div>
                  </div>
                );
              })()}
            </Link>
          </li>
        ))}
      </ul>
      <footer className="mt-14 text-xs text-neutral-600 dark:text-neutral-400 pt-6 border-t border-border/40 flex flex-col gap-2">
        <p>New components can be added here as the project grows.</p>
        <p className="opacity-75">Liquid glass styling demo — hover to see interactive highlight.</p>
      </footer>
    </main>
  );
}