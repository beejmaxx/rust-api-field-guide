# `http::Request<T>`: separate head from body

<p class="chapter-subtitle">A generic payload, an owned protocol head, and a builder that remembers failure.</p>

The `http` crate defines protocol vocabulary shared by clients, servers, and middleware. Its `Request<T>` is small enough to read in one sitting but rich enough to demonstrate three excellent design choices: parameterize the variable part, provide borrowed and consuming access, and delay builder errors to a terminal operation.

## Use it first

```rust
use http::{Method, Request};

fn main() -> Result<(), http::Error> {
    let request = Request::builder()
        .method(Method::POST)
        .uri("/jobs")
        .header("content-type", "application/json")
        .body(br#"{"kind":"index"}"#.to_vec())?;

    assert_eq!(request.method(), Method::POST);
    assert_eq!(request.body().len(), 16);
    Ok(())
}
```

The caller gets a concrete `Request<Vec<u8>>`. No body trait object or I/O runtime is required. The crate owns the HTTP shape while the caller chooses the representation of the payload.

## Read the representation

At the pinned snapshot, the core is essentially:

```rust
pub struct Request<T> {
    head: Parts,
    body: T,
}

pub struct Builder {
    inner: Result<Parts>,
}
```

`Parts` contains method, URI, version, headers, and extensions. Those fields have stable HTTP meaning. `T` has no required protocol: it can be `()`, bytes, a deserialized command, or a streaming type supplied by another crate.

This split prevents a low-level vocabulary crate from prematurely deciding how bodies are buffered or streamed. It also permits transformations that preserve the expensive or validated head:

```rust
fn encode(request: Request<String>) -> Request<Vec<u8>> {
    request.map(String::into_bytes)
}
```

`map(self, f)` consumes the old request because it must move out the old body. It returns a request with a new body type while moving the same head unchanged. A mutation method could not express a change from `Request<String>` to `Request<Vec<u8>>`.

## Follow the ownership surface

The API offers three levels of access:

```rust
request.body()          // &T
request.body_mut()      // &mut T
request.into_body()     // T
request.into_parts()    // (Parts, T)
```

This is not redundant convenience. Each method corresponds to a different caller need. Observation borrows, in-place modification mutably borrows, and decomposition consumes. The type system makes the cost and lifecycle visible at the call site.

## Why the builder stores a `Result`

Methods such as `.method("POST")` and `.uri("/jobs")` accept ergonomic inputs that may fail to parse. Returning a `Result<Builder>` after every setter would break the fluent chain. Panicking would make data errors fatal. `Builder` instead stores `Result<Parts>` internally: after the first invalid input, later setters preserve the error, and `.body(...)` returns it.

That design makes the common path compact while retaining ordinary `Result` semantics at the point where construction completes.

## Rebuild the idea

Implement a minimal envelope with the same ownership shape:

```rust
#[derive(Debug)]
struct Envelope<T> {
    topic: String,
    payload: T,
}

impl<T> Envelope<T> {
    fn map<U>(self, f: impl FnOnce(T) -> U) -> Envelope<U> {
        Envelope {
            topic: self.topic,
            payload: f(self.payload),
        }
    }

    fn into_parts(self) -> (String, T) {
        (self.topic, self.payload)
    }
}
```

Then answer:

- What changes if `payload` is `Box<dyn Body>` instead of `T`?
- Which methods can exist on `Envelope<T>` without any trait bound on `T`?
- When would `Envelope<&[u8]>` be preferable to `Envelope<Vec<u8>>`?
- Should a builder remember only the first error or accumulate all errors?

## Source trail

- [`Request<T>`, `Parts`, and `Builder`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L152-L194)
- [`Request::into_parts`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L658-L660)
- [`Request::map`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L677-L689)

> **Takeaway:** Put stable structure in concrete fields and let a type parameter represent the part whose storage or behavior legitimately varies.
