/** Parse the plain-text policy format used in Admin into displayed sections. */
export function parseLegalBody(body) {
  if (typeof body !== "string") return null;
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return null;

  const lines = trimmed.split("\n");
  const intro = [];
  const sections = [];
  let current = null;
  let seenHeading = false;

  const ensureSection = () => {
    if (!current) {
      current = { heading: "", text: "", bullets: [] };
      sections.push(current);
    }
    return current;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^##\s+/.test(line)) {
      current = { heading: line.replace(/^##\s+/, "").trim(), text: "", bullets: [] };
      sections.push(current);
      seenHeading = true;
    } else if (/^-\s+/.test(line)) {
      ensureSection().bullets.push(line.replace(/^-\s+/, "").trim());
    } else if (!seenHeading) {
      intro.push(line);
    } else {
      const section = ensureSection();
      section.text = section.text ? `${section.text}\n${line}` : line;
    }
  }

  const clean = (value) => (value || "").replace(/^\n+/, "").replace(/\n+$/, "");
  return {
    intro: clean(intro.join("\n")),
    sections: sections.map((section) => ({
      heading: section.heading,
      text: clean(section.text),
      bullets: section.bullets.length ? section.bullets : undefined,
    })),
  };
}
