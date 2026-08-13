# 16. Parse, validate, activate

<p class="chapter-subtitle">Pingora, rustls, clap, and domain newtypes move failure to the earliest useful boundary.</p>

<div class="chapter-meta"><span>Intermediate</span><span>55 min read</span><span>pingora::ServerConf · rustls::ConfigBuilder · clap::Parser · uuid::Uuid</span></div>

## Deserialized does not mean usable

Pingora's `ServerConf` can be loaded from YAML, merged with command-line options, and validated. Its `validate(self) -> Result<Self>` consumes the candidate and returns a usable value only after cross-field checks. The ownership transition prevents accidentally continuing with the unchecked value.

```rust
let config = ServerConf::load_from_yaml(path)?
    .validate()?;
```

## Typestate makes required steps unskippable

rustls uses ConfigBuilder<Side, State>. State types such as WantsVerifier make the construction phase part of the type. Methods available in one phase transition to another, and a final ClientConfig or ServerConfig cannot be obtained until security-critical choices are supplied.

Typestate is strongest when steps are few, ordered, and safety-relevant. It becomes counterproductive when it creates a combinatorial set of states for ordinary optional configuration.

```rust
let config = ClientConfig::builder()
    .with_root_certificates(roots)
    .with_no_client_auth();
```

## Derive at text-heavy boundaries

Clap projects a typed struct onto command-line strings. uuid, url, semver, and time similarly turn untrusted text into validated domain values. Once parsing succeeds, downstream functions can accept the domain type and stop rechecking syntax.

> **Design note**
>
> Parse, don't validate means making the parsed type carry the invariant—not merely calling validate and continuing to pass the original string.

## Design rule

- Separate syntax parsing from semantic cross-field validation.
- Consume an unchecked candidate when successful validation should replace it.
- Use distinct validated types when callers must not confuse the phases.
- Use typestate for short, essential construction protocols—not every optional setting.
- Make safe defaults easy and unsafe choices conspicuous.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Pingora configuration](https://github.com/cloudflare/pingora/blob/main/pingora-core/src/server/configuration/mod.rs)
- [rustls ConfigBuilder](https://github.com/rustls/rustls/blob/main/rustls/src/builder.rs)
- [Clap](https://github.com/clap-rs/clap)
