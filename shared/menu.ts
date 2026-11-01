// Fictional restaurant used for the demo. Shared by the API seed and the browser demo.
export const RESTAURANT = {
  name: "Ember & Saffron",
  tagline: "Fire-kissed flavours, saffron soul.",
  address: "12 Harbour Lane, Riverside District",
  phone: "+1 (555) 014-2290",
  email: "hello@ember-saffron.example",
  // 0 = Sunday … 6 = Saturday, local restaurant time
  hours: { 0: ["12:00", "22:00"], 1: ["17:00", "22:30"], 2: ["17:00", "22:30"], 3: ["17:00", "22:30"], 4: ["17:00", "23:00"], 5: ["12:00", "23:30"], 6: ["12:00", "23:30"] } as Record<number, [string, string] | null>,
  taxRate: 0.08,
  deliveryFee: 4.99,
  freeDeliveryOver: 40,
};

export type Allergen = "dairy" | "gluten" | "nuts" | "egg" | "soy" | "shellfish" | "fish" | "sesame";
export type Diet = "vegetarian" | "vegan" | "gluten-free" | "spicy" | "chef-special" | "halal";
export interface MenuItemDef {
  slug: string; name: string; category: "starters" | "mains" | "desserts" | "drinks"; price: number; foodCost: number;
  description: string; tags: Diet[]; allergens: Allergen[]; calories: number; spice: 0 | 1 | 2 | 3; popular?: boolean; photo: string;
}
export const CATEGORIES = [
  { slug: "starters", name: "Starters" }, { slug: "mains", name: "Mains" }, { slug: "desserts", name: "Desserts" }, { slug: "drinks", name: "Drinks" },
] as const;

const i = (slug: string, name: string, category: MenuItemDef["category"], price: number, foodCost: number, description: string, tags: Diet[], allergens: Allergen[], calories: number, spice: MenuItemDef["spice"], photo: string, popular = false): MenuItemDef =>
  ({ slug, name, category, price, foodCost, description, tags, allergens, calories, spice, photo, popular });

export const MENU: MenuItemDef[] = [
  i("burrata-caprese", "Heirloom Caprese & Burrata", "starters", 14, 4.6, "Creamy burrata, heirloom tomatoes, basil oil and aged balsamic.", ["vegetarian", "gluten-free"], ["dairy"], 420, 0, "photo-1769458313937-b5ad8f84942e", true),
  i("crispy-calamari", "Crispy Calamari", "starters", 13, 3.9, "Lightly dusted squid, lemon aioli, smoked chilli dip and herb salt.", ["halal"], ["shellfish", "gluten", "egg"], 510, 1, "photo-1778600731531-7d836a32704c"),
  i("lamb-samosas", "Spiced Lamb Samosas", "starters", 11, 2.8, "Hand-folded pastry with cumin-spiced lamb, mint chutney and tamarind.", ["halal", "spicy"], ["gluten"], 460, 2, "photo-1601050690597-df0568f70950", true),
  i("wild-mushroom-soup", "Wild Mushroom Velouté", "starters", 9, 2.1, "Roasted wild mushrooms, oat cream, truffle oil and toasted sourdough crumbs.", ["vegan", "vegetarian"], ["gluten"], 290, 0, "photo-1619860859762-0569749bc607"),
  i("saffron-chicken-biryani", "Saffron Chicken Biryani", "mains", 22, 6.4, "Slow-cooked basmati layered with saffron, fried onions and tender chicken, served with raita.", ["halal", "spicy", "chef-special"], ["dairy"], 890, 2, "photo-1631515243349-e0cb75fb8d3a", true),
  i("wood-fired-margherita", "Wood-Fired Margherita", "mains", 18, 4.2, "San Marzano tomato, fior di latte, basil — blistered in our 450 °C oven.", ["vegetarian"], ["dairy", "gluten"], 820, 0, "photo-1513104890138-7c749659a591", true),
  i("ember-ribeye", "Ember-Grilled Ribeye", "mains", 38, 15.5, "300 g grass-fed ribeye over charcoal, chimichurri and smoked salt fries.", ["halal", "gluten-free", "chef-special"], [], 1150, 0, "photo-1588168333986-5078d3ae3976", true),
  i("charred-salmon", "Charred Miso Salmon", "mains", 29, 10.2, "Miso-glazed salmon, charred greens and ginger-sesame dressing.", ["gluten-free"], ["fish", "soy", "sesame"], 640, 0, "photo-1519708227418-c8fd9a32b7a2"),
  i("truffle-risotto", "Truffle Mushroom Risotto", "mains", 24, 5.9, "Carnaroli rice, porcini, parmesan and shaved black truffle.", ["vegetarian", "gluten-free"], ["dairy"], 760, 0, "photo-1476124369491-e7addf5db371"),
  i("smash-burger", "Double Smash Burger", "mains", 19, 5.1, "Two smashed beef patties, aged cheddar, pickles and ember sauce on a brioche bun.", ["halal"], ["dairy", "gluten", "egg", "sesame"], 1020, 1, "photo-1568901346375-23c9450c58cd", true),
  i("chicken-tikka-masala", "Chicken Tikka Masala", "mains", 21, 5.6, "Tandoor-charred chicken in a velvety tomato-fenugreek sauce, with garlic naan.", ["halal", "spicy"], ["dairy", "gluten", "nuts"], 930, 2, "photo-1772730064970-a7b2735c93b9"),
  i("falafel-mezze", "Falafel Mezze Plate", "mains", 17, 3.4, "Herb falafel, hummus, tabbouleh, pickles and warm flatbread.", ["vegan", "vegetarian", "halal"], ["gluten", "sesame"], 680, 1, "photo-1680990999782-ba7fe26e4d0b"),
  i("molten-chocolate-cake", "Molten Chocolate Cake", "desserts", 10, 2.2, "Warm dark-chocolate fondant with vanilla bean ice cream.", ["vegetarian"], ["dairy", "egg", "gluten"], 560, 0, "photo-1617305855058-336d24456869", true),
  i("classic-tiramisu", "Classic Tiramisu", "desserts", 9, 2.0, "Espresso-soaked savoiardi, mascarpone cream and cocoa.", ["vegetarian"], ["dairy", "egg", "gluten"], 480, 0, "photo-1785389593866-a6f454865756"),
  i("strawberry-panna-cotta", "Strawberry Panna Cotta", "desserts", 8, 1.7, "Vanilla panna cotta, macerated strawberries and pistachio crumb.", ["vegetarian", "gluten-free"], ["dairy", "nuts"], 390, 0, "photo-1488477181946-6428a0291777"),
  i("mint-lime-cooler", "Mint & Lime Cooler", "drinks", 6, 0.9, "Fresh lime, garden mint and sparkling water — alcohol-free.", ["vegan", "vegetarian", "gluten-free", "halal"], [], 120, 0, "photo-1653542772393-71ffa417b1c4", true),
  i("citrus-spritz", "Blood Orange Spritz", "drinks", 7, 1.2, "Blood orange, rosemary syrup and tonic — alcohol-free.", ["vegan", "vegetarian", "gluten-free", "halal"], [], 140, 0, "photo-1556804335-2fa563e93aae"),
  i("iced-spanish-latte", "Iced Spanish Latte", "drinks", 6, 1.1, "Double espresso, condensed milk and cold milk over ice.", ["vegetarian", "gluten-free", "halal"], ["dairy"], 210, 0, "photo-1461023058943-07fcbe16d735"),
];
export const AMBIENCE_PHOTOS = { hero: "photo-1517248135467-4c7edcad34c4", grill: "photo-1765036741158-5a1698974257" };
export const TABLES = [
  { id: 1, label: "T1", capacity: 2, zone: "Window" }, { id: 2, label: "T2", capacity: 2, zone: "Window" }, { id: 3, label: "T3", capacity: 2, zone: "Bar" },
  { id: 4, label: "T4", capacity: 4, zone: "Main hall" }, { id: 5, label: "T5", capacity: 4, zone: "Main hall" }, { id: 6, label: "T6", capacity: 4, zone: "Terrace" },
  { id: 7, label: "T7", capacity: 6, zone: "Main hall" }, { id: 8, label: "T8", capacity: 8, zone: "Private room" },
];
export const itemImage = (slug: string) => `images/menu/${slug}.jpg`;

