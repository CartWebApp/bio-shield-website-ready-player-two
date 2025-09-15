// @ts-check
/// <reference lib="es2024" />

/** @typedef {{ body: DocumentFragment; title: string }} CacheEntry */
/** @type {Map<string, CacheEntry>} */
const cache = new Map();
const parser = new DOMParser();
const add_event_listener = EventTarget.prototype.addEventListener;
const url_history = [];

/**
 * @param {string} url
 */
function handler(url) {
    /**
     * @this {HTMLAnchorElement | HTMLAreaElement}
     * @param {Event} event
     * @returns {Promise<void>}
     */
    return async function handle(event) {
        event.preventDefault();
        await navigate(url);
    };
}

/**
 * @param {string} url
 */
async function navigate(url) {
    const entry = /** @type {CacheEntry} */ (cache.get(url));
    history.pushState(url_history.push(url), '', url);
    document.title = entry.title;
    document.body.replaceChildren(
        document.adoptNode(entry.body.cloneNode(true))
    );
    await init();
}

/**
 * @param {string} url
 * @param {Array<HTMLAnchorElement | HTMLAreaElement>} [dependents]
 * @returns {Promise<void>}
 */
async function prefetch(url, dependents = []) {
    const res = await fetch(url);
    const text = await res.text();
    const tree = parser.parseFromString(text, 'text/html');
    const { body, title } = tree;
    cache.set(url, { body: template(body.innerHTML), title });
    const handle = handler(url);
    for (const link of dependents) {
        add_event_listener.call(link, 'click', handle);
    }
}

/**
 * @param {string} html
 */
function template(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
}

async function init() {
    const {
        links: [...links]
    } = document;
    /** @type {Map<string, Array<HTMLAnchorElement | HTMLAreaElement>>} */
    const dependencies = new Map();
    for (const link of links) {
        const { href } = link;
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) continue;
        if (!dependencies.has(url.href)) {
            dependencies.set(url.href, []);
        }
        const links =
            /** @type {Array<HTMLAnchorElement | HTMLAreaElement>} */ (
                dependencies.get(url.toString())
            );
        links.push(link);
    }
    const promises = [...dependencies].map(([url, dependents]) =>
        prefetch(url, dependents)
    );
    // (() => {
    //     const body = document.body;
    //     console.log(getComputedStyle(body).backgroundImage);
    //     // body.style.backgroundImage = 'url(\'/static/hero.4k.jpg\')';
    // })();
    Promise.allSettled(promises);
    console.log('hi');
    const body = document.body;
    preload('/static/hero.4k.jpg').then(() => {
        console.log('loaded 4k image');
        body.style.backgroundImage = "url('/static/hero.4k.jpg')";
    });
}

// add_event_listener.call(document, 'DOMConentLoaded', init);
await init();
export {};
add_event_listener.call(
    document,
    'DOMContentLoaded',
    () => {
        cache.set(location.href, {
            body: template(document.body.innerHTML),
            title: document.title
        });
    },
    { once: true }
);
/** @type {IDBDatabase} */
let db;
const db_request = indexedDB.open('cached images', 3);

db_request.onsuccess = () => {
    db = db_request.result;
};
/**
 * @param {string} src
 */
function preload(src) {
    /** @param {string} input */
    async function compress_and_encode_text(input) {
        const reader = new Blob([input])
            .stream()
            .pipeThrough(new CompressionStream('gzip'))
            .getReader();
        let buffer = '';
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                reader.releaseLock();
                // Some sites like discord don't like it when links end with =
                return btoa(buffer)
                    .replaceAll('+', '-')
                    .replaceAll('/', '_')
                    .replace(/=+$/, '');
            } else {
                for (let i = 0; i < value.length; i++) {
                    // decoding as utf-8 will make btoa reject the string
                    buffer += String.fromCharCode(value[i]);
                }
            }
        }
    }

    /** @param {string} input */
    async function decode_and_decompress_text(input) {
        const decoded = atob(input.replaceAll('-', '+').replaceAll('_', '/'));
        // putting it directly into the blob gives a corrupted file
        const u8 = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            u8[i] = decoded.charCodeAt(i);
        }
        const stream = new Blob([u8])
            .stream()
            .pipeThrough(new DecompressionStream('gzip'));
        return new Response(stream).text();
    }
    return new Promise((f, r) => {
        const image = new Image();
        image.onload = () => f(src);
        image.onerror = r;
        if (localStorage[src]) {
            decode_and_decompress_text(localStorage[src]).then(res => {
                f(res);
            });
        } else {
            to_data_url(src).then(res => {
                image.src = res;
                compress_and_encode_text(res).then(res => {
                    console.log(res);
                    localStorage[src] = res;
                });
            });
        }
    });
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function to_data_url(url) {
    let blob = await fetch(url).then(r => r.blob());

    return await new Promise(resolve => {
        let reader = new FileReader();
        reader.onload = () => resolve(/** @type {string} */ (reader.result));
        reader.readAsDataURL(blob);
    });
}
