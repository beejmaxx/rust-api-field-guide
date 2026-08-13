# Tower: one protocol for middleware

<p class="chapter-subtitle">A small request/response trait lets timeouts, limits, retries, tracing, and load balancing compose without knowing the application protocol.</p>

Tower's central abstraction is often summarized as “an async function from request to response.” That is close, but it omits the part that makes production middleware possible: readiness.

```rust
pub trait Service<Request> {
    type Response;
    type Error;
    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    fn poll_ready(
        &mut self,
        cx: &mut Context<'_>,
    ) -> Poll<Result<(), Self::Error>>;

    fn call(&mut self, request: Request) -> Self::Future;
}
```

## Why readiness is separate from the call

A service may need a connection, queue slot, concurrency permit, or healthy backend before accepting work. If `call` alone represented capacity, overload would be discovered only after ownership of the request had moved. `poll_ready` lets a caller wait for capacity first.

The sequencing contract matters:

```text
poll_ready ── pending ──► wake and poll again
     │
     └── ready ─────────► call(request) ──► future
```

Readiness may reserve a resource consumed by the next call. That is why both methods take `&mut self` and why the documentation permits `call` to panic if the protocol is violated. A trait is not only its type signature; behavioral sequencing can be part of the contract too.

## Implement the smallest service

```rust
use std::{convert::Infallible, future, task::{Context, Poll}};
use tower_service::Service;

struct Length;

impl Service<String> for Length {
    type Response = usize;
    type Error = Infallible;
    type Future = future::Ready<Result<usize, Infallible>>;

    fn poll_ready(&mut self, _: &mut Context<'_>)
        -> Poll<Result<(), Self::Error>>
    {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, request: String) -> Self::Future {
        future::ready(Ok(request.len()))
    }
}
```

This implementation has no backpressure, but it speaks the same protocol as an HTTP client pool or load balancer. Generic middleware can wrap all of them.

## Layer separates configuration from instances

A `Layer<S>` transforms an inner service into another service. Think of it as a constructor for middleware:

```rust
trait Layer<S> {
    type Service;
    fn layer(&self, inner: S) -> Self::Service;
}
```

The layer usually stores cloneable configuration: a timeout duration, limit, classifier, or span factory. The produced service owns runtime state and the inner service. This separation lets a server create many similarly configured service instances.

`ServiceBuilder<L>` accumulates a *type-level stack* of layers. The resulting concrete type can be enormous, but callers author it as a readable sequence:

```rust
let service = ServiceBuilder::new()
    .concurrency_limit(64)
    .timeout(Duration::from_secs(2))
    .service(Length);
```

Layer ordering is behavior. A timeout outside a retry bounds the whole operation; a timeout inside bounds each attempt. The fluent API looks declarative, but every method changes a nested concrete type.

## Associated future or boxed future?

The associated `Future` permits static dispatch and avoids a required allocation per call. It also makes service types harder to name and heterogeneous collections harder to build. Tower supplies `BoxService` and related adapters at those boundaries.

This is a recurring mature-library strategy:

1. Keep the foundational trait allocation-free and generic.
2. Compose statically through most of the program.
3. Offer explicit type erasure where storage, plugins, or compilation cost justify it.

## Build one layer

Create a counting wrapper:

```rust
struct Count<S> {
    inner: S,
    calls: usize,
}

impl<S, Req> Service<Req> for Count<S>
where
    S: Service<Req>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>)
        -> Poll<Result<(), Self::Error>>
    {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        self.calls += 1;
        self.inner.call(request)
    }
}
```

Then challenge it: how would the caller observe `calls`? Should it be an `Arc<AtomicUsize>` shared with a metrics handle? Which state belongs to the layer and which to the service?

## Source trail

- [`Service<Request>`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower-service/src/lib.rs#L322-L379)
- [`ServiceBuilder<L>`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/builder/mod.rs#L106-L125)
- [`Layer<S>`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower-layer/src/lib.rs)

> **Takeaway:** A tiny protocol becomes an ecosystem when it captures the operational constraint—here, readiness—not merely the shape of the happy-path function.
