export async function uploadProductImages(files, uploadOne) {
  const selected = Array.from(files || []);
  if (selected.length === 0) return { urls: [], failed: 0, total: 0 };

  const results = await Promise.allSettled(selected.map((file) => uploadOne(file)));
  const urls = [];
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.url) urls.push(result.value.url);
    else failed += 1;
  }

  return { urls, failed, total: selected.length };
}
