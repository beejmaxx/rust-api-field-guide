# A3 · Retry meets consumed input

<p class="chapter-subtitle">The moment an operation consumes input, retry becomes a design for reproduction rather than repetition.</p>

Your client submits a request asynchronously:

```rust
async fn submit<B>(request: JobRequest<B>)
    -> Result<Receipt, SubmitError>;
```

Some network errors are temporary. The first retry helper seems obvious:

```rust
async fn retry<B>(request: JobRequest<B>) -> Result<Receipt, SubmitError> {
    match submit(request).await {
        Ok(receipt) => Ok(receipt),
        Err(_) => submit(request).await,
    }
}
```

It does not compile: the first `submit` consumes `request`.

## Pressure 1: require `Clone`

You can preserve a second request:

```rust
async fn retry<B: Clone>(request: JobRequest<B>)
    -> Result<Receipt, SubmitError>
{
    let second = request.clone();
    match submit(request).await {
        Ok(receipt) => Ok(receipt),
        Err(_) => submit(second).await,
    }
}
```

This is correct for in-memory bodies. It excludes a file stream or one-shot channel receiver. Adding a dishonest `Clone` implementation would duplicate a handle, not reproduce the consumed sequence.

### Your move

Keep the initial attempt available for every request while enabling retry only when this value can be reproduced.

<details>
<summary>Checkpoint</summary>

One design makes replay explicitly fallible:

```rust
trait TryReplay: Sized {
    fn try_replay(&self) -> Option<Self>;
}

let replay = request.try_replay();
let first = submit(request).await;

if retryable(&first) {
    if let Some(request) = replay {
        return submit(request).await;
    }
}

first
```

The replay copy must be prepared before the original moves.

</details>

Reqwest exposes this value-level capability as `Request::try_clone() -> Option<Request>` rather than claiming every request implements `Clone`.

## Pressure 2: the caller can recreate attempts

For application code, retaining a built request may be less natural than retaining durable inputs. Accept a factory:

```rust
async fn retry<F, Fut, T, E>(mut attempt: F, max_attempts: usize)
    -> Result<T, E>
where
    F: FnMut(usize) -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    for number in 1..=max_attempts {
        match attempt(number).await {
            Ok(value) => return Ok(value),
            Err(error) if number == max_attempts => return Err(error),
            Err(_) => {}
        }
    }
    unreachable!()
}
```

The closure can reopen a file, regenerate a body, or acquire a fresh connection. It also makes each attempt number explicit. But it changes the caller-facing abstraction: transparent middleware receiving a finished request cannot demand that its caller provide a factory.

## Pressure 3: not every retryable failure is `Err`

HTTP 503 and rate-limit responses are often `Ok(Response)`. Classification must inspect the full result, and often the request method too:

```rust
enum Decision {
    Return,
    RetryAfter(Duration),
}

fn classify(
    request: &JobRequest<impl Sized>,
    result: &Result<Response, SubmitError>,
) -> Decision;
```

An infrastructure library can go further and return a future rather than a duration, permitting runtime-independent waiting. Tower's policy returns `Option<Future<Output = ()>>` and receives mutable access to both request and result.

## Pressure 4: count what?

“Retries: 3” usually means one initial attempt plus three retries. “Maximum attempts: 3” means three calls total. Pick one term, document it, and consider `NonZeroUsize` if zero has no meaning. Off-by-one ambiguity is API ambiguity.

## Production reveal

- [Reqwest `Request::try_clone`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L145-L158) makes replay value-dependent.
- [Tower `Policy`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/policy.rs#L46-L90) combines classification, waiting, request reproduction, and per-call state for transparent middleware.

## Retrieval check

Close this page and write:

1. A closure-factory retry signature.
2. One reason a full response must reach classification.
3. One situation where `try_clone` is the better interface.
4. One situation where a factory is better.

Then complete the [common final challenge](experiments/final-challenge.md) without reopening this chapter.
