# Separate data from formats

<p class="chapter-subtitle">Serde divides responsibility so data types and wire formats can evolve independently.</p>

<div class="chapter-meta"><span>Intermediate</span><span>serde::Serialize · serde::Deserialize · serde::Serializer · Visitor</span></div>

## The matrix problem

Suppose ten domain types each need JSON, TOML, and a binary format. If every type implements to_json, to_toml, and to_binary, work grows as types × formats. Serde splits the matrix: data types describe structure through Serialize; formats implement Serializer.

```rust
pub trait Serialize {
    fn serialize<S>(&self, serializer: S)
        -> Result<S::Ok, S::Error>
    where S: Serializer;
}
```

## The serializer owns format decisions

A User knows that it has an id and name. It should not know whether JSON uses braces or a binary format uses length prefixes. Serializer exposes operations such as serialize_bool, serialize_str, and serialize_struct. Its associated Ok and Error types let each format choose its natural output and failure representation.

> **Design note**
>
> Separate stable semantic structure from changeable representation details.

## Why deserialization is harder

Serialization walks a value the program already owns. Deserialization must construct an unknown type from an input stream, possibly borrowing slices directly from that input. Serde's Visitor says which shapes a destination accepts; a Deserializer drives the visitor with available input.

```rust
impl<'de> Deserialize<'de> for Name<'de> {
    fn deserialize<D>(d: D) -> Result<Self, D::Error>
    where D: Deserializer<'de> {
        d.deserialize_str(NameVisitor)
    }
}
```

## Derive is the ergonomic layer

The core traits are powerful but verbose. #[derive(Serialize, Deserialize)] generates implementations from a struct or enum definition. Attributes handle naming, defaults, flattening, and enum representation. This is a good macro use: it removes structural repetition while leaving behavior governed by normal traits.

- Keep the core protocol trait-based and usable without macros.
- Use derive for predictable structural implementations.
- Let formats own their error and output types.
- Preserve borrowing when input lifetime can safely flow into output.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Serde repository](https://github.com/serde-rs/serde)
- [Serialize source](https://github.com/serde-rs/serde/blob/master/serde/src/ser/mod.rs)
- [Deserialize source](https://github.com/serde-rs/serde/blob/master/serde/src/de/mod.rs)
