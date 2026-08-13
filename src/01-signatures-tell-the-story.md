# 1. Signatures tell the story

<p class="chapter-subtitle">Option and Result show how a return type can document an entire operation.</p>

<div class="chapter-meta"><span>Foundation</span><span>35 min read</span><span>std::Option · std::Result</span></div>

## Begin at the boundary

When you study a Rust API, resist the urge to open its implementation first. Begin with the signature. It is the contract every caller sees, and in Rust that contract can say unusually precise things: whether an input is borrowed, whether failure is expected, whether mutation occurs, and whether a value can be absent.

Consider a user lookup. A return type of `User` promises that a user always exists. `Option<User>` says that absence is normal and carries no further explanation. `Result<User, LoadError>` says the operation can fail and that callers may need to distinguish kinds of failure. The implementation did not change, but the API's meaning did.

```rust
fn cached_user(id: UserId) -> Option<User>
fn load_user(id: UserId) -> Result<User, LoadError>
```

## The tempting first design

New APIs often use sentinel values: an empty string, -1, null, or a Boolean paired with an output parameter. These designs make callers remember conventions that the compiler cannot check.

```rust
// What does an empty string mean?
fn find_name(id: u64) -> String

// Can `name` be read when this is false?
fn find_name(id: u64, name: &mut String) -> bool
```

> **Design note**
>
> A good Rust API moves important conventions out of documentation and into types.

## Why Option composes

Option is more than a two-way branch. Its methods describe transformations that preserve absence. map transforms only Some. and_then chains an operation that may itself return None. as_ref borrows the value inside without consuming the Option.

```rust
let domain = user
    .as_ref()
    .and_then(|u| u.email.as_deref())
    .and_then(|email| email.split_once('@'))
    .map(|(_, domain)| domain);
```

## Why Result keeps the error generic

`Result<T, E>` does not prescribe one universal error. A parser can return `ParseError`, a library can return a stable domain error, and an application can aggregate several sources. The question mark operator works because errors can be converted at the boundary.

Notice the symmetry: map changes success, map_err changes failure, and and_then sequences another fallible operation. A tiny enum becomes a shared vocabulary across the ecosystem.

```rust
fn read_config(path: &Path) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path)?;
    let config = text.parse()?;
    Ok(config)
}
```

## Design rule

> **Design note**
>
> Next: the input side of the contract—who owns each value?

- Use Option when there is one unsurprising kind of absence.
- Use Result when callers benefit from knowing why the operation did not produce a value.
- Do not erase useful errors merely to shorten a signature.
- Treat panics as invariant violations, not ordinary control flow.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Option source](https://github.com/rust-lang/rust/blob/master/library/core/src/option.rs)
- [Result source](https://github.com/rust-lang/rust/blob/master/library/core/src/result.rs)
