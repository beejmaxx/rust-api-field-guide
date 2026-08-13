# Bytes: cheap views over shared storage

<p class="chapter-subtitle">An immutable byte value makes slicing cheap by sharing storage while keeping ownership explicit.</p>

Network protocols constantly split buffers into frames, headers, and payloads. Copying every slice is simple but expensive. Borrowing `&[u8]` is cheap but ties every result to the original buffer's lifetime. `bytes::Bytes` offers an owned value whose clones and slices can share storage.

## Use it first

```rust
use bytes::Bytes;

let frame = Bytes::from_static(b"HEADpayload");
let header = frame.slice(..4);
let payload = frame.slice(4..);

drop(frame);

assert_eq!(&header[..], b"HEAD");
assert_eq!(&payload[..], b"payload");
```

Both results survive after `frame` is dropped. They are not borrows. They are small owned handles into shared immutable storage.

## The API separates view changes from byte changes

Important operations include:

```rust
bytes.slice(range)       // another view; original unchanged
bytes.split_to(at)       // removes and returns the prefix
bytes.split_off(at)      // removes and returns the suffix
bytes.clone()            // cheap shared ownership
```

The receivers communicate semantics. `slice(&self, ...)` creates another view without changing this handle. `split_to(&mut self, ...)` changes which region this handle represents while returning the removed region. Neither operation promises to copy the underlying bytes.

The value behaves like a collection at the surface—length, indexing, `AsRef<[u8]>`—while its ownership model differs from `Vec<u8>`. Familiar vocabulary reduces the amount a caller must relearn.

## Why immutability unlocks sharing

If two `Bytes` handles could mutate overlapping storage freely, a change through one view would surprise readers of the other and require synchronization. Immutable access makes structural sharing safe and cheap. Mutation lives in `BytesMut`, which has different invariants and conversion points.

This split is a general API technique:

- immutable type: clone and slice cheaply;
- mutable type: unique or controlled write access;
- explicit transition: freeze mutable storage into an immutable value.

## Build a simplified shared slice

```rust
use std::{ops::Range, sync::Arc};

#[derive(Clone)]
struct SharedBytes {
    data: Arc<[u8]>,
    range: Range<usize>,
}

impl SharedBytes {
    fn new(data: Vec<u8>) -> Self {
        let data: Arc<[u8]> = data.into();
        let range = 0..data.len();
        Self { data, range }
    }

    fn as_slice(&self) -> &[u8] {
        &self.data[self.range.clone()]
    }

    fn slice(&self, range: Range<usize>) -> Self {
        assert!(range.end <= self.range.len());
        let start = self.range.start + range.start;
        let end = self.range.start + range.end;
        Self { data: self.data.clone(), range: start..end }
    }
}
```

This teaches the ownership model but omits production concerns: static storage, compact representations, vtables for different backing stores, bounds ergonomics, and optimized conversions.

## Contract versus implementation

“Cheap clone” is an important documented expectation, but callers should avoid depending on the exact representation. The public API exposes behavior—shared immutable bytes and efficient slicing—not an `Arc<[u8]>` field. That allows the crate to optimize static and owned buffers differently.

## Questions to defend

- Should `slice` panic for an invalid range or return `Result`? Collection indexing conventions influence predictability.
- When is `&[u8]` still better? Short local borrows avoid reference counting and express a tighter lifetime.
- When is `Vec<u8>` better? Unique ownership and mutation are simpler when sharing is unnecessary.
- What does `BytesMut::freeze` communicate that `AsRef<[u8]>` does not?

## Source trail

- [`Bytes` representation and contract](https://github.com/tokio-rs/bytes/blob/d5c8ad3227afe459c09f1d0d85455abf00f0381a/src/bytes.rs#L101-L110)
- [`Bytes::slice`](https://github.com/tokio-rs/bytes/blob/d5c8ad3227afe459c09f1d0d85455abf00f0381a/src/bytes.rs#L373-L411)
- [`split_off` and `split_to`](https://github.com/tokio-rs/bytes/blob/d5c8ad3227afe459c09f1d0d85455abf00f0381a/src/bytes.rs#L472-L552)
- [`BytesMut`](https://github.com/tokio-rs/bytes/blob/d5c8ad3227afe459c09f1d0d85455abf00f0381a/src/bytes_mut.rs)

> **Takeaway:** A dedicated owned-view type can escape the borrow-versus-copy dilemma when immutable structural sharing is a dominant workload.
