const CACHE = "focus-v1";
const LOCAL_ASSETS = [
    "./", "index.html", "style.css", "cards.css", "money.css", "lessons.css", "progress.css",
    "script.js", "cards.js", "money.js", "lessons.js", "progress.js", "companion.js", "sync.js", "pwa.js",
    "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
    "images/character.png", "images/english.png", "images/myself.png", "images/stuck.png", "images/tatstroydom.png",
    "images/cards/01-path.png", "images/cards/02-choice.png", "images/cards/03-sea.png", "images/cards/04-shelter.png",
    "images/cards/05-window.png", "images/cards/06-garden.png", "images/cards/07-bridge.png"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL_ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
    })));
});
