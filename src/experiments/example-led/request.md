# B1 · Generic envelopes in production

<p class="chapter-subtitle">Use <code>http::Request&lt;T&gt;</code> to decide when a payload belongs in a generic parameter and when a method should consume.</p>

The `http` crate is deliberately smaller than an HTTP client or server. It supplies shared protocol types. That makes `Request<T>` a clean place to study an API boundary: metadata has stable HTTP meaning, while the body belongs to whatever client, server, runtime, or test is using it.

## The design in use

```rust
let request = Request::builder()
    .method("POST")
    .uri("/jobs")
    .header("content-type", "application/json")
    .body(command)?;
```

Do not read the implementation yet. Inventory what the caller can infer:

- the builder owns accumulated metadata;
- `body(command)` is terminal and chooses the request's body type;
- string-like method, URI, and header inputs may require validation;
- construction can fail without any setter interrupting the chain.

## The essential public API

The essential representation is:

```rust
pub struct Request<T> {
    head: Parts,
    body: T,
}
```

Its body operations form an ownership ladder:

```rust
pub fn body(&self) -> &T;
pub fn body_mut(&mut self) -> &mut T;
pub fn into_body(self) -> T;
pub fn map<F, U>(self, f: F) -> Request<U>
where
    F: FnOnce(T) -> U;
```

Why must `map` consume the request?

It needs to move the old `T` into `f`, and the returned `Request<U>` may be a different concrete type from `Request<T>`. Mutable borrowing can replace a `T` with another `T`; it cannot change the type of the caller's storage.

## Transformation follows ownership

`map` is almost mechanical:

```rust
let (parts, body) = self.into_parts();
Request::from_parts(parts, f(body))
```

That small implementation reveals two deliberate public seams:

- `into_parts` consumes the envelope and exposes protocol metadata plus body;
- `from_parts` reconstructs the envelope while allowing the body type to change.

Adapters can interoperate without making every internal request field public. The crate still commits to the semantics of `Parts`, so this is not free encapsulation.

## Builder failure stays fluent

The builder contains a `Result<Parts>` internally. A setter that cannot convert its input stores the error. Later setters remain fluent, and `.body(...)` reports the result.

This chooses one failure experience: concise chains and delayed observation, usually retaining the first failure. A form-validation library that must report every bad field would likely accumulate a list instead.

## Extract the rules

Write these in your source notebook:

| Question | `http`'s answer |
|---|---|
| What varies across ecosystems? | Body representation, so it is generic. |
| What remains shared? | HTTP request metadata in `Parts`. |
| How can callers merely inspect? | `&T`. |
| How can adapters change body type? | Consume and return `Request<U>`. |
| Where are parse failures observed? | At the terminal builder operation. |
| What remains private? | The request's concrete field layout. |

## Where the opposite wins

`Request<T>` is not a rule that every payload needs a generic. Use a fixed `Vec<u8>` when all consumers truly operate on owned bytes and generic propagation would add noise. Use a trait object when body implementations must be selected at runtime behind one stable type. Borrow a payload when the operation is synchronous and retention would be needless.

Read the pinned [`Request<T>` source](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L152-L194) and [`map`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L677-L689), then proceed to [B2 · Construction safety in production](05-builders-and-typed-payloads.md).
