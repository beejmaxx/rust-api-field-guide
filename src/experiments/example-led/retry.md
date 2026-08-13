# B3 · Replayable retry in production

<p class="chapter-subtitle">Reqwest exposes replay as a value capability; Tower turns it into a middleware protocol.</p>

Retry is where ownership stops being a local implementation detail. Sending normally consumes a request. A second attempt therefore needs another valid input, not merely another loop iteration.

## Reqwest: ask the value

Reqwest does not implement unconditional `Clone` for `Request`. It offers:

```rust
pub fn try_clone(&self) -> Option<Request>
```

The return type communicates three facts:

1. some request values are replayable;
2. the decision may depend on the body stored in this value;
3. inability to replay is ordinary control flow, not necessarily an exceptional error.

A buffered byte body can be reproduced. A one-shot stream generally cannot. The clone must be prepared before the original request moves into `send`.

## Tower: ask a policy

Tower retry wraps any `Service<Request>`. Its policy surface is approximately:

```rust
pub trait Policy<Req, Res, E> {
    type Future: Future<Output = ()>;

    fn retry(
        &mut self,
        req: &mut Req,
        result: &mut Result<Res, E>,
    ) -> Option<Self::Future>;

    fn clone_request(&mut self, req: &Req) -> Option<Req>;
}
```

Read this as four separate design choices.

### Classification sees the whole result

HTTP 503 and 429 responses are often `Ok(Response)`. A policy that sees only `E` cannot classify protocol failures. Receiving `Req` also permits method- or idempotency-aware decisions.

### `Option<Future>` joins decision and waiting

`None` means return the current result. `Some(future)` means wait for an asynchronous condition and retry. A future supports a timer, a permit, or another readiness signal without coupling Tower to one runtime or duration type.

### Request cloning is fallible

`clone_request` avoids a blanket `Req: Clone` bound. An unreplayable request still receives its initial attempt; it merely disables another one.

### Mutable policy state belongs to one retry session

An attempts-remaining counter can live in the policy cloned into the response future. A global retry budget can be shared explicitly behind `Arc`.

## Trace the state machine

The returned future cycles through three conceptual states:

```text
Called -- no retry --> return result
  |
  +-- retry --> Waiting --> Retrying --> Called
```

`Called` polls the inner operation. `Waiting` polls the policy's future. `Retrying` waits until the service is ready to receive the preserved request. The public API anticipates each state without exposing the state machine itself.

## Compare with an attempt factory

Application code can often use a smaller abstraction:

```rust
async fn retry<F, Fut, T, E>(attempt: F, max_attempts: usize) -> Result<T, E>
where
    F: FnMut(usize) -> Fut,
    Fut: Future<Output = Result<T, E>>;
```

The closure can reopen a file or rebuild a request from durable inputs. It is excellent when the application controls the call site. Tower cannot assume such a closure because transparent middleware receives an already-built request.

## Extract the rules

- Consuming operations force replay to become an explicit capability.
- `Clone` describes type-wide duplication; `try_clone` can describe value-dependent replay.
- A factory is often the cleanest application API; fallible request cloning fits transparent middleware.
- Classification may need the request, response, and error.
- “maximum attempts” is less ambiguous than “number of retries.”
- A policy future decouples waiting from a particular clock or runtime.

Read [Reqwest `try_clone`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L145-L158) and [Tower `Policy`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/policy.rs#L46-L90). Then complete the [common final challenge](experiments/final-challenge.md) without reopening this chapter.
