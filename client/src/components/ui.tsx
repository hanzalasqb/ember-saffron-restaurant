import { Flame, LoaderCircle, Wheat } from "lucide-react";
import { useState } from "react";
import type { Dish } from "../lib/types";
import { img } from "../lib/util";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) { return <LoaderCircle className={`animate-spin ${className}`} />; }

export function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`bg-gradient-to-br from-ash to-coal ${className}`} />;
  return <img src={img(src)} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

const TAG_STYLE: Record<string, string> = { vegan: "bg-emerald-500/15 text-emerald-300", vegetarian: "bg-lime-500/15 text-lime-300", "gluten-free": "bg-sky-500/15 text-sky-300", "chef-special": "bg-saffron-400/15 text-saffron-300", halal: "bg-white/5 text-cream/60" };
export function DietTags({ dish }: { dish: Dish }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dish.tags.filter((t) => t !== "spicy").map((t) => <span key={t} className={`chip ${TAG_STYLE[t] ?? "bg-white/5"}`}>{t === "gluten-free" && <Wheat className="h-3 w-3" />}{t.replace("-", " ")}</span>)}
      {dish.spice > 0 && <span className="chip bg-ember-500/15 text-ember-500">{Array.from({ length: dish.spice }, (_, i) => <Flame key={i} className="h-3 w-3" />)}</span>}
    </div>
  );
}
