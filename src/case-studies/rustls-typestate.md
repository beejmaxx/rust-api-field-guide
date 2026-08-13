# rustls: make unsafe configuration unrepresentable

<p class="chapter-subtitle">A security-sensitive builder uses state types so callers cannot finish without choosing verification and authentication policy.</p>

TLS configuration has dangerous omissions. A conventional builder with optional fields could defer missing certificates or verifier choices until `build()`, or worse, silently choose an insecure default. rustls makes construction proceed through typed phases.

## Read the caller's chain

```rust
let config = ClientConfig::builder()
    .with_root_certificates(root_store)
    .with_no_client_auth();
```

There is no final `.build()`. The last method is available only after required prior choices and returns `ClientConfig`. If the caller stops after `builder()`, they do not possess a usable configuration.

## The state is a type parameter

```rust
pub struct ConfigBuilder<Side: ConfigSide, State> {
    pub(crate) state: State,
    pub(crate) provider: Arc<CryptoProvider>,
    pub(crate) time_provider: Arc<dyn TimeProvider>,
    pub(crate) side: PhantomData<Side>,
}

pub struct WantsVerifier {
    // phase-specific data
}
```

Methods are implemented only for the states in which they make sense. A client builder wanting a verifier offers root-certificate and custom-verifier choices. Those methods return a builder in the next state. Authentication methods exist on that next state and return the completed configuration.

Conceptually:

```text
builder
  │
  ▼
WantsVerifier ── roots/custom verifier ──► WantsClientCert
                                              │
                                              ├─ client cert ─► ClientConfig
                                              └─ no auth ─────► ClientConfig
```

No Boolean such as `verify_peer: false` is accidentally adjacent to unrelated settings. Each security decision has a named method and a constrained position.

## Rebuild a two-phase builder

```rust
use std::marker::PhantomData;

struct MissingEndpoint;
struct Ready;

struct ClientBuilder<State> {
    endpoint: Option<String>,
    timeout_ms: u64,
    state: PhantomData<State>,
}

impl ClientBuilder<MissingEndpoint> {
    fn new() -> Self {
        Self {
            endpoint: None,
            timeout_ms: 1_000,
            state: PhantomData,
        }
    }

    fn endpoint(self, value: impl Into<String>) -> ClientBuilder<Ready> {
        ClientBuilder {
            endpoint: Some(value.into()),
            timeout_ms: self.timeout_ms,
            state: PhantomData,
        }
    }
}

impl<State> ClientBuilder<State> {
    fn timeout_ms(mut self, value: u64) -> Self {
        self.timeout_ms = value;
        self
    }
}

impl ClientBuilder<Ready> {
    fn build(self) -> Client {
        Client {
            endpoint: self.endpoint.unwrap(),
            timeout_ms: self.timeout_ms,
        }
    }
}
```

`build` literally does not exist on `ClientBuilder<MissingEndpoint>`. The `unwrap` is justified by the state transition, although a production representation can store the endpoint directly in the ready-state data to avoid the `Option` entirely.

## The cost of typestate

Typestate creates more types, more impl blocks, longer rustdoc pages, and sometimes intimidating compiler messages. It is worth that cost when:

- required steps are few and stable;
- omission is dangerous or expensive;
- construction is infrequent relative to use;
- the sequence has meaningful phases.

It is usually excessive for twenty independent cosmetic options. A hybrid works well: use typestate for security-critical requirements and ordinary setters for optional tuning.

## Evolution pressure

Adding a new mandatory phase can be a breaking change because old call chains no longer type-check. That is appropriate if old construction would become unsafe, but it means the state machine itself is a public compatibility commitment. Private state fields and controlled constructors keep the crate free to evolve implementation details within each phase.

## Questions to defend

- Should the state marker be zero-sized, or should each state own its phase-specific data?
- Are custom verifier escape hatches explicit enough to signal risk?
- Which safe defaults belong before the state machine begins?
- Would a runtime validation error produce a better user experience for configuration loaded dynamically?

## Source trail

- [`ConfigBuilder<Side, State>`](https://github.com/rustls/rustls/blob/b2035cc0f5576e3511479ef64dbfbfc55847fd19/rustls/src/builder.rs#L128-L139)
- [Builder states and documented transition sequences](https://github.com/rustls/rustls/blob/b2035cc0f5576e3511479ef64dbfbfc55847fd19/rustls/src/builder.rs#L31-L100)

> **Takeaway:** Typestate is most valuable when the absence of a configuration choice is itself a bug, not merely when a builder happens to have steps.
