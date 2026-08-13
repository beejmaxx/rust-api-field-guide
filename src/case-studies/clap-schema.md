# Clap: one schema, two authoring styles

<p class="chapter-subtitle">A typed command model supports both fluent construction and derive syntax without creating two different runtimes.</p>

Clap lets callers declare a CLI in code:

```rust
use clap::{Arg, Command};

let matches = Command::new("search")
    .arg(
        Arg::new("query")
            .required(true)
            .help("Text to find"),
    )
    .arg(
        Arg::new("count")
            .long("count")
            .value_parser(clap::value_parser!(usize))
            .default_value("10"),
    )
    .get_matches();
```

Or declare much of the same schema with derives:

```rust
use clap::Parser;

#[derive(Parser)]
struct Search {
    /// Text to find
    query: String,

    #[arg(long, default_value_t = 10)]
    count: usize,
}
```

These are two authoring surfaces over the same underlying command and argument model. Parse behavior, help generation, validation, and error reporting do not need parallel implementations.

## Why keep the builder when derive exists?

Derive is concise when the schema is known at compile time and maps naturally to a struct. The builder is necessary when commands come from plugins, configuration, feature flags, or loops. It is also the lower-level vocabulary that derive can generate.

A good macro API often has this shape:

```text
ergonomic syntax ── expands to ──► ordinary public builder/model
                                      │
                                      ▼
                                  one runtime
```

Users can drop down a level without abandoning the library or learning unrelated semantics.

## The command is data before it executes

`Command` and `Arg` are values that describe a grammar. Construction does not parse process arguments. That separation permits:

- unit testing with supplied argument arrays;
- generating help without performing the command;
- inspecting or augmenting a derived command;
- validating relationships before user input arrives.

```rust
fn command() -> Command {
    Command::new("search")
        .arg(Arg::new("query").required(true))
}

let matches = command().try_get_matches_from(["search", "rust"])?;
```

Passing an iterator of arguments rather than reading globals directly makes the API testable and embeddable.

## Typed parsing moves validation to the edge

A `value_parser!(usize)` turns text into a typed value during command parsing. Downstream code reads a `usize` rather than repeatedly parsing a `String` and deciding how to report errors.

```rust
let count = matches.get_one::<usize>("count").copied().unwrap();
```

The string key remains a possible source of mismatch in builder-style code; derive can connect the field name and type more tightly. This illustrates a macro's legitimate advantage: it can establish relationships among names and types that ordinary method calls cannot infer as ergonomically.

## Rebuild one schema, two front ends

Start with the runtime model:

```rust
struct Field {
    name: &'static str,
    required: bool,
}

struct Form {
    fields: Vec<Field>,
}

impl Form {
    fn field(mut self, field: Field) -> Self {
        self.fields.push(field);
        self
    }
}
```

Then sketch what a derive for this type should generate. Do not implement the procedural macro yet. Write the expanded code manually. Ask whether every derive attribute maps to a stable builder method. If it does not, your two authoring styles may drift into separate APIs.

## Diagnostics are part of the design

CLI libraries are experienced primarily through errors and help text. An expressive schema gives the library enough information to report missing values, invalid enums, conflicting flags, usage, defaults, and suggestions consistently. Accepting only a callback like `Fn(&str) -> bool` might validate input but would throw away information needed for good diagnostics.

## Questions to defend

- Which relationships deserve types, and which remain runtime schema validation?
- Should builder methods consume `self` or use `&mut self`? Value-like declarative schemas favor consuming chains; long-lived identity-bearing registries may not.
- How does a macro expose its expansion in documentation and compiler errors?
- Can downstream crates extend the schema without depending on proc macros?

## Source trail

- [`Command` builder implementation](https://github.com/clap-rs/clap/blob/5b81f1012da19f1474decfe7ffcfb437f59ccba4/clap_builder/src/builder/command.rs)
- [`Arg` builder implementation](https://github.com/clap-rs/clap/blob/5b81f1012da19f1474decfe7ffcfb437f59ccba4/clap_builder/src/builder/arg.rs)
- [Builder tutorial examples](https://github.com/clap-rs/clap/tree/5b81f1012da19f1474decfe7ffcfb437f59ccba4/examples/tutorial_builder)

> **Takeaway:** Derive works best as a concise compiler for an ordinary public schema API, not as a separate universe with hidden runtime behavior.
