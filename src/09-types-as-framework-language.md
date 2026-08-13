# Types as framework language

<p class="chapter-subtitle">Axum turns ordinary function parameters and return values into an extensible HTTP vocabulary.</p>

<div class="chapter-meta"><span>Intermediate</span><span>axum::FromRequest · FromRequestParts · IntoResponse · Router&lt;S&gt;</span></div>

## The handler is the API

Framework users spend most of their time writing handlers, so Axum optimizes that surface. A handler is an ordinary async function. Its parameters declare what should be extracted from the request; its return value declares how to construct a response.

```rust
async fn update_user(
    State(db): State<Database>,
    Path(id): Path<UserId>,
    Json(input): Json<UpdateUser>,
) -> Result<Json<User>, AppError> { … }
```

## Extraction through traits

FromRequestParts handles values available without consuming the body: method, URI, headers, path parameters, and state. FromRequest may consume the body. Splitting these traits makes a critical invariant visible: a streaming request body can generally be consumed only once.

> **Design note**
>
> Trait implementations let applications introduce new extractors without the framework owning every possible parameter type.

## Conversion on the way out

`IntoResponse` plays the inverse role. Strings, status codes, headers, JSON wrappers, tuples, and application types can become responses. A `Result<T, E>` becomes a response when both `T` and `E` implement `IntoResponse`.

The handler remains domain-shaped while protocol conversion happens at the edge.

```rust
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        (status, Json(self.public_body())).into_response()
    }
}
```

## State in the type system

`Router<S>` uses its generic state parameter to track missing state. Adding routes that require `AppState` yields a `Router<AppState>`; supplying the state produces a router ready to serve. The type guides assembly while handler signatures stay simple.

- Optimize the API surface users repeat most.
- Use conversion traits at framework boundaries.
- Represent one-shot resources, such as bodies, distinctly.
- Let application-defined types join the framework vocabulary.
- Keep protocol mechanics out of business logic.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Axum repository](https://github.com/tokio-rs/axum)
- [Extract traits](https://github.com/tokio-rs/axum/blob/main/axum-core/src/extract/mod.rs)
- [IntoResponse](https://github.com/tokio-rs/axum/blob/main/axum-core/src/response/into_response.rs)
