// Kasavana & Smith menu-engineering matrix: popularity (70% rule) vs weighted contribution margin.
export type Quadrant = "Star" | "Plowhorse" | "Puzzle" | "Dog";
export interface ItemSales { slug: string; name: string; price: number; foodCost: number; sold: number }
export interface Engineered extends ItemSales { margin: number; popularity: number; quadrant: Quadrant; action: string }

const ACTIONS: Record<Quadrant, string> = {
  Star: "Keep it prominent and protect quality and portion consistency.",
  Plowhorse: "Popular but low margin: re-engineer the recipe cost or raise the price slightly.",
  Puzzle: "Profitable but under-ordered: give it better menu placement and have staff recommend it.",
  Dog: "Low sales and margin: rework the dish or replace it.",
};

export function menuEngineering(items: ItemSales[]): { items: Engineered[]; popularityThreshold: number; averageMargin: number } {
  const totalSold = items.reduce((n, i) => n + i.sold, 0) || 1;
  const popularityThreshold = (1 / items.length) * 0.7; // share of total covers
  const averageMargin = items.reduce((n, i) => n + (i.price - i.foodCost) * i.sold, 0) / totalSold;
  return {
    popularityThreshold, averageMargin,
    items: items.map((i) => {
      const margin = i.price - i.foodCost, popularity = i.sold / totalSold;
      const quadrant: Quadrant = popularity >= popularityThreshold ? (margin >= averageMargin ? "Star" : "Plowhorse") : margin >= averageMargin ? "Puzzle" : "Dog";
      return { ...i, margin: Math.round(margin * 100) / 100, popularity, quadrant, action: ACTIONS[quadrant] };
    }),
  };
}

/** Plain-language recommendations from the matrix (used when no LLM key is configured and in the demo). */
export function insightsFromMatrix(matrix: ReturnType<typeof menuEngineering>): string[] {
  const by = (q: string) => matrix.items.filter((i) => i.quadrant === q).sort((a, b) => b.sold - a.sold);
  const [stars, plow, puzzles, dogs] = ["Star", "Plowhorse", "Puzzle", "Dog"].map(by);
  return [
    stars.length && `⭐ ${stars.map((s) => s.name).slice(0, 3).join(", ")} ${stars.length > 1 ? "are your stars" : "is your star"}: popular and profitable. Keep them prominent.`,
    plow.length && `🐴 ${plow[0].name} sells well but earns $${plow[0].margin} per plate. A $1–2 price increase or a cheaper garnish would add about $${Math.round(plow[0].sold * 1.5)} over the period.`,
    puzzles.length && `🧩 ${puzzles[0].name} has a strong margin ($${puzzles[0].margin}) but few orders. Move it to the top of its section and have servers recommend it.`,
    dogs.length && `🐶 ${dogs.map((d) => d.name).slice(0, 2).join(" and ")} underperform on both popularity and margin. Rework or replace them next menu cycle.`,
  ].filter(Boolean) as string[];
}
