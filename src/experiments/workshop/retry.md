# C3 · Design replay-safe retry

<p class="chapter-subtitle">Design retry from ownership and protocol semantics before choosing a loop or timer.</p>

Your asynchronous sender owns its request:

```rust
async fn submit<B>(request: JobRequest<B>)
    -> Result<Receipt, SubmitError>;
```

The product now asks for automatic retry of temporary failures.

## Round 1: ask requirements before types

Write at least five questions. Your list should cover safety, classification, timing, counting, and request reproduction.

<details>
<summary>Questions a strong design needs answered</summary>

- Which operations are idempotent, or carry an idempotency key?
- Can a retryable condition be an `Ok(response)`?
- Is the limit total attempts or additional retries?
- Who controls delay and which async runtime is available?
- Can each input be replayed, reopened, or regenerated?
- Must retry be transparent middleware or an application helper?
- What final failure information must callers inspect?
- Are cancellation and global retry budgets requirements?

</details>

## Round 2: reject unconditional `Clone`

The body may be buffered bytes, a file stream, or a one-shot receiver. A blanket `B: Clone` rejects useful first attempts. A dishonest clone of a stream handle would not reproduce consumed bytes.

**Stop and design:** allow every request one attempt and only replayable values another. Write a value-level capability.

<details>
<summary>Compare</summary>

```rust
pub trait TryReplay: Sized {
    fn try_replay(&self) -> Option<Self>;
}
```

Prepare the replay value before moving the original. `None` is an ordinary inability, so the current result is returned rather than turning replay absence into a transport error.

</details>

## Round 3: let the caller recreate attempts

The application can reopen a file from a path and rebuild authentication metadata. Design a retry helper around an attempt factory. Include the attempt number and avoid boxing the future unless necessary.

<details>
<summary>Compare a signature</summary>

```rust
pub async fn retry<F, Fut, T, E>(
    mut attempt: F,
    max_attempts: NonZeroUsize,
) -> Result<T, E>
where
    F: FnMut(usize) -> Fut,
    Fut: Future<Output = Result<T, E>>;
```

`FnMut` permits per-session state. The concrete `Fut` gives static dispatch. An application may box for heterogeneous factories stored at runtime.

</details>

## Round 4: classify the whole outcome

HTTP 503 and 429 are `Ok(Response)`. POST may be unsafe while GET is safe. A rate-limit response may specify a delay.

**Stop and design:** write a policy decision and classification signature. Do not couple it unnecessarily to Tokio.

<details>
<summary>Compare two levels</summary>

A small application API can return data:

```rust
enum RetryDecision {
    Return,
    RetryAfter(Duration),
}
```

A runtime-neutral infrastructure policy can return a future:

```rust
fn retry(
    &mut self,
    request: &mut Req,
    result: &mut Result<Res, E>,
) -> Option<Self::Future>;
```

The future can wait for a timer, permit, or readiness condition.

</details>

## Round 5: choose the right abstraction boundary

Defend one of these for each context:

- Reqwest-style `try_clone` for a finished request;
- an attempt factory for application code retaining durable inputs;
- a Tower-style policy for transparent service middleware.

There is no universal winner. The caller's available information determines the API.

## Retrieval round

Close the checkpoints and write from memory:

1. one factory signature;
2. why classification sees responses as well as errors;
3. why request reproduction happens before the first move;
4. the difference between “three retries” and “three attempts.”

Compare with [Reqwest `Request::try_clone`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L145-L158) and [Tower `Policy`](https://github.com/tower-rs/tower/blob/df06d70dbea345facbffb5881fe8647f53bf424d/tower/src/retry/policy.rs#L46-L90), then take the [common final challenge](experiments/final-challenge.md).
