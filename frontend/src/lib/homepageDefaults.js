// Homepage content defaults — used as fallback when settings.homepage_content
// lacks a key. Any value can be overridden from Admin → Homepage Editor.
export const HOMEPAGE_DEFAULTS = {
  hero: {
    eyebrow: "Since 1981 · Handcrafted in Firozabad",
    headline_line1: "Fancy lights that",
    headline_line2: "turn houses into homes.",
    description:
      "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps & decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.",
    primary_cta_text: "Explore Catalog",
    primary_cta_link: "/catalog",
    secondary_cta_text: "Chat on WhatsApp",
    secondary_cta_link: "",
    trust: [
      { value: "1981", label: "Founded" },
      { value: "1000+", label: "Designs" },
      { value: "Pan-India", label: "Delivery" },
    ],
  },
  collage: {
    eyebrow: "The Full Range",
    title: "1000+ Light Options",
    highlight: "Inside",
    subtitle: "Handcrafted decorative lighting from Firozabad",
    description:
      "Explore chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, and custom decorative lighting designs crafted by experienced artisans.",
    stats: [
      { value: "1000+", label: "Designs" },
      { value: "40+", label: "Years Experience" },
      { value: "Pan-India", label: "Delivery" },
      { value: "Custom", label: "Lighting Available" },
    ],
    primary_cta_text: "Explore Catalog",
    primary_cta_link: "/catalog",
    secondary_cta_text: "Send WhatsApp Inquiry",
    secondary_cta_link: "",
  },
  featured: {
    eyebrow: "Featured",
    title: "Pieces of the season",
    view_all_text: "View all",
    view_all_link: "/catalog",
    limit: 8,
  },
  google_reviews_fallback: {
    fallback_rating: "",
    fallback_total: "",
    write_review_override: "",
  },
  reasons: {
    eyebrow: "Why choose us",
    heading: "Reasons Why We Are Better",
    items: [
      { title: "40+ Years of Experience", body: "Since 1981, our craft has been refined across four decades of continuous production." },
      { title: "Skilled Master Craftsmen", body: "A trusted team of professionals and traditional artisans working side-by-side." },
      { title: "Handcrafted, Traditionally", body: "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques." },
      { title: "Full Lighting Range", body: "Chandeliers, wall lights, table lamps, hanging lights, sconces & floor lamps." },
      { title: "Custom Designs on Demand", body: "Bespoke sizes, finishes and configurations tailored to your project." },
      { title: "Trusted Across India", body: "Thousands of homes, hotels, restaurants and showrooms lit by Samrat." },
      { title: "Quality & Timely Delivery", body: "Rigorous finishing checks and disciplined production timelines." },
      { title: "Made in Firozabad", body: "Based in the City of Glass — India's spiritual home of glass-making." },
    ],
  },
  atelier: {
    eyebrow: "The Atelier",
    headline: "Where glass is a family heirloom.",
    paragraph:
      "For more than 40 years, our craftsmen in Firozabad have shaped glass into decorative lighting that brings warmth, beauty, and character into Indian homes, hotels, showrooms, and luxury interiors. From traditional jhoomars to crystal chandeliers and handcrafted glass lamps, every piece reflects quiet craft and careful finishing.",
    cta_text: "Discover the collection",
    cta_link: "/catalog",
    images: [
      { src: "/atelier-1.png", caption: "Chandelier Pendant" },
      { src: "/atelier-2.png", caption: "Crystal Hurricane" },
      { src: "/atelier-3.png", caption: "Triple-Arm Candelabra" },
      { src: "/atelier-4.png", caption: "Grand Tiered Chandelier" },
      { src: "/atelier-5.png", caption: "Cascade Crystal Rain" },
    ],
  },
  footer: {
    description:
      "Fancy lights, crystal chandeliers, glass lamps & decorative lighting — handcrafted in the city of glass, Firozabad.",
    quick_links: [
      { label: "Catalog", href: "/catalog" },
      { label: "About Us", href: "/about" },
      { label: "Wishlist", href: "/favorites" },
      { label: "Inquiry Basket", href: "/cart" },
    ],
  },
};

// Merges saved homepage_content over defaults (deep merge one level for objects, replaces arrays wholly)
export function mergeHomepage(saved = {}) {
  const out = {};
  for (const k of Object.keys(HOMEPAGE_DEFAULTS)) {
    const d = HOMEPAGE_DEFAULTS[k];
    const s = saved?.[k];
    if (!s || typeof s !== "object") {
      out[k] = d;
      continue;
    }
    if (Array.isArray(d)) {
      out[k] = Array.isArray(s) && s.length ? s : d;
    } else {
      out[k] = { ...d, ...s };
    }
  }
  return out;
}
