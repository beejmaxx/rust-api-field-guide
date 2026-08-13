# Common final challenge

<p class="chapter-subtitle">Design an unfamiliar API without reopening the edition you studied.</p>

Set a 35-minute timer. Use a blank file. This challenge is identical in every edition so the result can compare learning rather than task difficulty.

## Prompt: an artifact publishing client

Design the public Rust API for a reusable client that publishes build artifacts to a registry.

Requirements arrive together:

- Every publication has stable metadata: package name, version, destination, and headers.
- A payload may be in-memory bytes, a validated archive value, or a one-shot asynchronous stream.
- The client may retain work and therefore cannot borrow short-lived caller data indiscriminately.
- Destination and authentication must be explicitly validated before network activity begins.
- Sending is asynchronous.
- Transport errors, HTTP 429, and HTTP 503 may be retryable.
- Unsafe operations must not be repeated unless the request carries an idempotency key.
- Buffered payloads may be replayable; one-shot streams are not. A caller holding a file path can recreate a fresh stream for each attempt.
- Callers need the final response or structured failure context.
- The design should allow a synchronous encoder and another async runtime to be added later without breaking every type.

## Deliverables

Write:

1. the central request, metadata, client, and error types;
2. one caller example for a buffered payload;
3. one caller example for a streaming payload;
4. construction signatures showing where validation is observed;
5. a retry-classification interface;
6. a request-replay or attempt-factory interface;
7. the return type for exhausted attempts;
8. a paragraph defending ownership and generic boundaries;
9. one rejected alternative and when it would become preferable;
10. one compatibility choice that keeps version two possible.

You may use pseudocode for method bodies, but public signatures must be concrete enough that another engineer could implement them.

## Constraints

Do not solve every issue with `Arc<Mutex<_>>`, `Box<dyn Any>`, or a single `String` error. These may appear where justified, but each erases information or adds runtime policy that the API must own.

When time expires, stop. Score the unrevised result using the [common rubric](rubric.md). Preserve your answer so you can compare it with a later run from another edition.
