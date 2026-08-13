# Async capabilities

<p class="chapter-subtitle">Tokio and futures-rs keep low-level poll contracts separate from everyday methods.</p>

<div class="chapter-meta"><span>Intermediate</span><span>60 min read</span><span>tokio::io::AsyncRead · AsyncReadExt · futures::Stream · StreamExt</span></div>

## Async is a return-type decision

An async fn is syntax for a function returning a Future. The future stores suspended state and advances when polled. Public async API design therefore includes cancellation, borrowing across await points, Send requirements, and runtime assumptions—even when the signature looks simple.

```rust
async fn read_message(&mut self) -> io::Result<Message>

// conceptually
fn read_message(&mut self)
    -> impl Future<Output = io::Result<Message>> + '_
```

## Minimal poll trait, rich extension trait

AsyncRead defines the low-level capability needed by runtimes and adapters. AsyncReadExt is blanket-implemented for AsyncRead types and adds friendly methods such as read, read_exact, and read_to_end.

This keeps implementer burden small and lets convenience methods evolve separately. It also avoids making the foundational trait enormous.

```rust
pub trait AsyncRead {
    fn poll_read(self: Pin<&mut Self>, cx: &mut Context<'_>, buf: &mut ReadBuf<'_>)
        -> Poll<io::Result<()>>;
}

reader.read_to_end(&mut bytes).await?; // AsyncReadExt
```

## Stream is an asynchronous Iterator

Stream reuses a familiar shape: items arrive one at a time, and None marks completion. Poll adds the third state needed for async work: not ready yet. StreamExt supplies map, filter, next, buffer, and other combinators.

```rust
pub trait Stream {
    type Item;
    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>)
        -> Poll<Option<Self::Item>>;
}
```

## Cancellation lives at await points

Dropping a future cancels it. An API must decide whether partial work is safe to abandon. Reading some bytes into a buffer and then cancelling may leave the stream advanced. Documentation should distinguish cancellation-safe operations from those that can lose framing or state.

> **Design note**
>
> Async ergonomics are not only about adding .await. State what happens when the future is dropped.

## Design rule

- Keep foundational async traits minimal.
- Put conveniences in extension traits.
- Avoid exposing a runtime unless the operation truly requires it.
- Document cancellation behavior.
- Add Send bounds only where execution may cross threads.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Tokio AsyncReadExt](https://github.com/tokio-rs/tokio/blob/master/tokio/src/io/util/async_read_ext.rs)
- [futures-rs](https://github.com/rust-lang/futures-rs)
