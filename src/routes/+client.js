// @ts-check

/** @typedef {{ body: DocumentFragment; title: string; scripts: HTMLScriptElement[] }} CacheEntry */
/** @type {Map<string, CacheEntry>} */
const cache = new Map();
const parser = new DOMParser();
const add_event_listener = EventTarget.prototype.addEventListener;
/** @type {string[]} */
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
    for (const script of document.head.querySelectorAll('script')) {
        script.remove();
    }
    for (const script of entry.scripts) {
        const elem = document.createElement('script');
        Object.assign(elem, {
            ...(script.src.length > 0
                ? script.type.length > 0
                    ? { src: script.src, type: script.type }
                    : { src: script.src }
                : script.type.length > 0
                ? { type: script.type }
                : {}),
            async: script.async,
            defer: script.defer,
            text: script.text
        });
        document.body.append(elem);
    }
    await Promise.resolve();
    await init();
}

/**
 * @param {string} url
 * @param {Array<HTMLAnchorElement | HTMLAreaElement>} [dependents]
 * @returns {Promise<void>}
 */
async function prefetch(url, dependents = []) {
    const instance = new URL(url, location.href);
    instance.searchParams.append('prefetching', 'true');
    try {
        const res = await fetch(instance.toString());
        const text = await res.text();
        const tree = parser.parseFromString(text, 'text/html');
        const { body, title, head } = tree;
        const [...scripts] = head.querySelectorAll('script');
        cache.set(url, { body: template(body.innerHTML), title, scripts });
        const handle = handler(url);
        for (const link of dependents) {
            add_event_listener.call(link, 'click', handle);
        }
    } catch {}
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
    Promise.allSettled(promises);
    const body = document.body;
    preload('/static/hero.4k.jpg').then(url => {
        console.log('loaded 4k image');
        body.style.backgroundImage = `url('${url}')`;
    });
}

add_event_listener.call(
    document,
    'DOMContentLoaded',
    () => {
        cache.set(location.href, {
            body: template(document.body.innerHTML),
            title: document.title,
            scripts: [...document.head.querySelectorAll('script')]
        });
    },
    { once: true }
);
queueMicrotask(async () => {
    await Promise.resolve();
    await init();
});
export {};

/**
 * @param {string} src
 * @returns {Promise<string>}
 */
function preload(src) {
    return new Promise((f, r) => {
        const image = new Image();
        image.onload = () => f(image.src);
        image.onerror = r;

        to_data_url(src).then(res => {
            image.src = res;
        });
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
