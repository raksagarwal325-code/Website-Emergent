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
  trusted_by: {
    eyebrow: "Trusted by",
    tagline: "Homes, hotels & showrooms lit by Samrat.",
    items: [],
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
  manual_reviews: {
    items: [],
  },
  about: {
    eyebrow: "Est. Firozabad · Since 1981",
    title_pre: "About",
    title_highlight: "Samrat Glass Emporium",
    tagline: "The story of four generations of glass — and the craft that lights every corner of it.",
    story_paragraphs: [
      { text: "Established in 1981 in Firozabad, the City of Glass, Samrat Glass Emporium is a trusted manufacturer of handcrafted decorative lighting. We create a wide range of hanging chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, and customized decorative lighting solutions." },
      { text: "Light does more than illuminate a space — it shapes mood, personality, and atmosphere. With this vision, Samrat Glass Emporium was founded to bring elegant, handcrafted lighting into Indian homes, hotels, showrooms, restaurants, and luxury interiors." },
      { text: "Under the guidance of our founder, Mr. Sunil Kumar Agarwal, our craftsmen combine traditional glass-making techniques with modern design sensibilities. With more than 40 years of experience, we continue to create decorative lighting that blends artistry, quality, and sophistication." },
      { text: "Our aim is to provide Indian consumers with designer lighting products that help them transform ordinary spaces into beautiful, memorable interiors." },
    ],
    founder: {
      eyebrow: "Our Founder",
      name: "Mr. Sunil Kumar Agarwal",
      description: "Founded under the guidance of Mr. Sunil Kumar Agarwal, with over 40 years of experience in handcrafted decorative lighting — combining Firozabad's traditional glass artistry with contemporary Indian design sensibility.",
      initial: "S",
      image: "/founder-sunil.png",
      quote: "A great piece of glass is one you can live under for forty years without ever growing tired of it.",
      signature: "— Mr. Sunil Kumar Agarwal · Founder, Since 1981",
    },
    stats: [
      { value: "1981", label: "Founded" },
      { value: "40+", label: "Years Experience" },
      { value: "1000+", label: "Designs" },
      { value: "Pan-India", label: "Delivery" },
    ],
    cta_heading: "See the collection your space deserves.",
    cta_primary_text: "Explore Catalog",
    cta_primary_link: "/catalog",
    cta_secondary_text: "Get in touch",
    cta_secondary_link: "/contact",
  },
  craft: {
    eyebrow: "Firozabad · Since 1981",
    headline_pre: "The Craft",
    headline_highlight: "behind every piece.",
    intro:
      "Our craft is not just a story — it is visible in every cut, curve, fitting, and final glow. Watch how decorative glass lighting is shaped and finished by experienced hands in Firozabad.",
    items: [
      { num: "01", kicker: "The drawing", title: "Design",   body: "Each piece begins as a pencil sketch on the workshop table — proportions calibrated to a room, a chandelier drop measured against a ceiling. Nothing is designed to be mass-produced; every silhouette is drawn to be lived under.", visual: "" },
      { num: "02", kicker: "Molten glass · 1400°C", title: "The Furnace", body: "Master glass-blowers in Firozabad gather glass from the furnace on iron blowpipes and coax it into form through breath and rotation — the same technique this city has practiced for over four centuries.", visual: "" },
      { num: "03", kicker: "Facets by hand", title: "Cutting", body: "Once cooled, crystal panels are hand-cut on stone wheels to shape the signature diamond facets that catch light. It is slow, exacting work — the angle of each cut determines how the finished piece will glow.", visual: "" },
      { num: "04", kicker: "Brass, wire, patience", title: "Assembly", body: "Individual glass elements are strung and set into hand-worked brass frames — sometimes a single chandelier requires 400+ pieces threaded together. This step alone can take a week for a single fixture.", visual: "" },
      { num: "05", kicker: "Signed and inspected", title: "Finish", body: "Every finished piece is lit, inspected, and packed by hand in our atelier before dispatch. Bespoke commissions are also numbered and signed — a signature you'll only see on the underside of the mount.", visual: "" },
    ],
    closer_eyebrow: "A note from the atelier",
    founder_quote: "A great piece of glass is one you can live under for forty years without ever growing tired of it.",
    founder_credit: "— Mr. Sunil Kumar Agarwal, Founder",
    cta_primary_text: "See the collection",
    cta_primary_link: "/catalog",
    cta_secondary_text: "Request a bespoke piece",
    cta_secondary_link: "/contact",
  },
  craft_video: {
    enabled: true,
    // "Watch Our Craft in Motion" section
    section_eyebrow: "Process Reel",
    section_title_pre: "Watch Our Craft",
    section_title_highlight: "in Motion.",
    caption: "Behind the scenes at Samrat Glass Emporium — handcrafted decorative lighting from Firozabad.",
    // Video sources
    video_url: "",                 // uploaded MP4/webm — preferred when set
    instagram_url: "https://www.instagram.com/reel/CqS8MlDoVuH/",
    thumbnail_url: "",             // poster image / placeholder still
    // Behaviour
    bg_autoplay: true,             // muted autoplay loop for Craft hero background (uses uploaded video only)
    cta_text: "Watch on Instagram",
    cta_link: "https://www.instagram.com/reel/CqS8MlDoVuH/",
    // About page mini video block
    about_enabled: true,
    about_caption: "A moment from our Firozabad workshop.",
  },
  gallery: {
    eyebrow: "Installations",
    title_pre: "Our Work",
    title_highlight: "in the wild.",
    tagline: "Homes, hotels, weddings, showrooms — spaces we've helped illuminate. Each piece here is custom-made in Firozabad.",
    items: [],
    // Homepage carousel controls
    home_randomize: true,
    home_autoplay: true,
    home_per_view: 3,
    home_featured_indices: [], // reorder-able list of project indices; empty = use all/latest
  },
  faq: {
    eyebrow: "Support · FAQ",
    title_pre: "Frequently",
    title_highlight: "Asked.",
    tagline: "Short answers to the questions we hear most often — from bespoke lead times to lighting for high ceilings.",
    items: [
      { q: "Do you make custom-sized chandeliers and lighting for large spaces?", a: "Yes. Bespoke commissions are a core part of what we do — banquet halls, hotel lobbies, temples, luxury residences. Share the space dimensions (or a photo with rough ceiling height) on WhatsApp and we'll suggest sizes, finishes and a quote." },
      { q: "How long does a custom order take?", a: "Standard pieces typically ship in 7–10 business days. Bespoke commissions take 3–5 weeks depending on complexity — hand-cut crystal, brasswork and finishing all happen in-house in Firozabad." },
      { q: "Do you ship pan-India? What about international?", a: "Yes, we ship across India with insured door delivery. For international shipping, please write to samratglassemp@gmail.com with your destination — we handle bespoke international orders on request." },
      { q: "How are fragile glass pieces packaged?", a: "Every piece is inspected, wrapped in acid-free tissue, cushioned with foam moulds, and sent in double-wall corrugated crates. Larger chandeliers travel in custom-built wooden cases. Transit damage is rare, but replacement is guaranteed — share unboxing photos within 24–48 hours." },
      { q: "Do prices on the website include installation?", a: "No. Prices are indicative for the fixture only. We recommend a qualified local electrician for installation. For premium projects in Delhi/NCR and select cities, we can arrange installation on request — final quotation on inquiry." },
      { q: "Do you offer GST invoicing for corporate/hotel orders?", a: "Yes, GST invoices are available on all orders. Our GSTIN is 09ADCFS9258D1ZS. Share your business GSTIN when placing the inquiry and we'll issue the invoice accordingly." },
      { q: "Can architects and interior designers order in bulk?", a: "Absolutely. We work directly with architects, interior designers and hospitality buyers on curated collections and multi-unit orders. Reach out on WhatsApp or email for trade pricing and lead times." },
      { q: "What payment methods do you accept?", a: "Currently UPI and Net Banking. Custom orders typically require a partial advance before production begins. Full details are shared as part of the quotation." },
    ],
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
      { label: "The Craft", href: "/craft" },
      { label: "About Us", href: "/about" },
      { label: "Wishlist", href: "/favorites" },
      { label: "Inquiry Basket", href: "/cart" },
    ],
  },
  founder_teaser: {
    enabled: true,
    eyebrow: "Meet the founder",
    title: "Four decades of glass, in one steady hand.",
    body: "Since 1981, Mr. Sunil Kumar Agarwal has led our atelier in Firozabad — training master craftsmen, pushing form and finish, and quietly building a name that lights homes, hotels and hospitality across India.",
    cta_text: "Read our story",
    cta_link: "/about",
  },
  influencer_promotions: {
    enabled: true,
    eyebrow: "Featured Creators",
    title_pre: "As",
    title_highlight: "Styled By",
    subtitle:
      "Real homes. Real spaces. Real stories from creators who styled Samrat Glass Emporium lights.",
    view_more_text: "View More on Instagram",
    view_more_link: "",
    // Each item accepts EITHER a full Instagram embed <blockquote>… snippet OR a
    // plain Reel / Post URL (e.g. https://www.instagram.com/reel/XYZ/) — the
    // renderer auto-detects and normalizes both.
    items: [],
    // item shape: { input: string, handle: string, caption: string, product_id: string }
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
