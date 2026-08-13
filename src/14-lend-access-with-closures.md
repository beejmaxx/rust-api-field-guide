# 14. Lend access with closures

<p class="chapter-subtitle">egui and ArcSwap constrain borrowed access so synchronization details cannot escape.</p>

<div class="chapter-meta"><span>Intermediate</span><span>50 min read</span><span>egui::Context · arc_swap::Guard · std::thread::scope</span></div>

## Returning a guard exports your locking policy

A method that returns MutexGuard gives callers control over lock duration. They may retain it through expensive work or across another lock acquisition. That flexibility can be correct for a low-level primitive, but a higher-level context often wants a stronger rule.

egui's Context exposes methods such as input, memory, and data that accept FnOnce and return the closure's result. The state is accessible only during the call. Its lock guard and concrete storage remain private.

```rust
let pointer = ctx.input(|input| input.pointer.hover_pos());

ctx.memory_mut(|memory| {
    memory.options.zoom_factor = 1.25;
});
```

## The closure is a lifetime boundary

The higher-ranked shape of closure-scoped APIs can prevent references tied to temporary access from escaping. This same family includes thread::scope, scoped task APIs, database transactions, and visitors. A closure becomes a small region in which an extra capability is valid.

> **Design note**
>
> Closures are not only callbacks. They can delimit access, transactions, threads, tracing spans, and temporary invariants.

## When an explicit guard is better

ArcSwap intentionally returns a Guard from load because cheap repeated reads and guard lifetime control are central to its low-level purpose. It also offers load_full when the caller wants an owned Arc. The abstraction exposes both costs rather than hiding them.

```rust
let guarded = config.load();      // cheap protected view
let owned = config.load_full();   // independently owned Arc
```

## Design rule

- Use closure-scoped access when temporary capability boundaries are part of correctness.
- Return explicit guards when callers genuinely need to control access duration.
- Offer an owned escape hatch when retaining a value is common.
- Name closure parameters by role—reader, writer, transaction—not generic callback when that clarifies the contract.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [egui Context](https://github.com/emilk/egui/blob/main/crates/egui/src/context.rs)
- [ArcSwap](https://github.com/vorner/arc-swap/blob/master/src/lib.rs)
