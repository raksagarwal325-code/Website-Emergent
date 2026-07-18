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
          "We use Google Analytics 4 (GA4) to understand how visitors use this website — which pages are viewed, which products are opened, when items are added to the inquiry basket, favourites or WhatsApp is clicked, and which catalogue actions are used. This helps us improve product discovery, page performance, and the overall experience. GA4 stores anonymised usage data on Google's infrastructure with IP anonymisation enabled.",
        bullets: [
          "Data collected: page URL, referrer, page title, approximate location (city/region), device type, browser, screen size, anonymised IP, and interaction events (product views, add-to-cart, wishlist, WhatsApp click, catalogue download, contact/inquiry submissions).",
          "Data NOT collected by analytics: your name, email, phone number, address, inquiry message content, or any content you type into a form.",
          "Purpose: aggregated site analytics, product performance measurement, and improving customer experience — not for advertising or profile-building.",
          "Legal basis: our legitimate interest in operating and improving this website.",
          "Retention: GA4 default (up to 14 months from the last user activity), after which data is auto-deleted.",
          "Your choices: we honour your browser's Do Not Track setting — if enabled, no analytics scripts load. You can also install any standard analytics-blocking extension without affecting site functionality.",
          "Google's privacy information: https://policies.google.com/privacy · How Google uses data: https://policies.google.com/technologies/partner-sites · Google Analytics opt-out: https://tools.google.com/dlpage/gaoptout",
        ],
      },
      {
        heading: "How We Use Your Information",
        bullets: [
          "To respond to product inquiries",
          "To share quotations and product details",
          "To process catalogue/download requests",
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
        heading: "Custom Orders",
        text:
          "Customized products are made as per client requirements. Once confirmed, custom orders may not be cancelled after production has started.",
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
