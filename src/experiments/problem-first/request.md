# A1 · A request outgrows its body

<p class="chapter-subtitle">A useful generic should arrive as the answer to a concrete loss of flexibility.</p>

You are building an internal job service. Version zero accepts metadata and JSON bytes:

```rust
pub struct JobRequest {
    topic: String,
    body: Vec<u8>,
}

pub fn submit(request: JobRequest) -> Result<JobId, SubmitError>;
```

This is a good first design under a narrow requirement. The request owns everything needed for submission, callers can construct it without lifetimes, and `submit` can retain or move it to another thread.

## Pressure 1: not every body should be bytes yet

One caller already has a validated `IndexCommand`. Serializing it at construction time is wasteful because some middleware only inspects the topic and may reject the request. Tests want `JobRequest<()>`. A streaming importer should carry a reader rather than buffer a ten-gigabyte file.

### Your move

Change the request type while preserving one common metadata representation. Do not use `Box<dyn Any>`.

<details>
<summary>Checkpoint</summary>

```rust
pub struct JobRequest<B> {
    topic: String,
    body: B,
}
```

`B` represents a choice that legitimately varies per use. The request structure remains concrete, so middleware can share vocabulary without agreeing on a body runtime or trait.

</details>

The generic parameter does not mean “abstract everything.” Topic semantics are stable; body representation is not. That boundary is the design.

## Pressure 2: middleware needs several kinds of access

Logging observes the body's size. Authentication may add metadata. An encoder must transform `JobRequest<IndexCommand>` into `JobRequest<Vec<u8>>` while preserving the topic.

### Your move

Write four methods: borrow, mutably borrow, take the whole body, and change the body type.

<details>
<summary>Checkpoint</summary>

```rust
impl<B> JobRequest<B> {
    pub fn body(&self) -> &B {
        &self.body
    }

    pub fn body_mut(&mut self) -> &mut B {
        &mut self.body
    }

    pub fn into_body(self) -> B {
        self.body
    }

    pub fn map_body<U>(self, f: impl FnOnce(B) -> U) -> JobRequest<U> {
        JobRequest {
            topic: self.topic,
            body: f(self.body),
        }
    }
}
```

</details>

Why does `map_body` take `self`? It moves out `B`, and its return type may be a different instantiation of the enclosing type. `&mut self` cannot turn the caller's `JobRequest<B>` storage into `JobRequest<U>`.

## Pressure 3: a caller wants the metadata and body separately

Adding a getter for every private field is possible, but a protocol adapter wants to destructure the request, replace the body, and rebuild it later.

A consuming decomposition keeps fields private while exposing a stable boundary:

```rust
pub struct Parts {
    pub topic: String,
}

impl<B> JobRequest<B> {
    pub fn into_parts(self) -> (Parts, B) {
        (Parts { topic: self.topic }, self.body)
    }

    pub fn from_parts(parts: Parts, body: B) -> Self {
        Self { topic: parts.topic, body }
    }
}
```

`Parts` becomes public API, so add only metadata whose semantics you are prepared to support. Private request fields preserve more evolution freedom; a public parts type buys interoperability.

## Production reveal

The `http` crate arrived at this same shape:

```rust
pub struct Request<T> {
    head: Parts,
    body: T,
}
```

It offers `body`, `body_mut`, `into_body`, `into_parts`, `from_parts`, and `map`. This does not prove every envelope should be generic. It shows the choice works when metadata is stable and payload representation must remain open.

Read the pinned [`Request<T>` representation](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L152-L194) and [`Request::map`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L677-L689).

## Transfer test

Without copying the code above, design `Event<P>` with stable routing metadata and a variable payload. Then answer:

1. Which methods require no bound on `P`?
2. When would `Event<&[u8]>` be better than `Event<Bytes>`?
3. What capability would justify replacing `P` with `Box<dyn Payload>`?

Proceed to [A2 · Construction becomes dangerous](05-builders-and-typed-payloads.md).
