# C2 · Design safe construction

<p class="chapter-subtitle">Choose construction strictness from the cost of omission, not from attachment to a pattern.</p>

Your `JobRequest<B>` needs a topic, endpoint, optional headers, and optional timeout. Strings must be parsed into structured values.

## Round 1: repair an unreadable constructor

```rust
JobRequest::new(topic, endpoint, headers, timeout, body)
```

Several arguments have similar types and most are optional. Sketch a fluent call site first. Then write only the public builder signatures required to support it.

<details>
<summary>One conventional surface</summary>

```rust
impl JobRequest<()> {
    pub fn builder() -> Builder;
}

impl Builder {
    pub fn topic<T>(self, topic: T) -> Self
    where T: TryInto<Topic>;

    pub fn endpoint<E>(self, endpoint: E) -> Self
    where E: TryInto<Endpoint>;

    pub fn timeout(self, timeout: Duration) -> Self;
    pub fn body<B>(self, body: B) -> Result<JobRequest<B>, BuildError>;
}
```

</details>

## Round 2: decide when conversion fails

If `endpoint` returns `Result<Builder, _>`, the chain becomes interrupted. If it panics, untrusted configuration can crash the program. If it silently substitutes a default, information is lost.

**Stop and design:** preserve a fluent chain and report conversion failure at a predictable point. State whether you retain the first error or all errors.

<details>
<summary>Compare the stored-result technique</summary>

```rust
pub struct Builder {
    inner: Result<Parts, BuildError>,
}
```

Each setter attempts conversion only while `inner` is `Ok`. The terminal `body` applies `?`. Keeping the first error suits programmatic construction; accumulating a collection may suit user-facing form validation.

</details>

## Round 3: omission becomes dangerous

The endpoint now determines which security domain receives sensitive jobs. There must be no implicit destination, and reviewers want a missing choice to fail at compile time.

**Stop and design:** make the terminal operation unavailable until the endpoint has been supplied. Use as few public states as possible.

<details>
<summary>Compare a typestate transition</summary>

```rust
pub struct MissingEndpoint;
pub struct Ready;

pub struct Builder<State> {
    parts: Parts,
    state: PhantomData<State>,
}

impl Builder<MissingEndpoint> {
    pub fn endpoint(self, endpoint: Endpoint) -> Builder<Ready>;
}

impl Builder<Ready> {
    pub fn body<B>(self, body: B) -> JobRequest<B>;
}
```

The transition consumes the old phase and returns a new one. `body` literally does not exist on `Builder<MissingEndpoint>`.

</details>

## Round 4: runtime configuration challenges typestate

The endpoint comes from a TOML file. The type system cannot prove a string key existed in a runtime document.

Explain a hybrid design: where does parsing happen, what validated type crosses the boundary, and which states remain impossible afterward?

<details>
<summary>Review</summary>

Parse and validate dynamic configuration into a `ValidatedConfig` or ready builder. Return structured runtime errors at that edge. Let the active client accept only the validated type. Typestate cannot eliminate input validation; it can prevent the rest of the program from accidentally bypassing it.

</details>

## Design defense

For each domain, choose plain constructor, stored-result builder, typestate, or hybrid:

1. arbitrary database filters;
2. encryption requiring a key;
3. a form showing every error;
4. a server loading configuration before entering a running state.

Compare your model with [`http::request::Builder`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L186-L194) and [rustls `ConfigBuilder`](https://github.com/rustls/rustls/blob/b2035cc0f5576e3511479ef64dbfbfc55847fd19/rustls/src/builder.rs#L31-L100). Continue to [C3 · Design replay-safe retry](11-retry-and-replayability.md).
