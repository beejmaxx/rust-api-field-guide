# thiserror and anyhow: errors by audience

<p class="chapter-subtitle">Libraries expose structured failure contracts; applications aggregate failures with context.</p>

thiserror and anyhow are often presented as competing error crates. They solve different boundary problems and work well together.

## A library error is part of the API

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("could not read {path}")]
    Read {
        path: std::path::PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("invalid port {0}")]
    InvalidPort(u16),
}
```

Callers can match `InvalidPort`, inspect a source chain, or display the error. Derive writes the repetitive `Display`, `Error::source`, and `From` wiring; your enum still defines the public semantics.

thiserror intentionally does not become a runtime abstraction. The generated implementation is what you could write by hand, and downstream callers do not need to know derive was used.

## An application error serves a different audience

At a binary's orchestration boundary, the exact Cartesian product of every dependency error is rarely useful as a stable enum. The operator needs a causal report:

```rust
use anyhow::{Context, Result};

fn load(path: &Path) -> Result<Config> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("reading configuration at {}", path.display()))?;

    toml::from_str(&text)
        .context("parsing configuration as TOML")
}
```

`anyhow::Error` erases the concrete error type while preserving the source chain and allowing context to accumulate at layers that know what the operation meant.

The filesystem knows “permission denied.” The application knows it was “reading the production billing configuration.” Both pieces matter, and they belong at different layers.

## The boundary rule

Use a concrete error when callers reasonably branch on variants or when the error is a supported library contract. Use an erased report when the primary operation is propagation, logging, or presenting a top-level failure.

```text
reusable library                     application / binary
----------------                     --------------------
Result<T, ParseError> ──────────────► anyhow::Result<T>
stable variants                       context chain
programmatic matching                 operational report
semver commitment                     flexible aggregation
```

This is not absolute. An application may have domain errors used for HTTP status mapping, and a library may internally use erased errors behind a private boundary. The key is the audience at the public edge.

## Preserve sources rather than stringify

This loses structure:

```rust
Err(format!("could not load config: {error}"))
```

The original error can no longer be downcast or traversed as a source. Prefer `#[source]`, `#[from]`, or `.context(...)`. Formatting is a presentation step, not an error transport.

## A subtle API compatibility choice

A public exhaustive error enum lets callers match precisely, but adding a variant is potentially breaking. Options include:

- accept the semver cost because variants are the contract;
- mark the enum `#[non_exhaustive]`;
- expose an opaque error with classifier methods, as Reqwest does;
- keep a detailed enum private and map it to a smaller public taxonomy.

Choose based on how much branching power callers need, not based on which derive is easiest.

## Rebuild both layers

Create a small parsing library:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ParsePortError {
    #[error("port is not an integer")]
    NotInteger(#[from] std::num::ParseIntError),
    #[error("port zero is reserved")]
    Zero,
}

pub fn parse_port(text: &str) -> Result<u16, ParsePortError> {
    let port = text.parse()?;
    if port == 0 { Err(ParsePortError::Zero) } else { Ok(port) }
}
```

Then call it from a binary returning `anyhow::Result<()>` and attach the configuration key and file path as context. Verify that the final report includes both application meaning and the concrete root cause.

## Questions to defend

- Which variants will callers actually match?
- Does the error contain secrets or URLs that should be redacted?
- Is the source error stable enough to expose in a public variant field?
- Should retryability be a public classifier rather than an enum variant?
- Where should a backtrace be captured?

## Source trail

- [thiserror's public contract and derive documentation](https://github.com/dtolnay/thiserror/blob/8336b8407fbfe69177c504cdbc379db20cf6f131/src/lib.rs)
- [anyhow's application-oriented API](https://github.com/dtolnay/anyhow/blob/bf3ed9149f4334c984c1ad252b534107b307078c/src/lib.rs)
- [`Context`](https://github.com/dtolnay/anyhow/blob/bf3ed9149f4334c984c1ad252b534107b307078c/src/context.rs)

> **Takeaway:** Error design begins with who must act on the failure. Structure serves programmatic callers; context serves diagnosis; preserving the source serves both.
