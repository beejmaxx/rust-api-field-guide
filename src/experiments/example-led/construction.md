# B2 · Construction safety in production

<p class="chapter-subtitle">Two excellent builders make opposite choices because omission has a different cost.</p>

Comparative source reading is more useful than collecting patterns. `http::request::Builder` and rustls's `ConfigBuilder` both support fluent construction, but only one makes stages visible in its type. The interesting question is not “which builder pattern is best?” It is “what property justifies each cost?”

## Case one: `http::request::Builder`

A normal call site is linear:

```rust
let request = Request::builder()
    .method("POST")
    .uri("/publish")
    .header("content-type", "application/json")
    .body(payload)?;
```

`method`, `uri`, and `header` accept convenient inputs whose conversions may fail. Yet the setters return `Self`, not `Result<Self, _>`. The builder keeps an internal `Result<Parts>` and the terminal `body` observes it.

What this optimizes:

- one obvious common path;
- fallible conversion without `?` after every setter;
- a non-generic builder type that is easy to store and pass around;
- runtime configuration, where invalid data must be reported at runtime anyway.

What it permits: a chain can omit required information until the terminal operation returns an error.

## Case two: rustls `ConfigBuilder<Side, State>`

TLS configuration contains decisions whose omission or accidental default can undermine security. rustls models meaningful construction phases in a type parameter. Methods consume one builder state and return another; final configuration methods exist only for valid later states.

Conceptually:

```rust
ConfigBuilder<ClientConfig, WantsVerifier>
    -> ConfigBuilder<ClientConfig, WantsClientCert>
    -> ClientConfig
```

What this optimizes:

- required decisions are visible in autocomplete and diagnostics;
- invalid ordering is unrepresentable;
- after transition, later code can rely on the chosen capability;
- security-relevant defaults cannot be silently inferred.

What it costs:

- more public types and longer compiler messages;
- additional compatibility surface as phases evolve;
- awkwardness when many independent options would create a state explosion.

## Compare, do not rank

| Design pressure | Stored-result builder | Typestate builder |
|---|---|---|
| Inputs mostly arrive at runtime | Natural | Cannot prove the file contained a value |
| Few stable mandatory phases | Works, but reports omission late | Strong fit |
| Many independent optional knobs | Strong fit | State explosion risk |
| Omission is security-critical | Detectable | Preventable |
| Need all validation failures together | Use an error collection | Type errors report one path at a time |
| Public API evolution | Fewer exposed types | State graph becomes compatibility surface |

The usual production answer is hybrid: parse dynamic input into a validated value, then use a phase type so the active system cannot be constructed from unvalidated configuration.

## Source notebook

For `http`, record that the caller owns a fluent value and observes conversion failure at the terminal operation. The implementation may change the representation behind private fields.

For rustls, record that the caller owns a sequence of distinct values. The compiler prevents skipping meaningful decisions, but the crate publicly commits to the availability of transitions.

## Transfer

Choose a design and defend it in one sentence for each:

1. A query with any number of optional filters.
2. A cipher that must receive a key before encryption.
3. A UI form that should display every invalid field simultaneously.
4. A server whose address comes from the environment and must be validated before `run`.

Inspect the pinned [`http` builder representation](https://github.com/hyperium/http/blob/4d18d3ea731c6267ce0d26bc04ae394a786ed3f0/src/request.rs#L186-L194) and [rustls builder states](https://github.com/rustls/rustls/blob/b2035cc0f5576e3511479ef64dbfbfc55847fd19/rustls/src/builder.rs#L31-L100), then continue to [B3 · Replayable retry in production](11-retry-and-replayability.md).
