# Rayon: parallelism as an iterator dialect

<p class="chapter-subtitle">Familiar iterator vocabulary hides scheduling while stronger trait bounds expose what safe parallel execution requires.</p>

Rayon's signature achievement is not merely a thread pool. It makes a large class of parallel programs read like ordinary iterator pipelines:

```rust
use rayon::prelude::*;

let squares: Vec<u64> = (0..1_000_000_u64)
    .into_par_iter()
    .filter(|n| n % 2 == 0)
    .map(|n| n * n)
    .collect();
```

The names are intentionally familiar, but Rayon does not implement `Iterator`. A parallel iterator cannot promise one sequential `next()` method.

## Similar vocabulary, different protocol

```rust
pub trait IntoParallelIterator {
    type Iter: ParallelIterator<Item = Self::Item>;
    type Item: Send;

    fn into_par_iter(self) -> Self::Iter;
}

pub trait ParallelIterator: Sized + Send {
    type Item: Send;
    // map, filter, reduce, collect, ...
}
```

`Iterator` is pull-based: the consumer repeatedly calls `next`. `ParallelIterator` drives work through internal consumers and producers that may split. The surface keeps combinator vocabulary while the plumbing uses a protocol suited to divide-and-conquer execution.

This is careful API analogy: preserve concepts that remain true, but do not pretend incompatible operational semantics are the same trait.

## Bounds explain the concurrency contract

A mapping closure may run concurrently on multiple worker threads. Its bounds therefore require safe sharing and movement. A reduction operation needs an associative combination if results should be independent of partitioning.

The compiler can enforce `Send` and `Sync`; it cannot prove associativity. Documentation and naming must carry the algebraic part of the contract.

Compare:

```rust
let sum = values.par_iter().copied().sum::<u64>();

let sum = values
    .par_iter()
    .copied()
    .reduce(|| 0, |left, right| left + right);
```

The identity closure may be called many times—once per partition—not once for the whole computation. That behavioral detail matters to custom accumulators.

## Extension traits make adoption incremental

Users import `rayon::prelude::*` and gain `.par_iter()` or `.into_par_iter()` on standard collections and ranges. The standard types do not need inherent Rayon methods. This is the extension-trait pattern at ecosystem scale.

The conversion method also states ownership:

- `par_iter()` lends shared items;
- `par_iter_mut()` lends disjoint mutable items where safe;
- `into_par_iter()` consumes the collection and yields owned items.

The vocabulary mirrors standard iterators, reducing surprise.

## Rebuild the semantic boundary

Do not build a thread pool yet. First define a tiny trait that makes the concurrency requirement visible:

```rust
trait ParallelMap<T> {
    fn par_map<U, F>(self, f: F) -> Vec<U>
    where
        T: Send,
        U: Send,
        F: Fn(T) -> U + Sync;
}
```

Implement it for `Vec<T>` using `std::thread::scope`, dividing the vector into chunks. The exercise will force decisions Rayon already solved:

- How is order preserved?
- How are panics propagated?
- How small may chunks become before overhead dominates?
- Can the closure borrow from the current stack frame?

The final question leads to scoped threads and shows why lifetimes are part of ergonomic parallel APIs.

## Static dispatch and adapter values

Like ordinary iterators, Rayon adapters are lazy concrete values. `.map(...)` does not create an intermediate vector. The composed type records the pipeline until a consumer such as `collect`, `for_each`, or `reduce` drives it. This permits fusion and specialized scheduling without heap-allocating a trait object per stage.

Type erasure may still be useful at a storage boundary, but the normal path stays generic.

## Questions to defend

- Why not add a Boolean `parallel` parameter to a normal iterator consumer?
- Which sequential iterator operations have no sensible parallel equivalent?
- When must collection order be guaranteed, and what does that cost?
- How should cancellation behave after one worker errors or panics?

## Source trail

- [`IntoParallelIterator`](https://github.com/rayon-rs/rayon/blob/1f9bb2538e50f1e6d1bc2e3d06a361ba2af0b632/src/iter/mod.rs#L222-L257)
- [`ParallelIterator`](https://github.com/rayon-rs/rayon/blob/1f9bb2538e50f1e6d1bc2e3d06a361ba2af0b632/src/iter/mod.rs#L359-L390)
- [`map`](https://github.com/rayon-rs/rayon/blob/1f9bb2538e50f1e6d1bc2e3d06a361ba2af0b632/src/iter/mod.rs#L598-L607)

> **Takeaway:** Reuse familiar vocabulary when user intent is the same, but define a new trait when the execution protocol and laws are materially different.
