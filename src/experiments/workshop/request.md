# C1 · Design a request envelope

<p class="chapter-subtitle">You own the API. Requirements arrive one at a time; write signatures before opening each checkpoint.</p>

You are designing a Rust client for an internal job service. Callers submit a topic and JSON bytes. The client may retain the request until an asynchronous worker is ready.

## Round 1: establish ownership

Write the smallest `JobRequest` and `submit` signature. Decide whether each input is borrowed or owned.

<details>
<summary>Review the first design</summary>

```rust
pub struct JobRequest {
    topic: String,
    body: Vec<u8>,
}

pub async fn submit(request: JobRequest)
    -> Result<JobId, SubmitError>;
```

Owning the request fits retention and cross-thread movement. A borrowed version could be better for immediate synchronous serialization.

</details>

## Round 2: preserve the payload's form

New callers have validated command structs. Middleware may reject a request using metadata alone, so early serialization is wasted. Another caller needs a one-shot stream.

**Stop and design:** keep one request vocabulary without erasing every body behind `dyn Any`. Write the revised type and a call site for both bytes and a domain value.

<details>
<summary>Compare a production-shaped answer</summary>

```rust
pub struct JobRequest<B> {
    topic: String,
    body: B,
}

let encoded = JobRequest::new("index", Vec::<u8>::new());
let typed = JobRequest::new("index", IndexCommand::default());
```

The generic marks the dimension that legitimately varies. Stable routing metadata stays concrete.

</details>

## Round 3: design the ownership ladder

Four consumers need different access:

- logging observes the body;
- an in-place normalizer mutates it;
- an executor wants only the body;
- an encoder changes `JobRequest<Command>` into `JobRequest<Vec<u8>>`.

**Stop and design:** write one method for each consumer. Pay attention to the receiver and return type.

<details>
<summary>Compare signatures</summary>

```rust
impl<B> JobRequest<B> {
    pub fn body(&self) -> &B;
    pub fn body_mut(&mut self) -> &mut B;
    pub fn into_body(self) -> B;

    pub fn map_body<U>(self, f: impl FnOnce(B) -> U)
        -> JobRequest<U>;
}
```

`map_body` consumes because it moves `B` and can change the enclosing concrete type. `FnOnce` is sufficient because the body is transformed once and permits closures that consume captured state.

</details>

## Round 4: choose the interoperability seam

A protocol adapter needs to separate metadata and body, then reconstruct a request with a different body. You can expose every field, add dozens of getters, or publish a `Parts` boundary.

Write `into_parts` and `from_parts`. Then state what compatibility promise a public `Parts` type creates.

<details>
<summary>Review</summary>

```rust
pub fn into_parts(self) -> (Parts, B);
pub fn from_parts(parts: Parts, body: B) -> Self;
```

This preserves the request's private representation but commits the crate to the public meaning and evolution of `Parts`. Use the seam when adapters genuinely need structural interoperation.

</details>

## Interview defense

Answer aloud:

1. Why is `B` generic rather than boxed?
2. When would a fixed `Vec<u8>` be better?
3. Why does `map_body` accept `FnOnce`?
4. Which methods require bounds on `B`? Why can most require none?
5. What changes if `submit` only borrows for the duration of the call?

The production comparison is [`http::Request<T>`](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L152-L194). Continue to [C2 · Design safe construction](05-builders-and-typed-payloads.md).
