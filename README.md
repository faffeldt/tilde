# tilde

Felix's personal home page and blog, named after `~` and the old `/~user` pages.
The site is a fake terminal: an SSH-style greeting and basic shell commands, on top of a virtual filesystem of `docs/`.
It is plain HTML, CSS and JS, with no dependencies or build step.
It is meant to be published by GitHub Pages from the `/docs` folder of `main`.

## Setup

Install [mise](https://mise.jdx.dev/), then the tools it pins for local work:

```sh
mise install
```

## Preview locally

```sh
mise run serve
```

Then open <http://localhost:8000/>.
`docs/` is plain files, so any other static file server works too.

## Check links

```sh
mise run check
```

This checks local links and assets, but not external URLs.

## Run the tests

```sh
npm ci
npx playwright install chromium
mise run test
```

## Add a post

1. Copy an existing post, such as `docs/blog/example-post.html`, to `docs/blog/my-post.html`.
2. In the copy, update the title, description, breadcrumb, heading, date and body.
3. Add a link to the top of the list in `docs/blog/index.html`.
4. Add the post to the file list in `docs/terminal.js`.

Keep links and asset paths relative, so the site works under any base path.

## Add a theme

1. Add a block with the theme's colors to `docs/style.css`, after the existing theme blocks.
2. Add its name to `THEMES` in `docs/theme.js`.
