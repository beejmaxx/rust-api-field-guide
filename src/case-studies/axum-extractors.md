# Axum: handler arguments are a program

<p class="chapter-subtitle">Request extraction and response conversion turn ordinary function signatures into a typed web framework language.</p>

An Axum handler can look like application code rather than framework plumbing:

```rust
async fn update_user(
    State(db): State<Database>,
    Path(id): Path<UserId>,
    Json(input): Json<UpdateUser>,
) -> Result<Json<User>, AppError> {
    let user = db.update(id, input).await?;
    Ok(Json(user))
}
```

The signature is executable configuration. Each argument names how to obtain a value from the request; the return type names how to turn the result back into HTTP.

## Two extraction traits encode body consumption

Axum separates extractors that need only metadata from extractors that may consume the body:

```rust
pub trait FromRequestParts<S>: Sized {
    type Rejection: IntoResponse;

    fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send;
}

pub trait FromRequest<S>: Sized {
    type Rejection: IntoResponse;

    fn from_request(
        request: Request,
        state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send;
}
```

Headers, method, URI, and matched route can be inspected repeatedly through `FromRequestParts`. JSON or a raw body consumes the owned request and can run only once. Handler tuple implementations enforce that a body-consuming extractor appears last. A runtime fact—there is one body—becomes a compile-time rule in handler signatures.

## Rejections keep edge errors local

Each extractor chooses an associated `Rejection: IntoResponse`. Invalid path syntax, missing state, and malformed JSON have different concrete errors, but all can cross the HTTP boundary. A custom extractor can keep a precise rejection type without forcing every handler into one framework-wide error enum.

```rust
struct ApiKey(String);

impl<S> FromRequestParts<S> for ApiKey
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let value = parts.headers
            .get("x-api-key")
            .and_then(|v| v.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;

        Ok(ApiKey(value.to_owned()))
    }
}
```

This extractor correctly implements `FromRequestParts`: it needs headers, not the body. That means it can coexist with `Json<T>` later in the handler.

## `IntoResponse` is the inverse vocabulary

```rust
pub trait IntoResponse {
    fn into_response(self) -> Response;
}
```

Strings, status codes, header collections, JSON wrappers, tuples, and application errors implement this conversion. Handler authors compose those implementations rather than constructing `Response<Body>` manually.

Consuming `self` is appropriate: the returned response owns the status, headers, and body. A borrowed conversion would force response data to remain tied to a handler-local value.

## `Router<S>` tracks missing state

The router's generic parameter is easy to misread. `Router<AppState>` means the router still *needs* `AppState`; after `.with_state(state)`, the resulting router can often be served as `Router<()>`. The type parameter guides assembly and prevents serving a router whose handlers require unsupplied state.

This is typestate used at framework scale, but the typestate stays mostly outside handler code.

## Rebuild the idea

Create a tiny command framework:

```rust
trait FromInput<C>: Sized {
    type Error;
    fn from_input(input: &mut Input, context: &C)
        -> Result<Self, Self::Error>;
}

trait IntoOutput {
    fn into_output(self) -> Output;
}
```

Implement `FromInput` for a flag, an argument, and shared state. Then write an adapter for a two-argument function. You will encounter the same design questions as Axum: extraction order, failure conversion, ownership of consumed input, and tuple implementation limits.

## Questions to defend

- Why is state borrowed while the request is owned?
- Why is a rejection associated with the extractor rather than fixed by the framework?
- Which extractor failures belong in an application error versus an HTTP rejection?
- What diagnostics should appear when a handler argument lacks the required trait?

## Source trail

- [`FromRequestParts` and `FromRequest`](https://github.com/tokio-rs/axum/blob/151cd5c12325373b86daf405a6afc0a0086a6706/axum-core/src/extract/mod.rs#L53-L108)
- [`IntoResponse`](https://github.com/tokio-rs/axum/blob/151cd5c12325373b86daf405a6afc0a0086a6706/axum-core/src/response/into_response.rs#L112-L120)
- [`Router<S>`](https://github.com/tokio-rs/axum/blob/151cd5c12325373b86daf405a6afc0a0086a6706/axum/src/routing/mod.rs)
- [A complete TODO example](https://github.com/tokio-rs/axum/blob/151cd5c12325373b86daf405a6afc0a0086a6706/examples/todos/src/main.rs)

> **Takeaway:** A framework feels declarative when ordinary Rust types describe resource access, consumption order, failure, and output conversion.
