const https = require('https');

const HOST = 'samratglass.com';
const VERIFICATION_FILE = '513b2f270aaae19c310a4180567023ae.txt';
const INDEXNOW_KEY = VERIFICATION_FILE.replace(/\.txt$/, '');
const KEY_LOCATION = `https://${HOST}/${VERIFICATION_FILE}`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAPS = [
  `https://${HOST}/api/sitemap.xml`,
  `https://${HOST}/sitemap.xml`,
  `https://${HOST}/authority-sitemap.xml`,
];

function requestText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'SamratGlass-IndexNow/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          requestText(new URL(res.headers.location, url).toString()).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} returned ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => decodeXml(m[1].trim()));
}

function isSitemapUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.endsWith('.xml') || parsed.pathname.includes('sitemap');
  } catch {
    return false;
  }
}

async function collectUrls() {
  const targets = new Set();
  const seenSitemaps = new Set();

  async function walk(sitemapUrl, depth = 0) {
    if (depth > 3 || seenSitemaps.has(sitemapUrl)) return;
    seenSitemaps.add(sitemapUrl);

    const xml = await requestText(sitemapUrl);
    for (const loc of extractLocs(xml)) {
      let parsed;
      try {
        parsed = new URL(loc);
      } catch {
        continue;
      }
      if (parsed.hostname !== HOST && parsed.hostname !== `www.${HOST}`) continue;

      if (isSitemapUrl(loc)) {
        await walk(loc, depth + 1);
      } else {
        targets.add(loc);
      }
    }
  }

  for (const sitemap of SITEMAPS) {
    try {
      await walk(sitemap);
    } catch (error) {
      console.warn(`[IndexNow] Skipping ${sitemap}: ${error.message}`);
    }
  }

  return [...targets];
}

function submitChunk(urlList) {
  const payload = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      INDEXNOW_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'SamratGlass-IndexNow/1.0',
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if ([200, 202].includes(res.statusCode)) {
            resolve({ statusCode: res.statusCode, body });
            return;
          }
          reject(new Error(`IndexNow returned ${res.statusCode}${body ? `: ${body}` : ''}`));
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const urls = await collectUrls();
  if (!urls.length) {
    throw new Error('No live URLs were found in the configured sitemaps.');
  }

  console.log(`[IndexNow] Found ${urls.length} live URLs.`);
  const chunkSize = 10000;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const result = await submitChunk(chunk);
    console.log(`[IndexNow] Submitted ${chunk.length} URLs (HTTP ${result.statusCode}).`);
  }
}

main().catch((error) => {
  console.error(`[IndexNow] ${error.message}`);
  process.exit(1);
});
