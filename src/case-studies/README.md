# How to study a real API

<p class="chapter-subtitle">Twelve guided source readings turn the repository survey into concrete design practice.</p>

The chapters before this one extracted principles. This part changes the unit of study. Each page follows one supported public API from an ordinary call site into its implementation, isolates the design decision, and then rebuilds a smaller version. The examples are not decorative snippets. They are prompts you can type, change, and defend.

## The five-pass method

Use the same passes for every repository.

1. **Call it before reading it.** Copy the caller example into a scratch crate. Let type inference and compiler errors show what the API expects.
2. **Reduce it to signatures.** Ignore most implementation details. Write down receiver types, generic parameters, associated types, return types, and trait bounds.
3. **Trace one path.** Start at the public method and follow only the ordinary successful path until it reaches stored data or an inner service.
4. **Name the rejected alternatives.** Ask why the API did not require `Clone`, return `Box<dyn Error>`, expose a public enum, or accept a concrete type.
5. **Rebuild the idea.** Implement the smallest version that preserves the central contract. A twenty-line imitation often teaches more than reading another thousand lines.

## What counts as evidence

Every study links to an exact commit from the research snapshot. A repository can change tomorrow without making the page's claim unverifiable. The code shown in the exercises is written for learning; when it abbreviates unrelated machinery, the text says so.

The selected APIs are not a ranking. They form a coverage set:

| Design pressure | Primary studies |
|---|---|
| Ownership and replay | `http`, Reqwest, Tower Retry |
| Traits and extension surfaces | Tower, Serde, Rayon |
| Async and request consumption | Tower, Axum |
| Construction and validation | `http`, Clap, rustls |
| Shared storage and concurrency | Bytes, ArcSwap |
| Stable failure boundaries | Reqwest, thiserror, anyhow |

## Keep a design notebook

For each study, record four sentences:

- “The caller owns…”
- “The implementation is free to change…”
- “The compiler prevents…”
- “I would choose a different design when…”

Those sentences force you to distinguish syntax from contract. That distinction is the heart of API design.
