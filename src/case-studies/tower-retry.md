# Tower Retry: replay is a capability

<p class="chapter-subtitle">Retrying is easy only when an operation is safe to repeat and its consumed input can be reproduced.</p>

The naive retry abstraction sees an error and calls the operation again. Tower's `Policy<Req, Res, E>` reveals why a reusable design needs more information:

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

## A result is richer than an error

HTTP 503 is normally `Ok(Response)`, not a Rust transport error. A retry decision may depend on the method, response status, `Retry-After` header, error category, or attempt count. Giving the policy the request and full result avoids baking HTTP into Tower while permitting protocol-aware policies.

`Option<Future>` combines two decisions:

- `None`: return the current result.
- `Some(wait)`: await this condition, then attempt again.

The future could be a timer, an immediately ready value, a rate-limit permit, or a notification from a health checker. Returning a future avoids coupling the trait to Tokio or even to `Duration`.

## Why `clone_request` is not a `Clone` bound

The inner `Service::call` consumes `Req`. A retry therefore needs a second request prepared before the first call. But some bodies are one-shot streams. Requiring `Req: Clone` would exclude useful request types; implementing `Clone` on a streaming request would be dishonest.

`clone_request(&Req) -> Option<Req>` says replayability is decided by the policy and the particular request. `None` disables retry without preventing the first attempt.

It also permits semantic cloning. A policy could remove hop-by-hop headers, attach an attempt number, or recreate a request from immutable application data.

## Implement a bounded immediate policy

```rust
use std::future::{self, Ready};
use tower::retry::Policy;

#[derive(Clone)]
struct Attempts {
    remaining: usize,
}

impl<Req, Res, E> Policy<Req, Res, E> for Attempts
where
    Req: Clone,
{
    type Future = Ready<()>;

    fn retry(
        &mut self,
        _req: &mut Req,
        result: &mut Result<Res, E>,
    ) -> Option<Self::Future> {
        if result.is_err() && self.remaining > 0 {
            self.remaining -= 1;
            Some(future::ready(()))
        } else {
            None
        }
    }

    fn clone_request(&mut self, req: &Req) -> Option<Req> {
        Some(req.clone())
    }
}
```

This policy counts retries, not total attempts: `remaining: 2` permits the initial attempt plus two more. Naming that distinction explicitly avoids a classic off-by-one API ambiguity.

## Alternative: make attempts with a closure

For an application-facing API, a factory can avoid request cloning:

```rust
async fn retry<F, Fut, T, E>(mut attempt: F, limit: usize) -> Result<T, E>
where
    F: FnMut(usize) -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    for number in 1..=limit {
        match attempt(number).await {
            Ok(value) => return Ok(value),
            Err(error) if number == limit => return Err(error),
            Err(_) => {}
        }
    }
    unreachable!("limit must be greater than zero")
}
```

The closure recreates each attempt from captured durable inputs. This is often easier for database queries or generated request bodies. Tower's request-cloning design is a better fit for transparent middleware, where the wrapper receives an already-built request and must preserve the inner service's interface.

## Questions to defend

- Should “maximum attempts” allow zero? A newtype or `NonZeroUsize` can remove ambiguity.
- Does the policy own per-call state or shared cross-call budget? Tower clones policy state into the retry future; shared budgets need `Arc`-backed state.
- May the policy mutate a successful response into an error? Tower allows it, buying power at the cost of local reasoning.
- Is `Option<Future>` clearer than a `RetryDecision` enum? An application API may prefer explicit variants; infrastructure benefits from the compact protocol.

## Source trail

- [`Policy` and its behavioral contract](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/policy.rs#L46-L90)
- [`Retry<P, S>::call`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/mod.rs)
- [Retry future state machine](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/future.rs)

> **Takeaway:** Retrying is not an error-handling loop. It is an API for classification, delay, state, safety, and reproducibility.