export interface DietFilter { tags?: Diet[]; excludeAllergens?: Allergen[]; maxPrice?: number; category?: MenuItemDef["category"]; query?: string; mild?: boolean }

export function filterMenu<T extends Pick<MenuItemDef, "name" | "description" | "category" | "price" | "tags" | "allergens" | "spice">>(items: T[], f: DietFilter): T[] {
  const words = (f.query ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return items.filter((m) =>
    (!f.category || m.category === f.category) &&
    (f.maxPrice === undefined || m.price <= f.maxPrice) &&
    (f.tags ?? []).every((t) => m.tags.includes(t)) &&
    !(f.excludeAllergens ?? []).some((a) => m.allergens.includes(a)) &&
    (!f.mild || m.spice <= 1) &&
    (!words.length || words.some((w) => `${m.name} ${m.description}`.toLowerCase().includes(w))));
}

const ALLERGEN_WORDS: Record<Allergen, RegExp> = {
  dairy: /dairy|lactose|milk/, gluten: /gluten|celiac|coeliac|wheat/, nuts: /nut|peanut/, egg: /\begg/, soy: /\bsoy/, shellfish: /shellfish|seafood|prawn|shrimp/, fish: /\bfish/, sesame: /sesame/,
};

/** Parse dietary needs from natural language, e.g. "vegan, no nuts, under $20". */
export function parseDiet(text: string): DietFilter {
  const t = text.toLowerCase();
  const f: DietFilter = { tags: [], excludeAllergens: [] };
  if (/\bvegan\b/.test(t)) f.tags!.push("vegan");
  else if (/vegetarian|veggie|no meat/.test(t)) f.tags!.push("vegetarian");
  if (/gluten[- ]free|celiac|coeliac/.test(t)) f.tags!.push("gluten-free");
  if (/\bspicy|\bhot\b/.test(t) && !/not spicy|no spice|mild/.test(t)) f.tags!.push("spicy");
  if (/not spicy|no spice|mild|kids?/.test(t)) f.mild = true;
  for (const [a, re] of Object.entries(ALLERGEN_WORDS) as [Allergen, RegExp][]) {
    if (new RegExp(`(no|without|free of|allergic to|allergy|intoleran\\w*|avoid)[^.]{0,25}(${re.source})|(${re.source})[- ]free`).test(t)) f.excludeAllergens!.push(a);
  }
  const price = t.match(/(?:under|below|less than|max|up to)\s*\$?(\d+)/);
  if (price) f.maxPrice = +price[1];
  if (/starter|appetizer|appetiser|to share/.test(t)) f.category = "starters";
  else if (/dessert|sweet/.test(t)) f.category = "desserts";
  else if (/\bdrink|beverage|mocktail|coffee|refreshing/.test(t)) f.category = "drinks";
  else if (/\bmain|dinner|hungry|filling/.test(t)) f.category = "mains";
  return f;
}
