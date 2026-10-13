"use client";

/**
 * Fallback visuel pour navigateurs sans WebGL (ou si Three.js crash).
 * Montre un visuel statique avec les icônes des appareils qu'on recycle.
 */
export function HeroDevicesFallback() {
  const devices = [
    { emoji: "💻", label: "Portables" },
    { emoji: "📱", label: "Téléphones" },
    { emoji: "🖥️", label: "Tours & serveurs" },
    { emoji: "📺", label: "Écrans" }
  ];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="relative flex h-48 w-48 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald/15 blur-2xl" />
        <div className="relative text-7xl">♻️</div>
      </div>
      <div className="grid max-w-md grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {devices.map((d) => (
          <div
            key={d.label}
            className="rounded-2xl border border-line/60 bg-paper/70 p-3 backdrop-blur-sm"
          >
            <div className="text-2xl">{d.emoji}</div>
            <div className="mt-1 text-xs font-semibold text-moss">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
