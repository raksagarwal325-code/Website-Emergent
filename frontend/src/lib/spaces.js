export const SHOP_BY_SPACE = [
  {
    slug: "living-room",
    label: "Living Room",
    description: "Statement chandeliers, hanging lights and wall lights for formal and everyday living spaces.",
    query: "living room",
  },
  {
    slug: "dining-room",
    label: "Dining Room",
    description: "Decorative lighting for dining tables, dining rooms and intimate entertaining spaces.",
    query: "dining",
  },
  {
    slug: "double-height-staircase",
    label: "Double-Height & Staircase",
    description: "Large-format chandeliers and cascading lighting for tall voids, staircases and double-height spaces.",
    query: "double height",
  },
  {
    slug: "foyer-entrance",
    label: "Foyer & Entrance",
    description: "Decorative focal lighting for entrances, foyers and arrival spaces.",
    query: "foyer",
  },
  {
    slug: "bedroom",
    label: "Bedroom",
    description: "Softer chandeliers, hanging lights, wall lights and lamps for bedrooms and private spaces.",
    query: "bedroom",
  },
  {
    slug: "hotel-hospitality",
    label: "Hotel & Hospitality",
    description: "Decorative lighting for hotel lobbies, suites, hospitality interiors and bespoke projects.",
    query: "hotel",
  },
  {
    slug: "restaurant",
    label: "Restaurant",
    description: "Atmospheric chandeliers, pendants and wall lights for restaurants and dining venues.",
    query: "restaurant",
  },
  {
    slug: "retail-showroom",
    label: "Retail & Showroom",
    description: "Statement lighting for showrooms, boutiques, retail interiors and display environments.",
    query: "showroom",
  },
  {
    slug: "banquet-event-space",
    label: "Banquet & Event Space",
    description: "Large decorative chandeliers and custom lighting for banquet halls and event spaces.",
    query: "banquet",
  },
];

export const spaceCatalogHref = (space) => `/catalog?q=${encodeURIComponent(space.query)}`;
