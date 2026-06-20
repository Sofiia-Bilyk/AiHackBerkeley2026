import { Egg, Soup, Languages, Music, Drum, Palette, Users, Sparkles } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  craft: Palette,
  cooking: Soup,
  language: Languages,
  music: Music,
  dance: Drum,
  history: Sparkles,
  meetup: Users,
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Decorative gradient tile keyed by the event seed + category icon. */
export function EventArt({
  seed,
  category,
  className,
  size = 22,
}: {
  seed: string;
  category: string;
  className?: string;
  size?: number;
}) {
  const h = hash(seed + category);
  const a = h % 360;
  const b = (a + 40 + (h % 60)) % 360;
  const Icon = category === "craft" && seed.includes("pysanky") ? Egg : ICONS[category] ?? Sparkles;
  return (
    <div
      className={`flex items-center justify-center text-white ${className ?? ""}`}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${b} 60% 40%))` }}
    >
      <Icon size={size} className="opacity-90" />
    </div>
  );
}
