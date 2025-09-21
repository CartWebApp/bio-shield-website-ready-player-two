# Bio-Shield Website

[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/qgn46dxK)
[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=20460143)

This uses a custom framework inspired by [SvelteKit](https://svelte.dev). Here's how it works:

## Quick Start

To get the server up and running locally, use this command in Bash or Windows Command Prompt:

```bash
pnpm i && pnpm dev
```

## Routing

Routes are placed in `src/routes`. To (for example) make a page for `/blog`, make a folder in `src/routes` named `blog` and make a file named `index.html` inside `src/routes/blog`.

### Context

A page can be provided _context_ from adjacent folders. Context is a way to aggregate related modules on the server into an object that can be used on the client. To declare some context, create a folder with its name wrapped in parentheses inside the route you want to provide context to. For example, to provide `posts` to `/blog`, create a folder named `(posts)` inside `src/routes/blog`. Then, for each post, create a JavaScript file inside `(posts)` with the post name and `export default` some data:

```js
// `src/routes/blog/(posts)/hello-world.js`
export default {
    title: 'Hello, World!',
    post: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
};
```

Then, either in a `load` function or on the client, you can access the context via `useContext`:

```js
const posts = useContext('posts');
// or
const { posts } = useContext();
```

The exported context values must be serializable via `devalue`. This means they can be:

-   Plain Objects (POJOs) that may have circular references
-   Arrays
-   Primitives (numbers, strings, etc)
-   `Set`s and `Map`s
-   `Date`s
-   `RegExp`s

> Context _cascades_, so if you have `shop/(products)`, `shop/checkout` can access `products` via `useContext`.

### Routing Parameters

You can also use routing parameters. These allow you to have open-ended endpoints. For example, to implement GitHub's repository viewer, you might create a route like so:

```text
/src/routes/[org]/[repo]/index.html
```

Here, `org` and `repo` are parameters.

On the client, you can then access these via `useParams`:

```js
const { org, repo } = useParams();
// or
const org = useParams('org'),
    repo = useParams('repo');
```

### Errors

In the case that an HTTP error is thrown (most likely 404 not found), you can add custom error pages using a `+error/index.html` route. When you use this, an `error` context will be added, which will be an object with properties `{ message: string; status: number }`.

### Scripts

If you have a `+client.js` file in the same folder as a route, it will be inlined with your `index.html` without the need to `<script src` it. Additionally, a `+base.js` file at the root route will be inlined with every route.

### HTML

Since it's very likely that your `<head>` contents will be the same for each page, you can declare `<head>` contents in `src/routes/+head.html`. These will be added to each route. Additionally, for `<body>` content such as navbars and footers, you can use `src/routes/+base.html`. Contents before 4 line breaks will be placed at the top of the `<body>`, contents after will be placed at the bottom.

## Types

To appease TypeScript, we generate ambient `d.ts` files on the fly for each route. This allows us to have typed `useContext` and `useParams`. You can use these type declarations via a [triple-slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html):

```js
/// <reference path="./types.d.ts" />
```

## Load Functions

Like SvelteKit, you can use `load` functions. `load` functions are default exports from `+load.js` files. These are async or sync functions that take a `request` parameter and can return a value. This value can either be `null`, `undefined`, or an object which will be added to the context. If you need to throw an HTTP error, you can call the `error` function available in the `#server` module. This is also where `useContext` and `useParams` can be called from the server. Additionally, if you find yourself prop drilling and passing `request` down multiple functions, use `getRequest` from `#server`, which provides a cleaner solution.

```js
// `src/routes/shop/[product]/+load.js`
/** @import { Product } from '#types' */
/** @import { LoadFunction } from './types.js' */
/// <reference path="./types.d.ts" />
import { error, useContext, useParams } from '#server';

/** @type {LoadFunction<{ product: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const { product } = useParams();
    if (!Object.hasOwn(products, product)) {
        error(404);
    }
    return {
        product: products[/** @type {keyof typeof products} */ (product)]
    };
}
```

> Like context, `load` functions cascade, so accessing `/shop/shoes` will call `load` functions from `src/routes/+load.js`, `src/routes/shop/+load.js`, and `src/routes/shop/[item]/+load.js` in that order.

### SSR

While we don't offer many SSR methods, we have a small collection of primitives, available in the `insert` namespace found in the `#server` module. These allow you to (for example) set the title of the page in a `load` function, or use a templating syntax to render dynamic content on the server.
