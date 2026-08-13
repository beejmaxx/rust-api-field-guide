# Rust API Field Guide

<p class="chapter-subtitle">A practical guide to designing Rust APIs, grounded in the standard library, a reproducible study of GitHub's top 100 Rust repositories, and 40 purpose-built libraries.</p>

<div class="chapter-meta"><span>19 concept chapters</span><span>12 guided case studies</span><span>140 repositories surveyed</span></div>

## What this book teaches

Rust API design is the art of turning behavioral promises into types. A signature can describe ownership, mutation, absence, failure, concurrency, extensibility, and compatibility. The best APIs do this without making ordinary use feel ceremonial.

This book studies those choices in real libraries and production systems. We begin with `Option` and `Result`, work through ownership and iterators, then examine builders, Serde, Tokio, Axum, Tower, retry, and long-term API evolution. A research-derived final part compares Bevy, Polars, egui, Iced, Pingora, Tauri, Nushell, rustls, and other mature projects. The aim is not to memorize patterns. It is to develop judgment about tradeoffs.

Part VI contains the source-reading material: twelve substantial repository case studies with caller examples, public signatures, implementation trails pinned to exact commits, minimal rebuilds, and design questions. The wider 140-repository survey informs selection and comparison; it is not represented as 140 completed deep case studies.

> **Prerequisites**
>
> You should be able to read basic Rust: structs, enums, `match`, references, generics, traits, `Result`, and Cargo. Advanced chapters explain the additional machinery they use.

## How to read this book

Read in order on the first pass. Every chapter assumes vocabulary introduced earlier. Type the small examples rather than copying them. When a signature feels surprising, pause and predict the alternative before reading the explanation.

1. **Read the caller's view.** What must a user provide? What do they receive?
2. **Trace ownership.** Which values move, borrow, mutate, or outlive the call?
3. **Find the promise.** Which behavior is guaranteed by the type rather than prose?
4. **Challenge the choice.** What would become easier or harder with another design?

## How the evidence was selected

The book combines two samples: a reproducible snapshot of GitHub's 100 most-starred repositories classified as Rust on 13 August 2026, and a curated cohort of 40 libraries chosen to cover important API surfaces that popularity rankings miss. Popularity is not treated as proof of API quality. Every design claim is grounded in supported public entry points, caller examples, and traced implementations.

[Begin with Chapter 1: Signatures tell the story →](01-signatures-tell-the-story.md)
