# tilde

Felix's personal home page and blog, named after `~` and the old `/~user` pages.
The site is hand-written HTML and CSS in `docs/`, with no dependencies or build step.
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

## Add a post

1. Copy an existing post, such as `docs/blog/example-post.html`, to `docs/blog/my-post.html`.
2. In the copy, update the title, description, breadcrumb, heading, date and body.
3. Add a link to the top of the list in `docs/blog/index.html`.

Keep links and asset paths relative, so the site works under any base path.
