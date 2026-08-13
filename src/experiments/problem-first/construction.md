# A2 · Construction becomes dangerous

<p class="chapter-subtitle">Construction should become stricter only as omitted information becomes more costly.</p>

Your generic request needs a URI-like destination and optional headers. The shortest constructor is becoming unreadable:

```rust
JobRequest::new(topic, endpoint, headers, timeout, body)
```

Several arguments share types, most are optional, and endpoint parsing can fail. You replace it with a builder:

```rust
JobRequest::builder()
    .topic("index")
    .endpoint("worker://primary")
    .timeout(Duration::from_secs(2))
    .body(command)?
```

## Pressure 1: fluent setters can fail

If `.endpoint(&str)` parses a structured endpoint, this return type is honest but awkward:

```rust
builder.endpoint(text)?
    .timeout(duration)
    .body(command)?;
```

Worse, every later setter would need to exist on `Result<Builder, Error>` or every call would require `?`.

### Your move

Keep the ordinary chain fluent without panicking or discarding parse errors.

<details>
<summary>Checkpoint</summary>

Store the construction state as a result:

```rust
pub struct Builder {
    inner: Result<Parts, BuildError>,
}

impl Builder {
    pub fn endpoint(mut self, value: &str) -> Self {
        if let Ok(parts) = &mut self.inner {
            match value.parse() {
                Ok(endpoint) => parts.endpoint = Some(endpoint),
                Err(error) => self.inner = Err(BuildError::Endpoint(error)),
            }
        }
        self
    }

    pub fn body<B>(self, body: B) -> Result<JobRequest<B>, BuildError> {
        let parts = self.inner?;
        Ok(JobRequest::from_parts(parts, body))
    }
}
```

</details>

This design postpones error observation to the terminal method. It favors a concise common path and normally preserves the first failure. Accumulating every validation error would require a different internal representation and may be better for user-authored forms.

## Pressure 2: endpoint is security-critical

Now a missing endpoint does not merely produce a malformed value. Falling back to an implicit destination could send sensitive jobs to the wrong service. A runtime `BuildError::MissingEndpoint` is detectable, but you want code that omits the decision not to compile.

### Your move

Make `build` unavailable until an endpoint has been supplied.

<details>
<summary>Checkpoint</summary>

```rust
pub struct MissingEndpoint;
pub struct Ready;

pub struct Builder<State> {
    parts: Parts,
    state: PhantomData<State>,
}

impl Builder<MissingEndpoint> {
    pub fn endpoint(self, endpoint: Endpoint) -> Builder<Ready> {
        Builder {
            parts: Parts { endpoint: Some(endpoint), ..self.parts },
            state: PhantomData,
        }
    }
}

impl Builder<Ready> {
    pub fn body<B>(self, body: B) -> JobRequest<B> {
        JobRequest::from_parts(self.parts, body)
    }
}
```

</details>

Typestate removes one runtime error and adds public type structure. That is a trade, not an automatic upgrade.

## Choose based on the source of configuration

If configuration comes from a runtime file, the compiler cannot prove the endpoint key exists. You still need validation while parsing. Typestate helps after validation by ensuring the rest of the program receives only a ready value.

If the builder has twenty independent optional preferences, twenty state dimensions would be intolerable. Use typestate for a few stable, meaningful phases; use ordinary setters and a fallible terminal method for dynamic or combinatorial validation.

## Production reveal

`http::request::Builder` stores `Result<Parts>` internally so fallible conversions remain fluent. [Read its representation](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L186-L194).

rustls uses `ConfigBuilder<Side, State>` for security-relevant phases such as choosing certificate verification and authentication. [Read the builder states](https://github.com/rustls/rustls/blob/b2035cc0f5576e3511479ef64dbfbfc55847fd19/rustls/src/builder.rs#L31-L100).

Both are good APIs because they face different costs of omission.

## Decision test

Choose runtime validation, typestate, or a hybrid for each case and write one sentence why:

1. A database query builder with arbitrary optional predicates.
2. An encryption session that must choose a key before `encrypt` exists.
3. A form editor that should show all invalid fields at once.
4. A server whose address comes from environment variables but whose running state must always be validated.

Proceed to [A3 · Retry meets consumed input](11-retry-and-replayability.md).
