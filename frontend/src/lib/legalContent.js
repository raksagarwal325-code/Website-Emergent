// Legal / policy content for Samrat Glass Emporium.
// Structured as sections; each section is either { text } or { bullets: [...] }.
// The "Last updated" date is auto-injected at render time.

const CONTACT_BLOCK = [
  { subheading: "Contact" },
  { text: "For privacy-related requests, contact:" },
  { text: "Email: samratglassemp@gmail.com" },
  { text: "WhatsApp: +91-8920392937" },
];

export const LEGAL_PAGES = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    intro:
      "Samrat Glass Emporium respects your privacy. This Privacy Policy explains how we collect, use, store, and protect information submitted through our website, contact forms, WhatsApp inquiries, catalogue downloads, and product inquiry basket.",
    sections: [
      {
        heading: "Information We Collect",
        bullets: [
          "Name",
          "Phone number / WhatsApp number",
          "Email address",
          "City / delivery location",
          "Product inquiry details",
          "Messages submitted through contact or inquiry forms",
          "Basic website usage information such as browser, device, and pages visited",
        ],
      },
      {
        heading: "Analytics & Website Usage (Google Analytics 4)",
        text:
          "We use Google Analytics 4 (GA4) to understand how visitors use this website — which pages are viewed, which products are opened, link and button interactions, including WhatsApp links, and catalogue downloads. This helps us improve product discovery, page performance, and the overall experience. Google Analytics processes network and device information (such as browser, device type, and network-derived signals) to derive approximate location and aggregate usage statistics.",
        bullets: [
          "Data collected: page URL, referrer, page title, approximate location (city/region) derived by Google, device type, browser, screen size, and interaction events (product views, add-to-cart, wishlist, link and button interactions including WhatsApp links, catalogue downloads, contact/inquiry submissions).",
          "Data NOT collected by analytics: your name, email, phone number, address, inquiry message content, or any content you type into a form.",
          "Purpose: aggregated site analytics, product performance measurement, and improving customer experience — not for advertising or profile-building.",
          "Legal basis: our legitimate interest in operating and improving this website.",
          "Retention: Analytics data is retained according to the retention settings configured in our Google Analytics property.",
          "Your choices: we honour your browser's Do Not Track setting — if enabled, no analytics scripts load. You can also install any standard analytics-blocking extension without affecting site functionality.",
          "Google's privacy information: https://policies.google.com/privacy · How Google uses data: https://policies.google.com/technologies/partner-sites · Google Analytics opt-out: https://tools.google.com/dlpage/gaoptout",
        ],
      },
      {
        heading: "How We Use Your Information",
        bullets: [
          "To respond to product inquiries",
          "To share quotations and product details",
          "To process catalogue download requests",
          "To coordinate delivery and customer support",
          "To improve our website, catalogue, and product experience",
          "To send business-related communication when requested by the customer",
        ],
      },
      {
        heading: "Data Sharing",
        text:
          "We do not sell customer data. Information may be shared only with service providers such as delivery partners, hosting providers, payment support providers, or communication tools where required to complete customer requests.",
      },
      {
        heading: "Data Retention",
        text:
          "We retain inquiry and order-related information for business records, customer service, GST/accounting, and legal compliance purposes.",
      },
      {
        heading: "Customer Rights",
        text:
          "Customers may contact us to request correction, update, or deletion of their personal information, subject to applicable business, tax, and legal record requirements.",
      },
      { blocks: CONTACT_BLOCK },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    intro:
      "Welcome to the Samrat Glass Emporium website. By using this website, browsing our catalogue, downloading product information, or submitting an inquiry, you agree to these Terms & Conditions.",
    sections: [
      {
        heading: "Business Information",
        blocks: [
          { text: "Samrat Glass Emporium" },
          { text: "Raniwala Market, Babboo Ji Ki Jeen, Firozabad - 283203, Uttar Pradesh, India" },
          { text: "GSTIN: 09ADCFS9258D1ZS" },
        ],
      },
      {
        heading: "Product Information",
        text:
          "We make efforts to display product images, descriptions, specifications, prices, and availability accurately. However, because many products are handcrafted, slight variations in color, size, finish, design, and glass texture may occur.",
      },
      {
        heading: "Pricing",
        text:
          "Prices shown on the website may be indicative and can vary depending on size, finish, customization, quantity, packaging, and delivery location. Final quotation will be confirmed through WhatsApp, email, or direct communication.",
      },
      {
        heading: "Order Confirmation & Cancellation",
        text:
          "Once an order has been confirmed by Samrat Glass Emporium, it cannot be cancelled. This applies to both standard and customized products. Customized products may enter production immediately after confirmation and/or receipt of the agreed advance.",
      },
      {
        heading: "Spare / Replacement Components",
        text:
          "Spare or replacement glass/components may be supplied after delivery depending on stock availability, compatibility, and product design. Such replacements may be chargeable unless they form part of an accepted transit-damage or qualifying defect claim.",
      },
      {
        heading: "Website Use",
        text:
          "Users must not misuse the website, copy content without permission, upload harmful files, or attempt unauthorized access to admin or backend areas.",
      },
      {
        heading: "Intellectual Property",
        text:
          "All brand content, logo, product images, text, catalogue designs, and website content belong to Samrat Glass Emporium unless otherwise stated.",
      },
      {
        heading: "Limitation",
        text:
          "Samrat Glass Emporium is not responsible for delays caused by courier issues, natural events, incorrect customer details, or circumstances beyond our control.",
      },
    ],
  },
  shipping: {
    slug: "shipping",
    title: "Shipping & Delivery Policy",
    intro: "Samrat Glass Emporium provides Pan-India delivery for eligible products.",
    sections: [
      {
        heading: "Delivery Timeline",
        text:
          "Standard delivery usually takes 7–10 business days after order confirmation and payment, depending on product availability, customization, packing time, and delivery location.",
      },
      {
        heading: "Packaging",
        text:
          "Glass and lighting products are packed with care to reduce risk during transit. Some delicate or large products may require special packaging.",
      },
      {
        heading: "Delivery Charges",
        text:
          "Shipping may be included or charged separately depending on product, quantity, size, location, and quotation terms. Final delivery charges will be confirmed before order confirmation.",
      },
      {
        heading: "Customer Responsibility",
        text:
          "Customers must provide accurate name, phone number, address, and delivery location. Delays due to incorrect details are not the responsibility of Samrat Glass Emporium.",
      },
      {
        heading: "Transit Damage",
        text:
          "If a product is received damaged, the customer should inform us as soon as possible with photos/videos of the package and product.",
      },
    ],
  },
  returns: {
    slug: "returns",
    title: "Return & Replacement Policy",
    intro:
      "Because our products include handcrafted glass lighting and customized decorative items, returns and replacements are handled carefully.",
    sections: [
      {
        heading: "Warranty & Handcrafted Glass",
        text:
          "Our decorative lighting products predominantly contain handcrafted glass and fragile components and therefore do not carry a standard or general warranty against accidental breakage, mishandling, normal wear, installation damage, or damage occurring after delivery. Genuine manufacturing defects and accepted transit-damage claims will continue to be handled under this Return & Replacement Policy.",
      },
      {
        heading: "Eligible for Replacement",
        bullets: [
          "Product received damaged in transit",
          "Wrong product delivered",
          "Major manufacturing defect reported after delivery",
        ],
      },
      {
        heading: "Not Eligible for Return / Replacement",
        bullets: [
          "Minor handmade variations in color, finish, glass texture, or size",
          "Damage caused after delivery or during installation",
          "Custom-made products after approval",
          "Products damaged due to misuse, mishandling, or incorrect installation",
          "Change of mind after order confirmation",
        ],
      },
      {
        heading: "Damage Reporting",
        text:
          "Customers should share photos/videos of the damaged product and packaging within 24–48 hours of delivery.",
      },
      {
        heading: "Resolution",
        text:
          "Depending on the case, Samrat Glass Emporium may offer replacement part, repair support, replacement product, or another suitable resolution.",
      },
      {
        heading: "Spare / Replacement Components",
        text:
          "Spare or replacement glass/components may be supplied after delivery depending on stock availability, compatibility, and product design. Such replacements may be chargeable unless they form part of an accepted transit-damage or qualifying defect claim.",
      },
      {
        heading: "Installation",
        text:
          "Electrical installation should be done by a qualified electrician. We are not responsible for damage caused by incorrect installation.",
      },
    ],
  },
  payment: {
    slug: "payment",
    title: "Payment Policy",
    intro: "",
    sections: [
      {
        heading: "Current Payment Methods Accepted",
        bullets: ["UPI", "Net Banking"],
      },
      {
        heading: "Order Confirmation",
        text:
          "Orders are confirmed only after payment terms are agreed and required advance/full payment is received.",
      },
      {
        heading: "Custom Orders",
        text: "Custom orders may require advance payment before production begins.",
      },
      {
        heading: "Payment Proof",
        text:
          "Customers may be asked to share payment screenshot/transaction details for confirmation.",
      },
      {
        heading: "Invoices",
        text:
          "GST invoice can be provided where applicable. GSTIN: 09ADCFS9258D1ZS",
      },
      {
        heading: "Failed or Pending Payments",
        text:
          "If payment is pending, failed, or not received, order processing or dispatch may be delayed.",
      },
      {
        heading: "Online Payment Gateway",
        text:
          "If Razorpay, UPI checkout, or other online payment gateway is added later, this policy should be updated accordingly.",
      },
    ],
  },
};

export const LEGAL_ORDER = ["privacy", "terms", "shipping", "returns", "payment"];
