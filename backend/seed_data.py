"""Seed data for Samrat Glass Emporium - Fancy lights & chandeliers."""
from datetime import datetime, timezone
import uuid

SAMPLE_PRODUCTS = [
    {
        "name": "Aashna Grand Crystal Chandelier",
        "sku": "SGE-CH-001",
        "category": "Chandeliers",
        "price": 48500,
        "compare_at_price": 62000,
        "currency": "INR",
        "short_description": "8-tier hand-cut crystal chandelier with 24 candelabra points.",
        "description": "A statement piece hand-assembled in Firozabad. Featuring premium K9 crystal droplets, gold-plated frame, and 24 warm-white candelabra sockets (E14). Ideal for double-height living rooms and grand foyers. Includes ceiling mount and 3ft chain.",
        "images": [
            "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15",
            "https://images.unsplash.com/photo-1543198126-a4b52a3a8bda"
        ],
        "tags": ["crystal", "chandelier", "living-room", "premium"],
        "specs": {"Bulb Type": "E14 Candelabra x 24", "Material": "K9 Crystal + Gold-plated steel", "Diameter": "90 cm", "Drop": "120 cm", "Wattage": "40W max per socket"},
        "stock": 4,
        "featured": True,
        "rating": 4.9,
        "review_count": 28
    },
    {
        "name": "Rajwada Antique Brass Pendant",
        "sku": "SGE-PD-002",
        "category": "Pendant Lights",
        "price": 8900,
        "compare_at_price": 11500,
        "currency": "INR",
        "short_description": "Traditional Rajasthani-inspired brass pendant with etched glass shade.",
        "description": "Hand-etched glass shade set in a warm antique-brass cradle. Casts a beautifully filigreed shadow. Perfect over dining tables or entryways.",
        "images": [
            "https://images.unsplash.com/photo-1524634126442-357e0eac3c14",
            "https://images.unsplash.com/photo-1565891741441-64926e441838"
        ],
        "tags": ["brass", "pendant", "traditional", "dining"],
        "specs": {"Bulb Type": "E27 (bulb not included)", "Material": "Solid brass + hand-etched glass", "Diameter": "28 cm", "Height": "40 cm"},
        "stock": 18,
        "featured": True,
        "rating": 4.7,
        "review_count": 42
    },
    {
        "name": "Meera Floral Wall Sconce (Pair)",
        "sku": "SGE-WL-003",
        "category": "Wall Lights",
        "price": 4200,
        "compare_at_price": None,
        "currency": "INR",
        "short_description": "Frosted glass petal sconce in champagne-gold finish. Sold as a pair.",
        "description": "Sculpted frosted-glass petals radiate a soft ambient glow. Comes as a matched pair with mounting hardware included.",
        "images": [
            "https://images.unsplash.com/photo-1519710164239-da123dc03ef4",
            "https://images.unsplash.com/photo-1567113463300-102a7eb3cb26"
        ],
        "tags": ["wall-light", "sconce", "pair", "bedroom"],
        "specs": {"Bulb Type": "G9 LED x 2 (included)", "Material": "Frosted glass + brass", "Width": "22 cm", "Projection": "14 cm"},
        "stock": 24,
        "featured": True,
        "rating": 4.6,
        "review_count": 19
    },
    {
        "name": "Nakshatra LED Ring Chandelier",
        "sku": "SGE-CH-004",
        "category": "Chandeliers",
        "price": 32900,
        "compare_at_price": 39900,
        "currency": "INR",
        "short_description": "Modern 3-ring LED chandelier with adjustable warm/cool light.",
        "description": "A contemporary showstopper — three concentric rings finished in matte-gold with dimmable tri-color LED (3000K/4500K/6000K). Ideal for modern homes and duplexes.",
        "images": [
            "https://images.unsplash.com/photo-1587049016823-c90a1a2df325",
            "https://images.unsplash.com/photo-1631679706909-1844bbd07221"
        ],
        "tags": ["led", "modern", "chandelier", "dimmable"],
        "specs": {"Light Source": "Built-in LED (dimmable)", "Wattage": "120W", "Color Temp": "3000K/4500K/6000K", "Diameter": "80 cm"},
        "stock": 7,
        "featured": True,
        "rating": 4.8,
        "review_count": 34
    },
    {
        "name": "Saanjh Amber Glass Table Lamp",
        "sku": "SGE-TL-005",
        "category": "Table Lamps",
        "price": 3450,
        "compare_at_price": None,
        "currency": "INR",
        "short_description": "Hand-blown amber glass base with linen shade.",
        "description": "The amber base glows warmly when lit. Hand-blown in Firozabad and finished with a natural linen shade.",
        "images": [
            "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",
            "https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9"
        ],
        "tags": ["table-lamp", "amber", "bedside"],
        "specs": {"Bulb Type": "E27 (not included)", "Material": "Hand-blown glass + linen", "Height": "42 cm", "Shade Diameter": "28 cm"},
        "stock": 32,
        "featured": False,
        "rating": 4.5,
        "review_count": 26
    },
    {
        "name": "Kalash Floor Lamp",
        "sku": "SGE-FL-006",
        "category": "Floor Lamps",
        "price": 6890,
        "compare_at_price": 8200,
        "currency": "INR",
        "short_description": "Slender brass floor lamp with fluted glass diffuser.",
        "description": "A minimalist floor lamp with a fluted glass diffuser that scatters light beautifully. Foot-switch on cord.",
        "images": [
            "https://images.unsplash.com/photo-1540932239986-30128078f3c5",
            "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"
        ],
        "tags": ["floor-lamp", "brass", "reading"],
        "specs": {"Bulb Type": "E27 (not included)", "Material": "Brass + fluted glass", "Height": "150 cm", "Base Diameter": "25 cm"},
        "stock": 12,
        "featured": False,
        "rating": 4.4,
        "review_count": 11
    },
    {
        "name": "Rasleela Crystal Cluster Pendant",
        "sku": "SGE-PD-007",
        "category": "Pendant Lights",
        "price": 18900,
        "compare_at_price": None,
        "currency": "INR",
        "short_description": "Cluster of 9 hand-blown crystal orbs on a matte-black canopy.",
        "description": "A dramatic cluster of nine crystal orbs suspended at varied lengths. Best displayed in a stairwell or over a large dining table.",
        "images": [
            "https://images.unsplash.com/photo-1524634126442-357e0eac3c14",
            "https://images.unsplash.com/photo-1543198126-a4b52a3a8bda"
        ],
        "tags": ["crystal", "cluster", "modern", "stairwell"],
        "specs": {"Bulb Type": "G9 LED x 9 (included)", "Material": "Hand-blown crystal + steel", "Canopy": "50 cm", "Drop": "up to 180 cm"},
        "stock": 6,
        "featured": True,
        "rating": 4.9,
        "review_count": 15
    },
    {
        "name": "Diya Flush Ceiling Lamp",
        "sku": "SGE-CL-008",
        "category": "Ceiling Lamps",
        "price": 5200,
        "compare_at_price": 6500,
        "currency": "INR",
        "short_description": "Flush-mount ceiling lamp with textured glass diffuser.",
        "description": "A classic flush-mount finished in champagne-gold with a hand-textured glass diffuser. Ideal for corridors and bedrooms.",
        "images": [
            "https://images.unsplash.com/photo-1565891741441-64926e441838",
            "https://images.unsplash.com/photo-1519710164239-da123dc03ef4"
        ],
        "tags": ["ceiling", "flush-mount", "corridor"],
        "specs": {"Bulb Type": "E27 x 3 (not included)", "Material": "Textured glass + metal", "Diameter": "45 cm", "Height": "18 cm"},
        "stock": 22,
        "featured": False,
        "rating": 4.5,
        "review_count": 9
    },
    {
        "name": "Utsav Warm-White Fairy Curtain",
        "sku": "SGE-DC-009",
        "category": "Decorative Lights",
        "price": 1290,
        "compare_at_price": 1600,
        "currency": "INR",
        "short_description": "3m x 3m LED curtain — 300 warm-white bulbs, 8 modes.",
        "description": "Weddings, festivals, or festive interiors. Copper-wire construction with an 8-mode controller (steady, fade, twinkle, wave, etc). IP44 rated for balcony use.",
        "images": [
            "https://images.unsplash.com/photo-1543198126-a4b52a3a8bda",
            "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0"
        ],
        "tags": ["fairy-lights", "festival", "wedding", "decor"],
        "specs": {"Bulbs": "300 warm-white LED", "Dimensions": "3m x 3m", "Modes": "8", "Cable": "Copper wire (transparent)"},
        "stock": 60,
        "featured": True,
        "rating": 4.7,
        "review_count": 88
    },
    {
        "name": "Anant Antique Hanging Lantern",
        "sku": "SGE-DC-010",
        "category": "Decorative Lights",
        "price": 2450,
        "compare_at_price": None,
        "currency": "INR",
        "short_description": "Moroccan-style pierced-metal lantern with amber glass panels.",
        "description": "Casts intricate shadows across walls and ceilings. Beautiful in balconies, pooja rooms, and covered patios.",
        "images": [
            "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0",
            "https://images.unsplash.com/photo-1524634126442-357e0eac3c14"
        ],
        "tags": ["lantern", "moroccan", "amber", "balcony"],
        "specs": {"Bulb Type": "E14 (not included)", "Material": "Pierced steel + amber glass", "Height": "35 cm", "Diameter": "20 cm"},
        "stock": 20,
        "featured": False,
        "rating": 4.6,
        "review_count": 14
    },
    {
        "name": "Panchvati 5-Light Cluster Sputnik",
        "sku": "SGE-CH-011",
        "category": "Chandeliers",
        "price": 14500,
        "compare_at_price": 17800,
        "currency": "INR",
        "short_description": "Mid-century sputnik with 5 smoked-glass globes.",
        "description": "A mid-century inspired sputnik finished in aged brass with hand-blown smoked glass globes. Statement piece for compact dining spaces.",
        "images": [
            "https://images.unsplash.com/photo-1631679706909-1844bbd07221",
            "https://images.unsplash.com/photo-1587049016823-c90a1a2df325"
        ],
        "tags": ["sputnik", "brass", "mid-century"],
        "specs": {"Bulb Type": "E27 x 5 (not included)", "Material": "Aged brass + smoked glass", "Diameter": "60 cm"},
        "stock": 9,
        "featured": False,
        "rating": 4.7,
        "review_count": 22
    },
    {
        "name": "Chaandani Bedside Table Lamp (Pair)",
        "sku": "SGE-TL-012",
        "category": "Table Lamps",
        "price": 3990,
        "compare_at_price": 4800,
        "currency": "INR",
        "short_description": "Ribbed clear-glass base with off-white pleated shade. Set of 2.",
        "description": "A matched pair of ribbed clear-glass table lamps with pleated off-white shades. Elegantly symmetrical for the master bedroom.",
        "images": [
            "https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9",
            "https://images.unsplash.com/photo-1507473885765-e6ed057f782c"
        ],
        "tags": ["table-lamp", "pair", "bedside"],
        "specs": {"Bulb Type": "E27 (not included)", "Material": "Ribbed glass + fabric shade", "Height": "45 cm", "Shade Diameter": "30 cm"},
        "stock": 15,
        "featured": False,
        "rating": 4.6,
        "review_count": 18
    }
]


def build_seed_docs():
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "id": str(uuid.uuid4()),
            **p,
            "created_at": now,
            "updated_at": now,
        }
        for p in SAMPLE_PRODUCTS
    ]
