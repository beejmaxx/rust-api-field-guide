# Lazy programs are values

<p class="chapter-subtitle">Polars, Nushell, Typst, and parser libraries expose plans that can be inspected before execution.</p>

<div class="chapter-meta"><span>Advanced</span><span>55 min read</span><span>polars::LazyFrame · nu_protocol::PipelineData · typst::World · winnow::Parser</span></div>

## Delay work to preserve optimization

A LazyFrame records a logical query rather than immediately processing rows. Because the plan remains a value, Polars can push projections and predicates, eliminate common subplans, choose streaming execution, and explain the optimized plan. Eager convenience would surrender those choices too early.

```rust
let query = scan_parquet(path, args)?
    .filter(col("year").gt(lit(2020)))
    .group_by([col("country")])
    .agg([col("sales").sum()]);

println!("{}", query.explain(true)?);
let result = query.collect()?;
```

## must_use communicates unfinished work

Polars marks LazyFrame must_use. Nushell marks conversions that would otherwise silently discard a transformed pipeline. The attribute is appropriate for plan, future, result, guard, and builder values whose destruction usually means a forgotten action.

> **Design note**
>
> must_use should identify probable mistakes, not punish callers for every ignored convenience value. A warning that fires constantly loses authority.

## One enum can preserve multiple execution modes

Nushell's PipelineData represents immediate values, list streams, byte streams, empty data, and metadata. Its map, flat_map, write_to, and collection methods operate across modes without forcing eager buffering at every command boundary. The enum makes different execution forms explicit while preserving one pipeline vocabulary.

- Represent plans as values when inspection, caching, optimization, or alternate execution matters.
- Provide an explicit terminal verb: collect, run, execute, write, compile.
- Expose explain or debug representations for complex plans.
- Preserve streaming until an operation truly requires materialization.
- Use must_use when dropping the plan is almost certainly accidental.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Polars LazyFrame](https://github.com/pola-rs/polars/blob/main/crates/polars-lazy/src/frame/mod.rs)
- [Nushell PipelineData](https://github.com/nushell/nushell/blob/main/crates/nu-protocol/src/pipeline/pipeline_data.rs)
- [Typst compile API](https://github.com/typst/typst/blob/main/crates/typst/src/lib.rs)
