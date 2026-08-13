# ArcSwap: choose the lifetime of a read

<p class="chapter-subtitle">Two load methods expose a deliberate tradeoff between a cheap guarded view and an independently owned snapshot.</p>

Applications often have configuration that is read constantly and replaced rarely. `RwLock<Arc<Config>>` works, but every read participates in locking. ArcSwap stores an atomically replaceable `Arc<T>` and gives readers explicit choices.

## The caller's two reads

```rust
use arc_swap::ArcSwap;
use std::sync::Arc;

let config = ArcSwap::from_pointee(Config::default());

let guarded = config.load();
use_config(&guarded);

let owned: Arc<Config> = config.load_full();
spawn_work(owned);
```

`load()` returns a `Guard`, optimized for short-lived access. `load_full()` returns a fully owned `Arc<T>` that can move elsewhere and outlive the read operation. The methods do not pretend those costs and lifetimes are identical.

## Why a guard appears in a lock-free API

A guard is not necessarily evidence of a mutex. It is a lifetime-management handle. The implementation must ensure the pointed-to allocation remains alive while a reader accesses it, even if another thread swaps the current `Arc` and drops the old one.

Returning a guard allows the crate to use a protection strategy optimized for reads. Returning `Arc<T>` requires incrementing the strong count but gives the caller ordinary independent ownership.

This is an API lesson broader than ArcSwap: name operations by the ownership guarantee they provide, not merely by the data they dereference to.

## Updating is simple and visible

```rust
config.store(Arc::new(next_config));
```

Existing readers keep seeing the old allocation safely. New readers see the new value. Replacement does not mutate a configuration behind readers' backs; it publishes a new immutable snapshot.

For read-copy-update logic, `rcu` accepts a closure that computes a replacement from the current value. Because concurrent writers can race, the closure may run more than once. That behavioral fact is essential: it must not perform irreversible side effects.

```rust
shared.rcu(|current| {
    let mut next = (**current).clone();
    next.generation += 1;
    next
});
```

The closure is a retryable pure transformation, not an event callback.

## Compare three API shapes

### Return `Arc<T>` only

Simple and composable, but every read pays for owned reference-counted access even when the value is used for two instructions.

### Return `&T`

Impossible without tying the reference to some protection handle. A bare reference would outlive the guarantee that the allocation remains current and alive.

### Return a guard and offer `load_full`

The common short read can be optimized; callers explicitly opt into independent ownership when needed. The extra type carries the protection lifetime.

## Rebuild the caller-facing distinction

You do not need lock-free internals to practice this API:

```rust
use std::sync::{Arc, RwLock, RwLockReadGuard};

struct Shared<T>(RwLock<Arc<T>>);

impl<T> Shared<T> {
    fn load(&self) -> RwLockReadGuard<'_, Arc<T>> {
        self.0.read().unwrap()
    }

    fn load_full(&self) -> Arc<T> {
        self.0.read().unwrap().clone()
    }

    fn store(&self, value: Arc<T>) {
        *self.0.write().unwrap() = value;
    }
}
```

The internals differ radically from ArcSwap, but the ownership choice is visible in the same place. Measure how long callers retain guards. A technically cheap load can become operationally expensive if a guard is held across slow work.

## Questions to defend

- Should the API use a closure like `with_current(|value| ...)` to prevent guard escape?
- When does exposing a guard leak too much implementation policy?
- Which read should have the shortest, most obvious name?
- How should an RCU closure document repeated invocation?

## Source trail

- [`ArcSwapAny` and the `ArcSwap<T>` alias](https://github.com/vorner/arc-swap/blob/147d6c0319d389a0aaa134a67abaa00106122f7d/src/lib.rs#L326-L340)
- [`load_full`, `load`, and `store`](https://github.com/vorner/arc-swap/blob/147d6c0319d389a0aaa134a67abaa00106122f7d/src/lib.rs#L422-L486)
- [`rcu`](https://github.com/vorner/arc-swap/blob/147d6c0319d389a0aaa134a67abaa00106122f7d/src/lib.rs#L622-L680)

> **Takeaway:** When one logical read can provide different ownership guarantees, separate methods make lifetime and cost choices reviewable at the call site.
