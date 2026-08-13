# Rust API Field Guide

The site publishes four complete reading paths over the same Rust API-design curriculum:

- **Classic** — principles first, followed by production cases.
- **Problem-first** — begin with a reasonable API and add requirements until the design breaks.
- **Example-led** — begin with concrete decisions from mature Rust libraries.
- **Workshop** — design public signatures at guided checkpoints before comparing solutions.

Every edition includes the conceptual curriculum, twelve production case studies, previous/next chapter navigation, and a shared assessment. The selector in mdBook's top toolbar moves between matching chapter paths.

## Build

Install mdBook 0.5.3, then build the complete site:

```sh
bash scripts/build-all-editions.sh
```

The classic edition is written to `book/`; the other editions are nested under `book/editions/`. GitHub Actions runs the same script and publishes that single artifact to GitHub Pages.

A source-reading book about idiomatic Rust API design, built from the standard library, a reproducible study of GitHub's top 100 Rust repositories, and a curated cohort of 40 libraries.

Read it at [beejmaxx.github.io/rust-api-field-guide](https://beejmaxx.github.io/rust-api-field-guide/).

## Authoring

The book is an [mdBook](https://rust-lang.github.io/mdBook/). Each chapter is a Markdown file in `src/`; `src/SUMMARY.md` defines the reading order and sidebar hierarchy.

```sh
mdbook serve --open
```

GitHub Actions builds and publishes the generated book to GitHub Pages whenever `main` changes.
