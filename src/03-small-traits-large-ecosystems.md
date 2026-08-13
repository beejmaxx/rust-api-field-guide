# Small traits, large ecosystems

<p class="chapter-subtitle">Iterator demonstrates how one required method can support a language-wide vocabulary.</p>

<div class="chapter-meta"><span>Foundation</span><span>50 min read</span><span>std::Iterator · IntoIterator · FromIterator</span></div>

## The irreducible operation

Iterator requires one method: next. Everything else—map, filter, zip, enumerate, take, collect—is provided in terms of that operation. This keeps implementation burden small while giving users a rich, consistent interface.

```rust
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // dozens of provided methods
}
```

## Why Item is an associated type

An `Iterator` implementation has one natural item type. An associated type expresses that one-to-one relationship. If `Item` were a generic parameter, a single iterator type could theoretically implement `Iterator<String>` and `Iterator<Vec<u8>>`, making inference and method calls ambiguous.

> **Design note**
>
> Use an associated type when an implementation determines one output type. Use a generic parameter when the same implementer should support many input types.

## Laziness preserves choice

`map` does not allocate a new collection. It returns `Map<I, F>`, a small value containing the original iterator and closure. Work happens only when `next` is requested. Because adapters remain iterators, they compose without intermediate buffers.

```rust
let active_names = users.iter()
    .filter(|u| u.active)
    .map(|u| u.name.as_str())
    .take(10);
// no iteration has happened yet
```

## Three ownership modes

Collections commonly expose iter(), iter_mut(), and into_iter(). The yielded item type tells the ownership story: &T, &mut T, or T. The algorithm stays the same while the caller chooses observation, mutation, or consumption.

```rust
values.iter()       // Item = &T
values.iter_mut()   // Item = &mut T
values.into_iter()  // Item = T
```

## Design rule

- Find the smallest required behavior.
- Put conveniences in provided methods or extension traits.
- Return adapters instead of allocating eagerly when work can be lazy.
- Make ownership mode visible in the yielded type.
- Choose names that join ecosystem vocabulary: iter, collect, extend, into_iter.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Iterator trait](https://github.com/rust-lang/rust/blob/master/library/core/src/iter/traits/iterator.rs)
- [Iterator adapters](https://github.com/rust-lang/rust/tree/master/library/core/src/iter/adapters)
