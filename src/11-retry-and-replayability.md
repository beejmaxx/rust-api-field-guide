# Retry and replayability

<p class="chapter-subtitle">Tower and Reqwest make a hidden ownership problem part of the design.</p>

<div class="chapter-meta"><span>Advanced</span><span>tower::retry::Policy · reqwest::Request::try_clone · FnMut attempt factories</span></div>

## Retry means replay

The first service call consumes its request. A second attempt therefore needs another request. Requiring Req: Clone seems easy until a request contains a file stream, network stream, or one-shot channel receiver. Those values cannot be duplicated faithfully.

```rust
let result = service.call(request).await;
if result.is_err() {
    service.call(request).await // error: request was moved
}
```

## Make replayability explicit

Tower's `Policy` asks `clone_request(&Req) -> Option<Req>`. Reqwest exposes `Request::try_clone() -> Option<Request>`. Both avoid claiming that every request is `Clone`. `None` means the initial attempt may proceed but automatic retry is unavailable.

```rust
fn clone_request(&mut self, req: &Req) -> Option<Req>;

pub fn try_clone(&self) -> Option<Request>;
```

## Policy inspects responses too

A retry system that only sees errors misses protocol-level temporary failures. HTTP 503 is often `Ok(Response)`, not `Err`. Tower therefore gives `Policy` access to `Result<Response, Error>` and the request, allowing method safety, status, headers, and transport errors to influence the decision.

> **Design note**
>
> Fallible operations often have two failure layers: failure to complete the protocol, and a completed protocol response that asks the caller to try later.

## An alternative: recreate each attempt

For application APIs, accepting a closure can avoid cloning altogether. The closure rebuilds fresh owned input for every attempt. FnMut permits it to update attempt state; its returned Future performs one try.

```rust
async fn retry<F, Fut, T, E>(mut attempt: F) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    loop {
        match attempt().await {
            Ok(value) => return Ok(value),
            Err(error) if should_retry(&error) => backoff().await,
            Err(error) => return Err(error),
        }
    }
}
```

## Safety is semantic, not only mechanical

A request can be byte-for-byte replayable but unsafe to repeat. A payment POST may charge twice unless it carries an idempotency key. Retry APIs need policy hooks or documentation for semantic idempotency, attempt limits, total deadlines, backoff, and cancellation.

- Distinguish attempts from retries.
- Do not require Clone merely for implementation convenience.
- Inspect successful protocol responses as well as transport errors.
- Prefer a total deadline over independent per-attempt timeouts.
- Make exhausted retry information available without hiding the final cause.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Tower Policy](https://github.com/tower-rs/tower/blob/master/tower/src/retry/policy.rs)
- [Tower retry state machine](https://github.com/tower-rs/tower/blob/master/tower/src/retry/future.rs)
- [Reqwest Request](https://github.com/seanmonstar/reqwest/blob/master/src/async_impl/request.rs)
