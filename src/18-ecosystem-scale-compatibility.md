# Compatibility at ecosystem scale

<p class="chapter-subtitle">Tauri, bitflags, Serde, and the Rust standard library reserve different kinds of future change.</p>

<div class="chapter-meta"><span>Advanced</span><span>60 min read</span><span>tauri::RunEvent · bitflags! · Serde attributes · feature flags</span></div>

## Open domains need open matching

Tauri marks runtime event enums non_exhaustive, including selected struct-like variants. Desktop and mobile platforms evolve; a downstream exhaustive match would turn every new event into a breaking release. The wildcard is the price callers pay for ecosystem growth.

```rust
match event {
    RunEvent::ExitRequested { api, .. } => api.prevent_exit(),
    RunEvent::WindowEvent { label, event, .. } => handle(label, event),
    _ => {} // future events remain compatible
}
```

## Unknown bits are not unknown variants

Bitflags represents a set whose backing integer may contain flags a newer producer understands. APIs must choose whether to retain, truncate, reject, or expose unknown bits. Forward compatibility here is about preserving representation, not adding an enum wildcard.

The lesson is broader: identify whether your domain is closed, open by named cases, or open by opaque data. Each needs a different compatibility mechanism.

> **Design note**
>
> Non-exhaustive is not a universal future-proofing switch. Choose a mechanism matching how the domain can grow.

## Features form a public matrix

Serde, Tokio, and other foundational crates use feature flags to keep dependencies and capabilities optional. Every advertised feature combination is part of the API surface. Additive features are easier to reason about than flags that remove methods or change semantics. Re-exports and prelude modules similarly become compatibility commitments.

- Use non_exhaustive for predictably growing named variants.
- Preserve unknown representation data when round-tripping matters.
- Keep feature flags additive where possible and test meaningful combinations.
- Avoid exposing dependency types unintentionally; they couple your versioning to another crate.
- Document MSRV and whether it changes only in minor or major releases.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Tauri RunEvent](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/app.rs)
- [bitflags](https://github.com/bitflags/bitflags)
- [Serde feature flags](https://github.com/serde-rs/serde/blob/master/serde/Cargo.toml)
