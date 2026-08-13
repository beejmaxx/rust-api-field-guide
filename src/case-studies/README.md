# Twelve API design decisions

<p class="chapter-subtitle">Production Rust makes the tradeoffs concrete: each library preserves different information for a different caller.</p>

The examples in this section are not a tour of repositories. Together they form a catalog of consequential API-design decisions.

| Design problem | Production answer | Central tradeoff |
|---|---|---|
| Stable metadata, variable payload | [`http::Request<T>`](http-request.md) | Generic propagation in exchange for zero-cost body flexibility |
| Simple use and detailed control | [Reqwest client](reqwest-client.md) | Convenience methods layered over owned request values |
| Composable middleware | [Tower `Service` and `Layer`](tower-service-layer.md) | One small protocol with complex concrete types |
| Retrying consumed inputs | [Tower Retry](tower-retry.md) | Replay as a fallible capability, not a blanket `Clone` promise |
| Many formats and many data types | [Serde's data model](serde-data-model.md) | An intermediate protocol decouples both sides |
| Ergonomic async handlers | [Axum extractors](axum-extractors.md) | Function arguments declare a request-consumption plan |
| Required security decisions | [rustls typestate](rustls-typestate.md) | More public type structure prevents invalid construction |
| Cheap binary slicing | [`Bytes`](bytes-shared-storage.md) | Shared backing storage makes views inexpensive |
| Familiar parallel composition | [Rayon iterators](rayon-parallel-iterators.md) | A semantic dialect reuses an established mental model |
| One schema, different authors | [Clap](clap-schema.md) | Builder and derive front ends converge on one representation |
| Read-mostly shared state | [ArcSwap guards](arc-swap.md) | Callers choose whether a read borrows or owns |
| Library and application errors | [thiserror and anyhow](error-audiences.md) | Error surfaces differ because their audiences do |

No entry is a universal recipe. The reusable lesson is the reasoning connecting a caller's constraints to a public signature.

## The comparisons that matter

Read cases in pairs when you need to make a decision:

- Compare `http::Request<T>` with `Bytes` to distinguish *payload representation* from *storage strategy*.
- Compare Reqwest with rustls to see why some builders defer failure while others expose stages in types.
- Compare Tower with Axum to see a low-level protocol become an ergonomic application surface.
- Compare Tower Retry with ArcSwap to see how APIs expose a capability only when a particular value can support it.
- Compare Serde with Clap to see how a shared intermediate model can support multiple producers and consumers.
- Compare thiserror with anyhow to see why a stable library boundary and an application diagnostic need different errors.

The individual chapters show code, alternatives, and evolution pressure. Start with [`http::Request<T>`](http-request.md) or choose the design problem closest to your own work.
