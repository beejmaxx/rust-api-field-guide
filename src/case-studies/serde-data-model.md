# Serde: put a data model in the middle

<p class="chapter-subtitle">Serialize data types and implement formats independently, avoiding an N-by-M integration matrix.</p>

Suppose five application types must support JSON, YAML, MessagePack, and a custom binary format. Direct conversion functions create twenty pairings. Serde inserts a shared data model between the two dimensions:

```text
application type ── Serialize ──► Serde data model
                                      │
                                      ▼ Serializer
                                    format
```

The reverse path uses `Deserializer`, `Visitor`, and `Deserialize`.

## Start from the caller

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct User {
    id: u64,
    name: String,
}

let json = serde_json::to_string(&User {
    id: 7,
    name: "Ada".into(),
})?;

let decoded: User = serde_json::from_str(&json)?;
```

The `User` type knows nothing about JSON. `serde_json` knows nothing about `User`. They agree on Serde's traits and data model.

## The small trait with a large fan-out

The serialization side begins with one method:

```rust
pub trait Serialize {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer;
}
```

The return and error types come from the chosen serializer. A JSON serializer can return its own success marker and error; another format does not have to erase errors into a global Serde type.

An implementation maps itself into one of the data model's categories by calling a serializer method. A struct implementation is conceptually:

```rust
impl Serialize for User {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        let mut state = serializer.serialize_struct("User", 2)?;
        state.serialize_field("id", &self.id)?;
        state.serialize_field("name", &self.name)?;
        state.end()
    }
}
```

Derive generates this repetitive mapping. It does not replace the trait design; it makes the trait pleasant for ordinary types.

## Why deserialization needs a visitor

Serialization begins with a known Rust value. Deserialization begins with format input whose next element might be a string, sequence, map, integer, or enum. `Deserialize<'de>` asks a deserializer to produce `Self`, usually by supplying a `Visitor<'de>` that declares which representations it accepts.

The `'de` lifetime is a powerful API promise. A deserialized value may borrow from the input:

```rust
#[derive(Deserialize)]
struct Event<'a> {
    kind: &'a str,
}
```

If the format can lend a slice of its input, `Event` avoids allocating a `String`. `DeserializeOwned` is the stronger boundary for callers that cannot permit borrowed output, such as reading from a temporary buffer.

## Attributes are a compatibility language

Serde attributes let a type adapt its wire representation without writing a full implementation:

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Account {
    user_id: u64,
    #[serde(default)]
    display_name: String,
}
```

These attributes are part of the public data contract. Renaming a Rust field can be nonbreaking when `#[serde(rename = "...")]` preserves the wire name. Adding a field can be compatible when a default exists. Derive ergonomics therefore sit on top of serious schema-evolution decisions.

## Rebuild the architecture

Create a tiny two-type data model:

```rust
trait Encode {
    fn encode<E: Encoder>(&self, encoder: E) -> Result<E::Ok, E::Error>;
}

trait Encoder: Sized {
    type Ok;
    type Error;

    fn text(self, value: &str) -> Result<Self::Ok, Self::Error>;
    fn number(self, value: i64) -> Result<Self::Ok, Self::Error>;
}
```

Implement `Encode` for `String` and `i64`, then implement one debug encoder. Observe the scaling property: adding a data type requires one `Encode` implementation; adding a format requires one `Encoder`. Neither dimension depends on every member of the other.

## Questions to defend

- Why is `Serializer` passed by value instead of `&mut S`? Implementations can choose whether the serializer itself is a reference, and consumption can encode a single-use session.
- Why does `Serialize` use a generic method instead of a trait object? Static dispatch supports formats with associated return/error types and avoids mandatory allocation.
- When should a library re-export Serde derives? Feature flags prevent forcing proc-macro dependencies or wire-format commitments on every user.
- What does a borrowed deserialization API require from the input buffer's lifetime?

## Source trail

- [`Serialize`](https://github.com/serde-rs/serde/blob/747814f7d5fbab872df3b02f070c165b91bde062/serde_core/src/ser/mod.rs#L225-L257)
- [`Serializer` and the Serde data model](https://github.com/serde-rs/serde/blob/747814f7d5fbab872df3b02f070c165b91bde062/serde_core/src/ser/mod.rs)
- [`Deserialize`, `Deserializer`, and `Visitor`](https://github.com/serde-rs/serde/blob/747814f7d5fbab872df3b02f070c165b91bde062/serde_core/src/de/mod.rs)

> **Takeaway:** When two open sets must interoperate, a stable intermediate protocol can turn pairwise integrations into independent implementations.
