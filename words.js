// words.js
// The full word bank for Associadle Live, organized by word length (4 to 20).
// Each entry has a "word" (the secret answer) and "hints" (revealed one at a
// time, in order, from vague to obvious). Feel free to add more words to any
// list -- the game will pick a random one from the matching length each round.

export const WORDS_BY_LENGTH = {
  4: [
    { word: "FISH", hints: ["Lives in water", "Has fins and gills", "Common pet in a tank", "Ingredient in sushi", "Salmon and tuna are types"] },
    { word: "BIRD", hints: ["Has feathers", "Can often fly", "Builds nests", "Lays eggs", "Tweets and chirps"] },
    { word: "STAR", hints: ["Seen at night", "Made of burning gas", "Twinkles in the sky", "The sun is one", "Shape with five points"] },
    { word: "MOON", hints: ["Orbits the Earth", "Visible at night", "Controls the tides", "Has phases", "Astronauts walked on it"] },
    { word: "CAKE", hints: ["Baked dessert", "Has frosting", "Common at birthdays", "Sliced into pieces", "You blow out candles on it"] }
  ],
  5: [
    { word: "HOUSE", hints: ["A place to live", "Has a roof and doors", "Where a family stays", "Can be for sale", "Home sweet ___"] },
    { word: "PIZZA", hints: ["Italian food", "Round and sliced", "Has cheese and toppings", "Baked in an oven", "Pepperoni is a popular topping"] },
    { word: "BEACH", hints: ["Sandy shoreline", "Near the ocean", "Good for sunbathing", "Has waves", "You build sandcastles here"] },
    { word: "CLOUD", hints: ["Floats in the sky", "Made of water vapor", "Can bring rain", "Comes in cotton-like shapes", "White or gray and fluffy"] },
    { word: "TIGER", hints: ["Wild jungle cat", "Has orange and black stripes", "Apex predator", "Roars loudly", "Bigger cousin of a house cat"] }
  ],
  6: [
    { word: "PLANET", hints: ["Found in space", "Orbits a star", "Earth is one", "Has a solar system", "Mars and Jupiter are examples"] },
    { word: "GUITAR", hints: ["Musical instrument", "Has strings", "Played with a pick", "Common in rock bands", "Acoustic or electric version exists"] },
    { word: "DRAGON", hints: ["Mythical creature", "Breathes fire", "Has wings and scales", "Found in fantasy stories", "Guards treasure in legends"] },
    { word: "CASTLE", hints: ["Old stone building", "Has towers and a moat", "Home of a king", "Fortified structure", "Knights defend it"] },
    { word: "COFFEE", hints: ["Popular morning drink", "Contains caffeine", "Made from roasted beans", "Often served hot", "Espresso is a strong version"] }
  ],
  7: [
    { word: "REPTILE", hints: ["Cold-blooded animal", "Has scaly skin", "Lays eggs", "Snakes and lizards are types", "Includes crocodiles and turtles"] },
    { word: "AIRPORT", hints: ["Where planes take off", "Has runways and terminals", "You check in luggage here", "Security checkpoints are common", "Departures and arrivals board"] },
    { word: "PAINTER", hints: ["Creates art", "Uses a brush and canvas", "Works with colors", "Famous ones include Picasso", "Displays work in galleries"] },
    { word: "MONSTER", hints: ["Scary creature", "Common in horror movies", "Hides under the bed", "Found in fairy tales", "Frankenstein is one"] },
    { word: "JOURNEY", hints: ["A long trip", "Involves travel", "Often has a destination", "Can be an adventure", "Life is sometimes called this"] }
  ],
  8: [
    { word: "ELEPHANT", hints: ["Largest land animal", "Has a long trunk", "Big floppy ears", "Found in Africa or Asia", "Remembers things very well"] },
    { word: "MOUNTAIN", hints: ["Very tall landform", "People climb it", "Often has snow on top", "Higher than a hill", "Everest is the tallest one"] },
    { word: "DINOSAUR", hints: ["Prehistoric creature", "Now extinct", "Known from fossils", "Lived millions of years ago", "T-Rex is a famous one"] },
    { word: "BIRTHDAY", hints: ["Annual celebration", "Involves cake and candles", "Marks another year of life", "People sing a song for it", "You get presents on this day"] },
    { word: "SANDWICH", hints: ["Food with bread", "Has fillings inside", "Popular lunch item", "Deli specialty", "Can be grilled or cold"] }
  ],
  9: [
    { word: "BUTTERFLY", hints: ["Colorful flying insect", "Starts as a caterpillar", "Forms in a cocoon", "Has delicate wings", "Found fluttering in gardens"] },
    { word: "CHOCOLATE", hints: ["Sweet treat", "Made from cocoa", "Comes in dark or milk form", "Popular candy flavor", "Melts in your mouth"] },
    { word: "ADVENTURE", hints: ["An exciting journey", "Involves risk or discovery", "Often includes exploring", "Found in action movies", "Indiana Jones seeks this"] },
    { word: "AVALANCHE", hints: ["Sudden snow slide", "Happens on mountains", "Dangerous for skiers", "Sometimes triggered by loud noise", "Buries everything in its path"] }
  ],
  10: [
    { word: "BASKETBALL", hints: ["Sport with a hoop", "Players dribble the ball", "Court-based game", "NBA is a famous league", "You shoot to score points"] },
    { word: "STRAWBERRY", hints: ["Red fruit", "Has tiny seeds on the outside", "Popular in jam", "Grows on low plants", "Often paired with chocolate"] },
    { word: "SKYSCRAPER", hints: ["Very tall building", "Found in big cities", "Has many floors", "Reaches toward the clouds", "Elevators are essential here"] },
    { word: "WATERMELON", hints: ["Large summer fruit", "Green outside, red inside", "Full of juice", "Has black seeds", "Great for hot days"] },
    { word: "SKATEBOARD", hints: ["Board with wheels", "Used for tricks", "Popular at skate parks", "Ollie is a famous move", "Ridden while standing"] }
  ],
  11: [
    { word: "FIREFIGHTER", hints: ["Emergency responder", "Puts out flames", "Uses a hose and ladder", "Wears a helmet and suit", "Rescues people from buildings"] },
    { word: "CATERPILLAR", hints: ["Crawling insect larva", "Turns into a butterfly", "Eats leaves constantly", "Has many tiny legs", "Forms a cocoon eventually"] },
    { word: "GRASSHOPPER", hints: ["Green jumping insect", "Found in fields", "Makes a chirping sound", "Strong back legs", "Related to crickets"] }
  ],
  12: [
    { word: "THUNDERSTORM", hints: ["Weather event", "Has lightning and thunder", "Brings heavy rain", "Loud crashing sound in the sky", "Often happens in summer"] },
    { word: "REFRIGERATOR", hints: ["Kitchen appliance", "Keeps food cold", "Has a freezer section", "Runs constantly to stay chilled", "You store milk here"] },
    { word: "PHOTOGRAPHER", hints: ["Takes pictures", "Uses a camera", "Captures special moments", "Works with lighting and angles", "Shoots weddings or portraits"] }
  ],
  13: [
    { word: "ROLLERCOASTER", hints: ["Amusement park ride", "Has big loops and drops", "Goes very fast on tracks", "Thrilling and scary for some", "Found at theme parks"] },
    { word: "INTERNATIONAL", hints: ["Involves multiple countries", "Global in scope", "Opposite of domestic", "Airports often use this word", "Describes worldwide events"] },
    { word: "CONSTELLATION", hints: ["Pattern of stars", "Seen in the night sky", "Named after myths or animals", "Orion is a famous one", "Used for navigation long ago"] }
  ],
  14: [
    { word: "RESPONSIBILITY", hints: ["A duty you must fulfill", "Comes with being an adult", "Taking care of something important", "Being accountable for actions", "Parents have this for their kids"] },
    { word: "TRANSFORMATION", hints: ["A major change", "Like a caterpillar to a butterfly", "Complete makeover", "Metamorphosis is a synonym", "Seen in transformer robots"] }
  ],
  15: [
    { word: "INTERNATIONALLY", hints: ["Across many countries", "Globally recognized", "Worldwide in reach", "Beyond one nation's borders", "Describes something known everywhere"] },
    { word: "CONGRATULATIONS", hints: ["Word said after an achievement", "Expresses happy praise", "Said at graduations", "Often shouted at celebrations", "You say this after a win"] }
  ],
  16: [
    { word: "ENTREPRENEURSHIP", hints: ["Starting your own business", "Involves risk and innovation", "Being a startup founder", "Turning an idea into a company", "Shark Tank showcases this"] },
    { word: "MISUNDERSTANDING", hints: ["A mix-up in communication", "Leads to confusion or conflict", "Happens when words are unclear", "Often needs to be cleared up", "Can cause an argument"] }
  ],
  17: [
    { word: "TELECOMMUNICATION", hints: ["Long-distance communication", "Involves phones and signals", "Uses satellites or cables", "Connects people across distances", "Industry behind calls and the internet"] },
    { word: "MISINTERPRETATION", hints: ["Getting the wrong meaning", "A reading error", "Happens when context is missed", "Leads to confusion", "Opposite of understanding correctly"] }
  ],
  18: [
    { word: "INTERCONNECTEDNESS", hints: ["Being linked together", "Describes a global network", "Everything affects everything else", "Common theme in ecology", "The web of relationships between things"] }
  ],
  19: [
    { word: "INCOMPREHENSIBILITY", hints: ["The state of being impossible to understand", "Extremely confusing quality", "Opposite of clarity", "Describes very complex text", "When nothing makes sense at all"] }
  ],
  20: [
    { word: "INTERNATIONALIZATION", hints: ["Making something global", "Expanding a business worldwide", "Adapting for many countries", "Companies do this to grow globally", "Turning local into worldwide"] }
  ]
};

export function getRandomWordForLength(length) {
  const list = WORDS_BY_LENGTH[length];
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function getAvailableLengths() {
  return Object.keys(WORDS_BY_LENGTH)
    .map(Number)
    .sort((a, b) => a - b);
}
