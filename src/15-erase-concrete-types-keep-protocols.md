# Erase concrete types, keep protocols

<p class="chapter-subtitle">Iced, Tower, and Bevy show that type erasure need not erase everything useful.</p>

<div class="chapter-meta"><span>Advanced</span><span>iced::Element · tower::util::BoxService · bevy::Plugin</span></div>

## The concrete widget type is accidental

An Iced widget tree can have an enormous nested concrete type. Element<'a, Message, Theme, Renderer> erases the concrete Widget implementation behind dynamic dispatch while retaining the types that define the application protocol: its emitted Message, Theme, Renderer, and borrowing lifetime.

This is selective type erasure. The API hides composition detail without reducing every value to an untyped object.

```rust
pub struct Element<'a, Message, Theme, Renderer> { /* boxed Widget */ }

fn view(state: &State) -> Element<'_, Message> {
    button("Save").on_press(Message::Save).into()
}
```

## Map preserves structure and changes protocol

Element::map consumes an element and transforms its emitted message type. A reusable component may define local messages; a parent maps them into the application's message enum. The child stays decoupled from its embedding context.

```rust
counter_view(counter)
    .map(Message::Counter)
```

## Static first, erased at boundaries

Tower composes concrete Service types for zero-cost middleware, then provides boxed services where type complexity or heterogeneous storage warrants erasure. Bevy plugins use downcasting and trait objects because a runtime plugin registry is inherently heterogeneous. Mature APIs offer the appropriate boundary rather than declaring static or dynamic dispatch universally superior.

- Erase implementation detail, not domain information callers still need.
- Keep protocol types—messages, errors, requests—visible through the erased wrapper.
- Prefer static composition internally when it pays off; erase at storage and subsystem boundaries.
- Provide transformations such as map so erased containers remain composable.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Iced Element](https://github.com/iced-rs/iced/blob/master/core/src/element.rs)
- [Tower boxed services](https://github.com/tower-rs/tower/tree/master/tower/src/util)
- [Bevy Plugin](https://github.com/bevyengine/bevy/blob/main/crates/bevy_app/src/plugin.rs)
