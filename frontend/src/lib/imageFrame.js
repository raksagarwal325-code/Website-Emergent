export function detectImageFrameColor(img) {
  if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const points = [
      [0, 0], [1, 0], [0, 1],
      [11, 0], [10, 0], [11, 1],
      [0, 11], [1, 11], [0, 10],
      [11, 11], [10, 11], [11, 10],
    ];
    let total = 0;
    let count = 0;
    points.forEach(([x, y]) => {
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      if (a < 32) return;
      total += (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
      count += 1;
    });
    if (!count) return null;
    return (total / count) >= 165 ? "#ffffff" : "#000000";
  } catch (_) {
    return null;
  }
}

export function applyImageFrameColor(img, frame) {
  const color = detectImageFrameColor(img);
  if (color && frame) frame.style.backgroundColor = color;
  return color;
}
