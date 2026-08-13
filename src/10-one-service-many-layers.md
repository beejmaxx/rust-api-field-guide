# One service, many layers

<p class="chapter-subtitle">Tower standardizes async operations so middleware can be written once and composed everywhere.</p>

<div class="chapter-meta"><span>Advanced</span><span>tower::Service · tower::Layer · ServiceBuilder</span></div>

## A common shape for operations

HTTP clients, servers, queues, and mock functions all accept a request and eventually produce a response or error. Tower captures that shape in `Service<Request>`. Middleware can then wrap the abstraction instead of depending on one protocol.

```rust
pub trait Service<Request> {
    type Response;
    type Error;
    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>)
        -> Poll<Result<(), Self::Error>>;
    fn call(&mut self, request: Request) -> Self::Future;
}
```

## Why Request is generic but outputs are associated

A service may intentionally accept several request types, so Request is a trait parameter. For a chosen request type, it has one response, error, and future type, so those are associated types. The distinction follows the relationship between implementer and types.

> **Design note**
>
> Ask whether an implementation chooses one type or should support many. That question often resolves associated type versus generic parameter.

## Readiness before work

poll_ready models backpressure. A service may be temporarily unable to accept another request because a connection pool is full or concurrency limit is reached. Separating readiness from call prevents unbounded queues from hiding inside every service.

```rust
ready!(service.poll_ready(cx))?;
let response = service.call(request).await?;
```

## Layer separates configuration from traffic

A `Layer<S>` transforms an inner service `S` into a wrapped service. The layer typically stores reusable configuration; the produced service stores per-instance state. `ServiceBuilder` composes layers in a readable order.

```rust
let service = ServiceBuilder::new()
    .timeout(Duration::from_secs(2))
    .concurrency_limit(64)
    .layer(TraceLayer::new_for_http())
    .service(inner);
```

## The price of zero-cost composition

Every layer changes the concrete service type, sometimes producing intimidating compiler messages. Associated future types can also force implementers to name custom futures or box them. Tower chooses infrastructure performance and broad composition; an application-facing API may reasonably hide these types behind impl Trait or a boxed service.

- Make middleware transparent where possible: preserve response and error types.
- Separate configuration objects from runtime objects.
- Model capacity when overload matters.
- Offer an erased escape hatch when concrete types become unusable.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Tower repository](https://github.com/tower-rs/tower)
- [Service trait](https://github.com/tower-rs/tower/blob/master/tower-service/src/lib.rs)
- [ServiceBuilder](https://github.com/tower-rs/tower/blob/master/tower/src/builder/mod.rs)
