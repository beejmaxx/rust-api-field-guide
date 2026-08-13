# Before you begin

<p class="chapter-subtitle">Measure your starting model before any track teaches the answers.</p>

Set a ten-minute timer. Answer from memory in a notes file. Short explanations are enough. Do not search the book or compile code yet.

## Questions

### 1. Parameter ownership

Give one reason each for accepting a parameter as `&T`, `&mut T`, and `T`.

### 2. Changing a contained type

Why might this operation need to consume `self`?

```rust
fn map<U>(self, f: impl FnOnce(T) -> U) -> Container<U>
```

### 3. Required construction steps

Name one advantage and one cost of making a required builder step visible in the type system.

### 4. Retry and responses

Why is `fn should_retry(error: &E) -> bool` insufficient for some network protocols?

### 5. Replayability

Why might an HTTP request reasonably lack a `Clone` implementation?

### 6. Design transfer

Sketch a signature for retrying an async operation when each attempt must create a fresh input.

## Pre-test score

Award one point for each answer that states the central idea:

1. Observe / mutate / take ownership or retain.
2. The operation moves out `T` and may change the enclosing generic type.
3. Compile-time omission prevention; cost in type complexity, diagnostics, or evolution.
4. A protocol-level retryable failure may be an `Ok(response)`, such as HTTP 503.
5. A request may contain a one-shot stream or receiver that cannot be reproduced.
6. An `FnMut() -> Future` or `FnMut(attempt_number) -> Future` factory.

Record the result out of six, then choose exactly one track from the [lab introduction](README.md).
