// Change RELEASE in this file and in index.html together on each deployment.
const RELEASE = "20261110-1";
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = "kanji-dojo:" + SCOPE.pathname + ":";
const CACHE = CACHE_PREFIX + RELEASE;
const INDEX = new URL("index.html", SCOPE);
const QUESTIONS = new URL("questions.json", SCOPE);
const MANIFEST = new URL("manifest.webmanifest", SCOPE);
const ICONS = ["icon-192.png", "icon-512.png"].map((name) => new URL(name, SCOPE));
const FILES = [INDEX, QUESTIONS, MANIFEST, ...ICONS];

async function installRelease() {
  const files = await Promise.all(FILES.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok || response.redirected) throw new Error("Missing offline file: " + url.pathname);
    if (url === INDEX && !(await response.clone().text()).includes('name="dojo-release" content="' + RELEASE + '"')) {
      throw new Error("Waiting for the matching HTML release");
    }
    if (url === QUESTIONS || url === MANIFEST) await response.clone().json();
    if (ICONS.includes(url) && !response.headers.get("content-type")?.startsWith("image/png")) {
      throw new Error("Invalid launcher icon: " + url.pathname);
    }
    return [url.href, response];
  }));
  const cache = await caches.open(CACHE);
  await Promise.all(files.map(([key, response]) => cache.put(key, response)));
  await self.skipWaiting();
}

self.addEventListener("install", (event) => event.waitUntil(installRelease()));

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE) {
        await caches.delete(name);
      } else if (name === "kanji-dojo-v1" || name === "kanji-dojo-v2") {
        // Earlier releases used an origin-wide name. Remove only this project's entries.
        const legacy = await caches.open(name);
        const ownedPaths = new Set([SCOPE.pathname, ...FILES.map((file) => file.pathname), new URL("app.js", SCOPE).pathname]);
        for (const request of await legacy.keys()) {
          const url = new URL(request.url);
          if (url.origin === SCOPE.origin && ownedPaths.has(url.pathname)) await legacy.delete(request);
        }
      }
    }
    await self.clients.claim();
  })());
});

async function onlineFirst(request, offlineKey) {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.status < 500) return response;
    const saved = await (await caches.open(CACHE)).match(offlineKey);
    return saved || response;
  } catch {
    const saved = await (await caches.open(CACHE)).match(offlineKey);
    return saved || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin) return;

  if (request.mode === "navigate" && (url.pathname === SCOPE.pathname || url.pathname === INDEX.pathname)) {
    event.respondWith(onlineFirst(request, INDEX.href));
    return;
  }
  const asset = [QUESTIONS, MANIFEST, ...ICONS].find((file) => file.pathname === url.pathname);
  if (asset) event.respondWith(onlineFirst(request, asset.href));
});
