# 19. How this evidence was selected

<p class="chapter-subtitle">A reproducible popularity snapshot, a curated control cohort, and important limits on what the sample proves.</p>

<div class="chapter-meta"><span>Foundation</span><span>20 min read</span><span>100 GitHub repositories · 40 curated libraries · snapshot: 2026-08-13</span></div>

## The top-100 snapshot

On 13 August 2026, the study queried GitHub's repository search API for language:rust ordered by stars and recorded the first 100 results. Every repository was cloned from its default branch at depth one and pinned to an exact commit. The snapshot is reproducible but time-sensitive: stars, repository ownership, and default branches change.

All 100 clones were verified by resolving HEAD and reading its commit object. Partial clone filtering avoids downloading file contents until inspected; it does not change the commit or tree being studied.

```rust
gh api 'search/repositories?q=language%3Arust&sort=stars&order=desc&per_page=100'

git clone --depth 1 --filter=blob:none --no-checkout <repository>
```

## Popularity is not API quality

The top results contain libraries, applications, compilers, teaching material, generated workspaces, and recent viral projects. Stars measure attention, not design. Eighty-seven repositories contain at least one src/lib.rs, but many of those library crates are internal workspace boundaries rather than supported downstream APIs.

Consequently, no principle in this book is justified by star count alone. Claims rely on documented public entry points, caller examples, and a traced implementation path. Applications contribute lessons only where they expose a deliberate reusable boundary.

> **Design note**
>
> The top 100 is a field sample. It reveals what successful Rust systems actually do, including tradeoffs and inconsistencies; it is not a leaderboard of API craftsmanship.

## The curated control cohort

A separate cohort of 40 purpose-built libraries fills gaps that popularity rankings systematically miss. It covers macros, errors, parsing, concurrency, data structures, networking, validated domain types, testing, and safety abstractions. Inclusion is editorial and each repository has an explicit lesson hypothesis.

Examples include Serde, Clap, syn, Rayon, Crossbeam, bytes, bstr, http, Tower, rustls, thiserror, nom, Winnow, regex, UUID, time, camino, proptest, bitflags, pin-project, and async-trait.

- Compare at least two APIs before generalizing a rule.
- Prefer supported public surfaces over internal pub visibility.
- Separate descriptive findings—what projects do—from normative advice—what a new API should do.
- Cite exact upstream files so readers can challenge the interpretation.
- Deepen Git history only for selected evolution case studies; the main corpus represents current design.

## What the study does not prove

The sample does not measure usability experimentally, survey downstream users, or score repositories. It cannot show that one receiver style, error representation, or dispatch strategy wins universally. Repository language classification is approximate, and GitHub search ranking can be influenced by trends unrelated to Rust library use.

The book therefore presents contextual heuristics. The most valuable finding is often a contrast: two mature projects choose different APIs because their values have different identity, lifecycle, performance, or compatibility constraints.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [GitHub search syntax](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)
- [Research repository](https://github.com/beejmaxx/rust-api-field-guide)
