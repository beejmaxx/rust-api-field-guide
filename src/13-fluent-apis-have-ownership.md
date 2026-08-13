# Fluent APIs have ownership

<p class="chapter-subtitle">Bevy, Polars, and Iced look fluent for three different reasons.</p>

<div class="chapter-meta"><span>Intermediate</span><span>bevy::App · polars::LazyFrame · iced::Application</span></div>

## Two chains that mean different things

Method chaining is visual syntax, not a design pattern by itself. Bevy's App assembly methods generally take &mut self and return &mut Self. Polars' LazyFrame transformations take self and return Self. Both read fluently, but their ownership semantics describe different objects.

A Bevy App is an identity-bearing container under construction: plugins and resources accumulate in one runtime object. A LazyFrame is a query-plan value: each transformation consumes the previous plan and yields a new plan. The method receiver should follow the value's meaning, not a style guide that says builders always consume or always borrow.

```rust
app.add_plugins(DefaultPlugins)
   .insert_resource(Settings::default())
   .add_systems(Update, tick); // &mut Self -> &mut Self

let plan = frame.lazy()
    .filter(col("active").eq(true))
    .select([col("name")]); // Self -> Self
```

## Iced separates configuration from execution

Iced's `Application<P>` configuration methods consume and return `Self`, and `run(self)` is terminal. This gives the configured application a single-use lifecycle. Fonts, window options, theme functions, and subscriptions accumulate as a value; running consumes the complete recipe.

```rust
iced::application(boot, update, view)
    .window_size((900.0, 600.0))
    .theme(theme)
    .run()?;
```

## Choose from semantics

- Use &mut self -> &mut Self for a stable, identity-bearing object assembled in place.
- Use self -> Self for a value-like plan or configuration whose old state should be unavailable.
- Use a consuming terminal method when starting the operation makes reuse surprising.
- Mark plan-like values must_use when silently discarding them is almost certainly a bug.
- Do not choose receivers merely to enable dots between method calls.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Bevy App](https://github.com/bevyengine/bevy/blob/main/crates/bevy_app/src/app.rs)
- [Polars LazyFrame](https://github.com/pola-rs/polars/blob/main/crates/polars-lazy/src/frame/mod.rs)
- [Iced Application](https://github.com/iced-rs/iced/blob/master/src/application.rs)
