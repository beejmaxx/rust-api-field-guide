# Rust API Field Guide

A source-reading book about idiomatic Rust API design, built from the standard library, a reproducible study of GitHub's top 100 Rust repositories, and a curated cohort of 40 libraries.

Read it at [beejmaxx.github.io/rust-api-field-guide](https://beejmaxx.github.io/rust-api-field-guide/).

## Authoring

The book is an [mdBook](https://rust-lang.github.io/mdBook/). Each chapter is a Markdown file in `src/`; `src/SUMMARY.md` defines the reading order and sidebar hierarchy.

```sh
mdbook serve --open
```

GitHub Actions builds and publishes the generated book to GitHub Pages whenever `main` changes.
