# A shared conversion vocabulary

<p class="chapter-subtitle">From, TryFrom, AsRef, and Borrow make boundaries flexible without becoming vague.</p>

<div class="chapter-meta"><span>Foundation</span><span>From / Into · TryFrom / TryInto · AsRef · Borrow</span></div>

## Do not invent a private conversion language

A crate could define to_widget, make_widget, as_widget, and parse_widget. But Rust already gives those names semantic weight. Implementing standard conversion traits makes APIs predictable and unlocks generic interoperability.

```rust
impl From<UserId> for u64 { … }
impl TryFrom<u64> for Port { type Error = PortError; … }
fn open(path: impl AsRef<Path>) { … }
```

## Infallible versus fallible

`From<T>` promises that every `T` can become `Self` without failure or information loss significant enough to surprise callers. `TryFrom<T>` exposes an `Error` when validation is necessary. Do not implement `From` and panic for rejected values; that breaks the trait's semantic promise.

> **Design note**
>
> If conversion can fail, make failure part of the type—even when most inputs succeed.

## Owned conversion versus borrowed view

`From` consumes or copies a value to produce another owned value. `AsRef` cheaply exposes a borrowed reference. A function generic over `AsRef<Path>` is not asking callers to convert ownership; it asks for a view for the duration of the call.

```rust
fn parse(bytes: impl AsRef<[u8]>) -> Result<Message, Error> {
    parse_inner(bytes.as_ref())
}
```

## Borrow is stronger than AsRef

`Borrow<T>` promises that borrowed equality, ordering, and hashing behave exactly like the owned value. `HashMap` uses this to let a `HashMap<String, V>` be queried with `&str`. `AsRef` only promises a cheap reference conversion and carries no equivalence law.

```rust
let mut map: HashMap<String, usize> = HashMap::new();
map.insert("rust".into(), 1);
assert_eq!(map.get("rust"), Some(&1));
```

## Design rule

- Use From for obvious, lossless, infallible conversions.
- Use TryFrom when validation belongs at the boundary.
- Use AsRef for flexible borrowed inputs.
- Use Borrow when borrowed and owned forms must compare and hash identically.
- Avoid stacking Into bounds everywhere; generic flexibility should pay for itself at call sites.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [std::convert](https://github.com/rust-lang/rust/blob/master/library/core/src/convert/mod.rs)
- [std::borrow](https://github.com/rust-lang/rust/blob/master/library/core/src/borrow.rs)
