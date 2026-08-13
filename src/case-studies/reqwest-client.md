# Reqwest: progressive convenience

<p class="chapter-subtitle">A high-level client keeps the one-line path easy without hiding ownership, inspection, or replay limits.</p>

Reqwest's caller experience appears simple:

```rust
let user: User = reqwest::Client::new()
    .get("https://example.test/users/42")
    .send()
    .await?
    .error_for_status()?
    .json()
    .await?;
```

That convenience is layered rather than magical. The same builder can stop before I/O, expose the request for inspection, or fail to clone when a body cannot be replayed.

## The builder is an owned recipe

The public representation contains a reusable client and a request under construction:

```rust
#[must_use = "RequestBuilder does nothing until you 'send' it"]
pub struct RequestBuilder {
    client: Client,
    request: Result<Request, Error>,
}
```

The internal `Result` is the same broad technique used by `http::request::Builder`: setters remain chainable even when parsing headers or URLs can fail. The `#[must_use]` message adds a second contract. Creating a recipe and dropping it is usually a caller mistake, so the compiler warns in terms of the missing terminal action.

Both terminal methods consume the builder:

```rust
builder.build()  // Result<Request, Error>
builder.send()   // impl Future<Output = Result<Response, Error>>
```

Consumption prevents accidental reuse of a configuration that may contain a one-shot stream. It also lets `send` move the built request into the client without cloning.

## Convenience does not remove the lower level

`build(self)` is a crucial escape hatch. A caller can add auth in a common helper, build, inspect the URL and headers, mutate extensions, then call `Client::execute`. Good high-level APIs often remain composable because each convenience path bottoms out in an inspectable value.

```rust
let mut request = client
    .post(url)
    .json(&command)
    .build()?;

request.headers_mut().insert("x-trace-id", trace_id.parse()?);
let response = client.execute(request).await?;
```

## Replay is explicitly fallible

Reqwest does not implement `Clone` for `Request`. It exposes:

```rust
pub fn try_clone(&self) -> Option<Request>
```

An in-memory body can be reproduced. A live stream generally cannot. A universal `Clone` implementation would lie about that distinction, while a blanket absence of cloning would make ordinary retries unnecessarily hard. `try_clone` turns replayability into a runtime capability of this particular value.

Notice the consequence for retry design: you must preserve a replayable copy *before* the first attempt consumes the request.

```rust
let retry = request.try_clone();
let first = client.execute(request).await;

if should_retry(&first) {
    if let Some(request) = retry {
        return client.execute(request).await;
    }
}
first
```

## The error type protects evolution

`reqwest::Error` has a private boxed representation and public classifiers such as `is_timeout`, `is_connect`, and `is_status`. Callers can make operational decisions without matching an exhaustive enum tied to Hyper, TLS, DNS, or platform-specific details.

This trades exact pattern matching for compatibility. Reqwest can reorganize internal dependencies without making every downstream `match` a semver obligation. The error also offers `without_url()` because URLs may contain secrets—a reminder that debug and error representations are part of an API's security boundary.

## Rebuild the idea

Design a job client with two terminal paths:

```rust
struct JobBuilder {
    client: JobClient,
    job: Result<Job, BuildError>,
}

impl JobBuilder {
    fn build(self) -> Result<Job, BuildError> {
        self.job
    }

    async fn submit(self) -> Result<Receipt, SubmitError> {
        self.client.submit(self.job?).await
    }
}
```

Add `#[must_use]`, then decide:

- Which setters can fail, and when does the caller observe that error?
- Can a `Job` contain a one-shot input? If so, should it have `try_clone`?
- Which error classifications are stable promises to callers?
- Should `submit` return a future directly or be declared `async fn`?

## Source trail

- [`RequestBuilder` and its stored `Result`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L39-L44)
- [`Request::try_clone`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L145-L158)
- [`build` and `send`](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/async_impl/request.rs#L487-L538)
- [Private `Error` representation](https://github.com/seanmonstar/reqwest/blob/9f06fd28abe53e5ff84a091825ea5ce8984b51e0/src/error.rs#L20-L29)

> **Takeaway:** Convenience scales when callers can progressively descend from a fluent recipe to an owned, inspectable value without changing libraries.
