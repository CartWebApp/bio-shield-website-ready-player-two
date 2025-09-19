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

Then, on the client, you can access the context via `useContext`:

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

If you have a `script.js` file in the same folder as a route, it will be inlined with your `index.html` without the need to `<script src` it. Additionally, the root `script.js` will be inlined into every route.

## Types

To appease TypeScript, we generate ambient `d.ts` files on the fly for each route. This allows us to have typed `useContext` and `useParams`. You can use these type declarations via a [triple-slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html):

```js
/// <reference path="./types.d.ts" />
```
