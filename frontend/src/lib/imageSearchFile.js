const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MIME_ALIASES = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export function normalizeImageSearchFile(file) {
  if (!file) return null;
  const reported = String(file.type || "").split(";", 1)[0].trim().toLowerCase();
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  const mime = MIME_ALIASES[reported]
    || (Object.values(MIME_BY_EXTENSION).includes(reported) ? reported : "")
    || MIME_BY_EXTENSION[extension]
    || "";
  if (!mime) return null;
  if (reported === mime) return file;
  return new File([file], file.name || `search.${extension || "jpg"}`, {
    type: mime,
    lastModified: file.lastModified,
  });
}
