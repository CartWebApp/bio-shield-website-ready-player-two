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

> [!NOTE]
> Trailing slashes are automatically added to routes. This means that, for example, importing `./module.js` in `/blog` will resolve to `./blog/module.js` as opposed to `./module.js`.

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

> [!NOTE]
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

### CSS

To reuse CSS across every route, create a `+base.css` file at your root route. It will be inlined with each route.

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

> [!NOTE]
> Like context, `load` functions cascade, so accessing `/shop/shoes` will call `load` functions from `src/routes/+load.js`, `src/routes/shop/+load.js`, and `src/routes/shop/[item]/+load.js` in that order.

### SSR

While we don't offer many SSR methods, we have a small collection of primitives, available in the `insert` namespace found in the `#server` module. These allow you to (for example) set the title of the page in a `load` function, or use a templating syntax to render dynamic content on the server. Additionally, we provide an `element` helper that takes a tag, props, and children to return an HTML element as a string.

## Remote Functions

Remote functions are an RPC feature (_very_ much based on SvelteKit's [remote functions](https://svelte.dev/docs/kit/remote-functions)) that allow you to write functions that can be called on the client and execute on the server. This enables you to (for example) update a database from the client on the server in just a few lines of code. Here's an example.

```js
// `src/routes/db.remote.js`
// the file exporting remote functions must end in `.remote.js`
import { db } from 'database';
// any validation library that follows the standard schema spec will work (e.g. zod)
import * as v from 'valibot';
import { command, query } from '#remote';

export const create_post = command(v.object({
        user: v.number(),
        title: v.string(),
        content: v.string()
    }), async ({ user, title, content }) => {
    await db.sql`
        INSERT INTO posts (user, title, content)
        VALUES (${user}, ${title}, ${content})
    `;
});

export const get_posts = query(v.number(), user_id => {
    const posts = await db.sql`
        SELECT * FROM posts
        WHERE user = ${user_id}
    `;
    return posts;
});
```

Here, we've declared a `command` and a `query`. A query allows you to read dynamic data from the server, while a command allows you to write data to the server. Both `query` and `command` accept one or two arguments: an optional schema that validates the arguments passed to the function, and the actual function. Then, on the client:

```js
// `src/routes/+client.js`
import { create_post, get_posts } from './db.remote.js';
import { get_user } from './user.js';

const user_id = get_user();
get_posts(user_id).subscribe(posts => {
    render(posts);
});

create_post_button.addEventListener('click', async () => {
    await create_post({ user: user_id, title, content });
});
```

> [!NOTE]
> If you want a remote function to _not_ validate its arguments, simply enter `'unchecked'` for the schema. **This is a security risk and not recommended. Remote functions are turned into public endpoints that may be called by anyone, _not_ just your application.**

## Build Step

To improve performance, we provide a build step that minifies your JavaScript with [Terser](https://terser.org) and your CSS with [LightningCSS](https://lightningcss.dev). The built code is then put in `src/build`.
