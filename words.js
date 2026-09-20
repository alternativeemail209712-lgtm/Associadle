// words.js
// The puzzle bank for "Category Connect Live".
// Each puzzle has a title and a list of categories. Each category has a
// hidden name (revealed only when solved, or via a host hint) and exactly
// 4 words. Colors are assigned automatically by category position.
//
// To add your own puzzle: copy one of the blocks below, keep every word
// UNIQUE within that puzzle, and add it to the PUZZLES array.

export const CATEGORY_COLORS = [
  "#f5c518", // 1st group - yellow
  "#2ecc71", // 2nd group - green
  "#3aa0ff", // 3rd group - blue
  "#b06bff", // 4th group - purple
  "#ff9a3c", // 5th group - orange (larger puzzles only)
  "#fe2c55"  // 6th group - pink (larger puzzles only)
];

const PUZZLES = [
  {
    title: "General Knowledge",
    categories: [
      { name: "FAMOUS SCIENTISTS", words: ["NEWTON", "TESLA", "DARWIN", "EINSTEIN"] },
      { name: "US STATES", words: ["TEXAS", "FLORIDA", "ALASKA", "ARIZONA"] },
      { name: "COUNTRIES", words: ["BRAZIL", "CANADA", "JAPAN", "EGYPT"] },
      { name: "MAKEUP ITEMS", words: ["LIPSTICK", "MASCARA", "BLUSH", "FOUNDATION"] }
    ]
  },
  {
    title: "Time & Seasons",
    categories: [
      { name: "MONTHS", words: ["MARCH", "APRIL", "JUNE", "DECEMBER"] },
      { name: "TIME OFF", words: ["HOLIDAY", "WEEKEND", "VACATION", "BREAK"] },
      { name: "SEASONS", words: ["SUMMER", "WINTER", "AUTUMN", "SPRING"] },
      { name: "UNITS OF TIME", words: ["HOUR", "MINUTE", "SECOND", "MOMENT"] }
    ]
  },
  {
    title: "Sports World",
    categories: [
      { name: "SPORTS ORGANIZATIONS", words: ["FIFA", "NBA", "NHL", "UEFA"] },
      { name: "OCCUPATIONS", words: ["LAWYER", "PILOT", "PLUMBER", "DOCTOR"] },
      { name: "COMEDY TYPES", words: ["PARODY", "SATIRE", "CLOWN", "SITCOM"] },
      { name: "ART FORMS", words: ["PAINTING", "MOSAIC", "SCULPTURE", "POTTERY"] }
    ]
  },
  {
    title: "Sweet & Formal",
    categories: [
      { name: "DESSERTS", words: ["CUPCAKE", "COOKIE", "BROWNIE", "DOUGHNUT"] },
      { name: "BAKING TERMS", words: ["OVEN", "FLOUR", "YEAST", "WHISK"] },
      { name: "MILITARY RANKS", words: ["SERGEANT", "COLONEL", "GENERAL", "MAJOR"] },
      { name: "PHOTOGRAPHY WORDS", words: ["CAMERA", "LENS", "FILTER", "SHUTTER"] }
    ]
  },
  {
    title: "Health & Garden",
    categories: [
      { name: "HOSPITAL WORDS", words: ["SYRINGE", "PATIENT", "SURGERY", "NURSE"] },
      { name: "PRICKLY THINGS", words: ["CACTUS", "THISTLE", "HEDGEHOG", "PORCUPINE"] },
      { name: "PET ANIMALS", words: ["CATS", "DOGS", "RABBITS", "HAMSTERS"] },
      { name: "FARM CROPS", words: ["WHEAT", "BARLEY", "COTTON", "CORN"] }
    ]
  },
  {
    title: "Around the House",
    categories: [
      { name: "KITCHEN APPLIANCES", words: ["BLENDER", "TOASTER", "KETTLE", "MICROWAVE"] },
      { name: "FURNITURE", words: ["SOFA", "TABLE", "DRESSER", "OTTOMAN"] },
      { name: "CLEANING TOOLS", words: ["MOP", "BROOM", "SPONGE", "VACUUM"] },
      { name: "BEVERAGES", words: ["COFFEE", "TEA", "JUICE", "SODA"] }
    ]
  },
  {
    title: "Space & Sky",
    categories: [
      { name: "PLANETS", words: ["MARS", "VENUS", "SATURN", "JUPITER"] },
      { name: "SKY PHENOMENA", words: ["RAINBOW", "AURORA", "ECLIPSE", "COMET"] },
      { name: "BIRDS", words: ["EAGLE", "SPARROW", "FALCON", "ROBIN"] },
      { name: "WEATHER WORDS", words: ["THUNDER", "DRIZZLE", "BLIZZARD", "BREEZE"] }
    ]
  },
  {
    title: "Money & Business",
    categories: [
      { name: "CURRENCIES", words: ["DOLLAR", "EURO", "YEN", "PESO"] },
      { name: "BUSINESS ROLES", words: ["MANAGER", "INTERN", "FOUNDER", "CLIENT"] },
      { name: "SHOPPING WORDS", words: ["DISCOUNT", "COUPON", "RECEIPT", "CHECKOUT"] },
      { name: "BANK TERMS", words: ["DEPOSIT", "LOAN", "INTEREST", "ACCOUNT"] }
    ]
  },
  {
    title: "Movies & Music",
    categories: [
      { name: "FILM GENRES", words: ["COMEDY", "THRILLER", "DRAMA", "HORROR"] },
      { name: "MUSIC GENRES", words: ["ROCK", "JAZZ", "REGGAE", "TECHNO"] },
      { name: "INSTRUMENTS", words: ["VIOLIN", "DRUMS", "FLUTE", "TRUMPET"] },
      { name: "AWARD SHOWS", words: ["OSCARS", "GRAMMYS", "EMMYS", "TONYS"] }
    ]
  },
  {
    title: "Food Around the World",
    categories: [
      { name: "ITALIAN FOOD", words: ["PIZZA", "PASTA", "RISOTTO", "GELATO"] },
      { name: "MEXICAN FOOD", words: ["TACO", "BURRITO", "SALSA", "NACHOS"] },
      { name: "JAPANESE FOOD", words: ["SUSHI", "RAMEN", "TEMPURA", "MISO"] },
      { name: "FRUITS", words: ["MANGO", "PAPAYA", "LYCHEE", "GUAVA"] }
    ]
  },
  {
    title: "Mega Mix I",
    categories: [
      { name: "US STATES", words: ["TEXAS", "FLORIDA", "ALASKA", "ARIZONA"] },
      { name: "FAMOUS SCIENTISTS", words: ["NEWTON", "TESLA", "DARWIN", "EINSTEIN"] },
      { name: "COUNTRIES", words: ["BRAZIL", "CANADA", "JAPAN", "EGYPT"] },
      { name: "MONTHS", words: ["MARCH", "APRIL", "JUNE", "DECEMBER"] },
      { name: "SPORTS ORGANIZATIONS", words: ["FIFA", "NBA", "NHL", "UEFA"] },
      { name: "DESSERTS", words: ["CUPCAKE", "COOKIE", "BROWNIE", "DOUGHNUT"] }
    ]
  },
  {
    title: "Mega Mix II",
    categories: [
      { name: "PLANETS", words: ["MARS", "VENUS", "SATURN", "JUPITER"] },
      { name: "BIRDS", words: ["EAGLE", "SPARROW", "FALCON", "ROBIN"] },
      { name: "CURRENCIES", words: ["DOLLAR", "EURO", "YEN", "PESO"] },
      { name: "FILM GENRES", words: ["COMEDY", "THRILLER", "DRAMA", "HORROR"] },
      { name: "ITALIAN FOOD", words: ["PIZZA", "PASTA", "RISOTTO", "GELATO"] },
      { name: "KITCHEN APPLIANCES", words: ["BLENDER", "TOASTER", "KETTLE", "MICROWAVE"] }
    ]
  }
];

// Attach colors + a stable id to every puzzle once, at load time.
PUZZLES.forEach((p, i) => {
  p.id = i;
  p.categories.forEach((cat, ci) => {
    cat.color = CATEGORY_COLORS[ci % CATEGORY_COLORS.length];
  });
});

export function getAllPuzzleSummaries() {
  return PUZZLES.map(p => ({ id: p.id, title: p.title, groups: p.categories.length, words: p.categories.length * 4 }));
}

export function getPuzzleById(id) {
  return PUZZLES.find(p => p.id === Number(id)) || null;
}

export function getRandomPuzzle(excludeId) {
  const pool = PUZZLES.filter(p => p.id !== excludeId);
  const list = pool.length ? pool : PUZZLES;
  return list[Math.floor(Math.random() * list.length)];
}
