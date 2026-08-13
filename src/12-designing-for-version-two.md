# Designing for version two

<p class="chapter-subtitle">Privacy, non-exhaustive types, and sealed traits preserve room for APIs to grow.</p>

<div class="chapter-meta"><span>Advanced</span><span>#[non_exhaustive] · sealed traits · private error kinds · feature flags</span></div>

## Public means promised

A public field allows direct construction and mutation. A public enum variant allows exhaustive matching. A public trait allows downstream implementations. Each capability may be desirable, but each is also a compatibility commitment.

```rust
// Adding a field breaks struct literals in downstream crates.
pub struct Config {
    pub timeout: Duration,
}

let config = Config { timeout };
```

## Private fields preserve construction invariants

Private fields let constructors and builders validate combinations, introduce defaults, cache derived state, and add new fields later. Expose accessors for facts callers need; do not expose representation simply because writing getters feels repetitive.

```rust
pub struct Config {
    timeout: Duration,
    retries: usize,
}

impl Config {
    pub fn builder() -> ConfigBuilder { … }
    pub fn timeout(&self) -> Duration { self.timeout }
}
```

## Non-exhaustive types reserve possibilities

#[non_exhaustive] on an enum requires downstream matches to include a wildcard, allowing variants to be added compatibly. On structs, it prevents external struct literals. This is useful when the domain will predictably grow, but it reduces exhaustive reasoning for callers.

> **Design note**
>
> Do not use non_exhaustive automatically. It trades caller certainty for author flexibility.

## Sealed traits control who implements

A public trait is difficult to extend with required methods after downstream crates implement it. A sealed trait uses a private supertrait so users can call it and write generic bounds but cannot implement it. The crate retains freedom to add requirements or guarantee a closed set of implementers.

```rust
mod private { pub trait Sealed {} }

pub trait ByteSource: private::Sealed {
    fn bytes(&self) -> &[u8];
}
```

## A compatibility checklist

> **Design note**
>
> A good 1.0 API does not predict every feature. It deliberately keeps selected doors open.

- Can a caller construct this value directly?
- Can a caller exhaustively match this enum?
- Can another crate implement this trait?
- Does a dependency type appear in the signature?
- Will a new optional setting break callers?
- Are feature flags additive, and do combinations compile?
- Does the error surface expose stable recovery facts rather than internals?

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Rust API Guidelines checklist](https://rust-lang.github.io/api-guidelines/checklist.html)
- [Reqwest private errors](https://github.com/seanmonstar/reqwest/blob/master/src/error.rs)
- [Apollo Compiler](https://github.com/apollographql/apollo-rs/tree/main/crates/apollo-compiler)
