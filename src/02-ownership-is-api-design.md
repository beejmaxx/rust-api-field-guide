# 2. Ownership is API design

<p class="chapter-subtitle">File, Path, and Cow make lifetime and storage choices visible without making callers suffer.</p>

<div class="chapter-meta"><span>Foundation</span><span>45 min read</span><span>std::fs::File · std::Path · std::borrow::Cow</span></div>

## Three questions for every parameter

For each input, ask: must the function keep it, must the function mutate it, or does it only need to observe it? The answers usually lead to T, &mut T, and &T respectively.

Taking ownership is not inherently bad. It is exactly right when an operation stores a value, sends it elsewhere, or transforms it irreversibly. The mistake is taking ownership without needing it.

```rust
fn inspect(config: &Config)
fn update(config: &mut Config)
fn install(config: Config) -> InstalledConfig
```

## Path and PathBuf

Path is an unsized borrowed view, like str. PathBuf is owned storage, like String. An API that only inspects a path should not force the caller to allocate or surrender a PathBuf.

The standard library often accepts `P: AsRef<Path>`. This is an ergonomic boundary: callers may pass `&str`, `String`, `&Path`, or `PathBuf` while the implementation immediately converts to a borrowed `Path`.

```rust
pub fn open<P: AsRef<Path>>(path: P) -> io::Result<File> {
    open_inner(path.as_ref())
}
```

## File lets lifetime control cleanup

File::open returns an owned resource. There is no close method in ordinary use; Drop closes the handle when its owner leaves scope. This is RAII: resource acquisition is initialization.

Read and Write methods generally require &mut self because an I/O operation advances observable state such as a cursor. The signature prevents two ordinary callers from concurrently mutating the same handle without synchronization.

```rust
let mut file = File::open(path)?;
let mut text = String::new();
file.read_to_string(&mut text)?;
// closed automatically when `file` is dropped
```

## Cow: borrow until ownership is necessary

Cow<'a, B> represents either Borrowed(&'a B) or Owned(B::Owned). It works well when most values pass through unchanged but a minority need normalization. The return type honestly says that allocation is conditional.

```rust
fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "-"))
    } else {
        Cow::Borrowed(input)
    }
}
```

## Design rule

- Borrow when you only inspect.
- Use &mut when mutation is part of the contract.
- Take T when you store, transfer, or consume it.
- Use owned return values when the result must outlive local work.
- Reach for Cow only when avoiding allocation is measured or structurally common.

## Read the source

The public surface is the primary text. Open these files and trace one ordinary call path.

- [Path source](https://github.com/rust-lang/rust/blob/master/library/std/src/path.rs)
- [File source](https://github.com/rust-lang/rust/blob/master/library/std/src/fs.rs)
- [Cow source](https://github.com/rust-lang/rust/blob/master/library/alloc/src/borrow.rs)
