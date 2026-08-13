# 5. Builders and typed payloads

<p class="chapter-subtitle">http::Request&lt;T&gt; separates stable protocol structure from caller-defined data.</p>

<div class="chapter-meta"><span>Intermediate</span><span>55 min read</span><span>http::Request&lt;T&gt; · http::request::Builder · HashMap::entry</span></div>

## The constructor that grew too large

Constructors become brittle when a type has many optional settings. Positional arguments hide meaning, and adding a new option breaks every caller. A builder gives configuration names and makes defaults explicit.

```rust
// Which None is the timeout?
Request::new(method, uri, None, None, body)

Request::builder()
    .method(Method::POST)
    .uri("/notes")
    .header(CONTENT_TYPE, "application/json")
    .body(body)?
```

## Why the body is generic

HTTP metadata is stable: method, URI, version, and headers. Bodies vary enormously: `()`, `Vec<u8>`, `Bytes`, a file stream, or an application-specific type. `Request<T>` keeps those concerns separate without forcing heap allocation or dynamic dispatch.

```rust
pub struct Request<T> {
    head: Parts,
    body: T,
}

fn map<F, U>(self, f: F) -> Request<U>
where F: FnOnce(T) -> U
```

## A builder that remembers failure

`method` and `uri` setters accept values that may require parsing. Returning `Result<Builder>` after every setter would ruin fluent use. `http`'s `Builder` stores the first error internally and returns it from `body`, the terminal method.

This is a deliberate tradeoff: the error appears slightly later, but ordinary construction stays readable and there is one obvious error boundary.

```rust
let request = Request::builder()
    .method(user_method)  // conversion may fail internally
    .uri(user_uri)        // later calls preserve the error
    .body(payload)?;      // failure surfaces here
```

## Consuming and borrowing accessors

A mature owned type often offers three levels: body(&self), body_mut(&mut self), and into_body(self). The consuming form can move data out without cloning. Request also offers into_parts so callers can dismantle ownership cleanly.

```rust
request.body()             // observe
request.body_mut()         // modify
request.into_body()        // take ownership
let (parts, body) = request.into_parts();
```

## A smaller cousin: Entry

HashMap::entry turns a lookup decision into a typed intermediate value: Occupied or Vacant. Methods such as or_insert refine that state and avoid a second lookup. Both Entry and Builder show a recurring technique: return a value representing unfinished work, then let methods guide it to completion.

> **Design note**
>
> Intermediate API objects are valuable when they preserve context, avoid repeated work, or make a multi-step operation fluent.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [http Request source](https://github.com/hyperium/http/blob/master/src/request.rs)
- [HashMap Entry](https://github.com/rust-lang/rust/blob/master/library/std/src/collections/hash/map.rs)
