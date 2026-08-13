# Errors for callers

<p class="chapter-subtitle">thiserror and reqwest illustrate two different promises a library can make.</p>

<div class="chapter-meta"><span>Intermediate</span><span>thiserror · reqwest::Error · std::error::Error</span></div>

## Errors are part of the public API

An error type tells callers which failures are expected, which distinctions are stable, and what recovery is possible. Designing it after the happy path is finished often produces strings that callers must parse or enums that expose implementation details.

```rust
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("could not read {path}")]
    Read { path: PathBuf, source: io::Error },
    #[error("invalid setting: {key}")]
    Invalid { key: String },
}
```

## Concrete enums: matchable and precise

thiserror generates Display, Error::source, and From implementations while leaving your type an ordinary enum. This works well when variants are meaningful domain events and you are willing to support them as public API.

> **Design note**
>
> Every public enum variant is a compatibility promise. Adding a variant can break exhaustive matches unless the enum is marked non_exhaustive.

## Opaque errors: stable and classifiable

Reqwest takes another approach. Error's internal kind is private. Public methods such as is_timeout, is_connect, status, and url expose recovery-relevant facts without freezing the internal taxonomy.

Callers cannot exhaustively match every internal cause, but reqwest can evolve transports and dependencies without redesigning its public enum.

```rust
match client.get(url).send().await {
    Err(e) if e.is_timeout() => retry(),
    Err(e) if e.status() == Some(StatusCode::NOT_FOUND) => absent(),
    Err(e) => return Err(e),
    Ok(response) => use_it(response),
}
```

## Application errors are different

Applications often benefit from anyhow-style context because their primary error consumer is a human or log. Libraries should usually expose typed, documented errors because downstream code needs stable recovery decisions. The correct design depends on the audience, not ideology.

- Preserve the source chain.
- Include context the lower-level error cannot know.
- Do not require string matching for recovery.
- Avoid leaking dependency error types accidentally.
- Document whether retry is safe.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [thiserror](https://github.com/dtolnay/thiserror)
- [reqwest error.rs](https://github.com/seanmonstar/reqwest/blob/master/src/error.rs)
