# Summary

[Problem-first edition](README.md)

# Part I · Let the obvious API break

- [Signatures tell the story](01-signatures-tell-the-story.md)
- [A request outgrows its body](02-ownership-is-api-design.md)
- [Construction becomes dangerous](05-builders-and-typed-payloads.md)
- [Errors for callers](06-errors-for-callers.md)
- [Retry meets consumed input](11-retry-and-replayability.md)

# Part II · Name the mechanisms

- [Small traits, large ecosystems](03-small-traits-large-ecosystems.md)
- [A shared conversion vocabulary](04-conversion-vocabulary.md)
- [Separate data from formats](07-separate-data-from-formats.md)
- [Async capabilities](08-async-capabilities.md)
- [Types as framework language](09-types-as-framework-language.md)
- [One service, many layers](10-one-service-many-layers.md)
- [Designing for version two](12-designing-for-version-two.md)

# Part III · Test the model against production

- [Twelve design decisions](case-studies/README.md)
  - [`http::Request<T>`: separate head from body](case-studies/http-request.md)
  - [Reqwest: progressive convenience](case-studies/reqwest-client.md)
  - [Tower Retry: replay is a capability](case-studies/tower-retry.md)
  - [rustls: make unsafe configuration unrepresentable](case-studies/rustls-typestate.md)
  - [Tower: one protocol for middleware](case-studies/tower-service-layer.md)
  - [Serde: put a data model in the middle](case-studies/serde-data-model.md)
  - [Axum: handler arguments are a program](case-studies/axum-extractors.md)
  - [Bytes: cheap views over shared storage](case-studies/bytes-shared-storage.md)
  - [Rayon: parallelism as an iterator dialect](case-studies/rayon-parallel-iterators.md)
  - [Clap: one schema, two authoring styles](case-studies/clap-schema.md)
  - [ArcSwap: choose the lifetime of a read](case-studies/arc-swap.md)
  - [thiserror and anyhow: errors by audience](case-studies/error-audiences.md)

# Part IV · Lessons from the field

- [Fluent APIs have ownership](13-fluent-apis-have-ownership.md)
- [Lend access with closures](14-lend-access-with-closures.md)
- [Erase concrete types, keep protocols](15-erase-concrete-types-keep-protocols.md)
- [Parse, validate, activate](16-parse-validate-activate.md)
- [Lazy programs are values](17-lazy-programs-are-values.md)
- [Compatibility at ecosystem scale](18-ecosystem-scale-compatibility.md)

# Measure what transferred

- [Before you begin](experiments/pretest.md)
- [Common final challenge](experiments/final-challenge.md)
- [Scoring rubric](experiments/rubric.md)
- [48-hour recall check](experiments/recall.md)

# Appendix

- [How this evidence was selected](19-research-method.md)
