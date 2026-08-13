import { useEffect, useMemo, useState } from "react";

type Section = {
  title: string;
  paragraphs?: string[];
  code?: string;
  note?: string;
  bullets?: string[];
};

type Chapter = {
  slug: string;
  number: number;
  part: string;
  title: string;
  subtitle: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  time: string;
  apis: string[];
  sections: Section[];
  sources: { label: string; url: string }[];
};

const chapters: Chapter[] = [
  {
    slug: "signatures-tell-the-story", number: 1, part: "Part I · Foundations", level: "Foundation", time: "35 min",
    title: "Signatures tell the story", subtitle: "Option and Result show how a return type can document an entire operation.",
    apis: ["std::Option", "std::Result"],
    sections: [
      { title: "Begin at the boundary", paragraphs: ["When you study a Rust API, resist the urge to open its implementation first. Begin with the signature. It is the contract every caller sees, and in Rust that contract can say unusually precise things: whether an input is borrowed, whether failure is expected, whether mutation occurs, and whether a value can be absent.", "Consider a user lookup. A return type of User promises that a user always exists. Option<User> says that absence is normal and carries no further explanation. Result<User, LoadError> says the operation can fail and that callers may need to distinguish kinds of failure. The implementation did not change, but the API's meaning did."], code: "fn cached_user(id: UserId) -> Option<User>\nfn load_user(id: UserId) -> Result<User, LoadError>" },
      { title: "The tempting first design", paragraphs: ["New APIs often use sentinel values: an empty string, -1, null, or a Boolean paired with an output parameter. These designs make callers remember conventions that the compiler cannot check."], code: "// What does an empty string mean?\nfn find_name(id: u64) -> String\n\n// Can `name` be read when this is false?\nfn find_name(id: u64, name: &mut String) -> bool", note: "A good Rust API moves important conventions out of documentation and into types." },
      { title: "Why Option composes", paragraphs: ["Option is more than a two-way branch. Its methods describe transformations that preserve absence. map transforms only Some. and_then chains an operation that may itself return None. as_ref borrows the value inside without consuming the Option."], code: "let domain = user\n    .as_ref()\n    .and_then(|u| u.email.as_deref())\n    .and_then(|email| email.split_once('@'))\n    .map(|(_, domain)| domain);" },
      { title: "Why Result keeps the error generic", paragraphs: ["Result<T, E> does not prescribe one universal error. A parser can return ParseError, a library can return a stable domain error, and an application can aggregate several sources. The question mark operator works because errors can be converted at the boundary.", "Notice the symmetry: map changes success, map_err changes failure, and and_then sequences another fallible operation. A tiny enum becomes a shared vocabulary across the ecosystem."], code: "fn read_config(path: &Path) -> Result<Config, ConfigError> {\n    let text = std::fs::read_to_string(path)?;\n    let config = text.parse()?;\n    Ok(config)\n}" },
      { title: "Design rule", bullets: ["Use Option when there is one unsurprising kind of absence.", "Use Result when callers benefit from knowing why the operation did not produce a value.", "Do not erase useful errors merely to shorten a signature.", "Treat panics as invariant violations, not ordinary control flow."], note: "Next: the input side of the contract—who owns each value?" },
    ],
    sources: [
      { label: "Option source", url: "https://github.com/rust-lang/rust/blob/master/library/core/src/option.rs" },
      { label: "Result source", url: "https://github.com/rust-lang/rust/blob/master/library/core/src/result.rs" },
    ],
  },
  {
    slug: "ownership-is-api-design", number: 2, part: "Part I · Foundations", level: "Foundation", time: "45 min",
    title: "Ownership is API design", subtitle: "File, Path, and Cow make lifetime and storage choices visible without making callers suffer.",
    apis: ["std::fs::File", "std::Path", "std::borrow::Cow"],
    sections: [
      { title: "Three questions for every parameter", paragraphs: ["For each input, ask: must the function keep it, must the function mutate it, or does it only need to observe it? The answers usually lead to T, &mut T, and &T respectively.", "Taking ownership is not inherently bad. It is exactly right when an operation stores a value, sends it elsewhere, or transforms it irreversibly. The mistake is taking ownership without needing it."], code: "fn inspect(config: &Config)\nfn update(config: &mut Config)\nfn install(config: Config) -> InstalledConfig" },
      { title: "Path and PathBuf", paragraphs: ["Path is an unsized borrowed view, like str. PathBuf is owned storage, like String. An API that only inspects a path should not force the caller to allocate or surrender a PathBuf.", "The standard library often accepts P: AsRef<Path>. This is an ergonomic boundary: callers may pass &str, String, &Path, or PathBuf while the implementation immediately converts to a borrowed Path."], code: "pub fn open<P: AsRef<Path>>(path: P) -> io::Result<File> {\n    open_inner(path.as_ref())\n}" },
      { title: "File lets lifetime control cleanup", paragraphs: ["File::open returns an owned resource. There is no close method in ordinary use; Drop closes the handle when its owner leaves scope. This is RAII: resource acquisition is initialization.", "Read and Write methods generally require &mut self because an I/O operation advances observable state such as a cursor. The signature prevents two ordinary callers from concurrently mutating the same handle without synchronization."], code: "let mut file = File::open(path)?;\nlet mut text = String::new();\nfile.read_to_string(&mut text)?;\n// closed automatically when `file` is dropped" },
      { title: "Cow: borrow until ownership is necessary", paragraphs: ["Cow<'a, B> represents either Borrowed(&'a B) or Owned(B::Owned). It works well when most values pass through unchanged but a minority need normalization. The return type honestly says that allocation is conditional."], code: `fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "-"))
    } else {
        Cow::Borrowed(input)
    }
}` },
      { title: "Design rule", bullets: ["Borrow when you only inspect.", "Use &mut when mutation is part of the contract.", "Take T when you store, transfer, or consume it.", "Use owned return values when the result must outlive local work.", "Reach for Cow only when avoiding allocation is measured or structurally common."] },
    ],
    sources: [{ label: "Path source", url: "https://github.com/rust-lang/rust/blob/master/library/std/src/path.rs" }, { label: "File source", url: "https://github.com/rust-lang/rust/blob/master/library/std/src/fs.rs" }, { label: "Cow source", url: "https://github.com/rust-lang/rust/blob/master/library/alloc/src/borrow.rs" }],
  },
  {
    slug: "small-traits-large-ecosystems", number: 3, part: "Part I · Foundations", level: "Foundation", time: "50 min",
    title: "Small traits, large ecosystems", subtitle: "Iterator demonstrates how one required method can support a language-wide vocabulary.",
    apis: ["std::Iterator", "IntoIterator", "FromIterator"],
    sections: [
      { title: "The irreducible operation", paragraphs: ["Iterator requires one method: next. Everything else—map, filter, zip, enumerate, take, collect—is provided in terms of that operation. This keeps implementation burden small while giving users a rich, consistent interface."], code: "pub trait Iterator {\n    type Item;\n    fn next(&mut self) -> Option<Self::Item>;\n    // dozens of provided methods\n}" },
      { title: "Why Item is an associated type", paragraphs: ["An Iterator implementation has one natural item type. An associated type expresses that one-to-one relationship. If Item were a generic parameter, a single iterator type could theoretically implement Iterator<String> and Iterator<Vec<u8>>, making inference and method calls ambiguous."], note: "Use an associated type when an implementation determines one output type. Use a generic parameter when the same implementer should support many input types." },
      { title: "Laziness preserves choice", paragraphs: ["map does not allocate a new collection. It returns Map<I, F>, a small value containing the original iterator and closure. Work happens only when next is requested. Because adapters remain iterators, they compose without intermediate buffers."], code: "let active_names = users.iter()\n    .filter(|u| u.active)\n    .map(|u| u.name.as_str())\n    .take(10);\n// no iteration has happened yet" },
      { title: "Three ownership modes", paragraphs: ["Collections commonly expose iter(), iter_mut(), and into_iter(). The yielded item type tells the ownership story: &T, &mut T, or T. The algorithm stays the same while the caller chooses observation, mutation, or consumption."], code: "values.iter()       // Item = &T\nvalues.iter_mut()   // Item = &mut T\nvalues.into_iter()  // Item = T" },
      { title: "Design rule", bullets: ["Find the smallest required behavior.", "Put conveniences in provided methods or extension traits.", "Return adapters instead of allocating eagerly when work can be lazy.", "Make ownership mode visible in the yielded type.", "Choose names that join ecosystem vocabulary: iter, collect, extend, into_iter."] },
    ],
    sources: [{ label: "Iterator trait", url: "https://github.com/rust-lang/rust/blob/master/library/core/src/iter/traits/iterator.rs" }, { label: "Iterator adapters", url: "https://github.com/rust-lang/rust/tree/master/library/core/src/iter/adapters" }],
  },
  {
    slug: "conversion-vocabulary", number: 4, part: "Part I · Foundations", level: "Foundation", time: "40 min",
    title: "A shared conversion vocabulary", subtitle: "From, TryFrom, AsRef, and Borrow make boundaries flexible without becoming vague.",
    apis: ["From / Into", "TryFrom / TryInto", "AsRef", "Borrow"],
    sections: [
      { title: "Do not invent a private conversion language", paragraphs: ["A crate could define to_widget, make_widget, as_widget, and parse_widget. But Rust already gives those names semantic weight. Implementing standard conversion traits makes APIs predictable and unlocks generic interoperability."], code: "impl From<UserId> for u64 { … }\nimpl TryFrom<u64> for Port { type Error = PortError; … }\nfn open(path: impl AsRef<Path>) { … }" },
      { title: "Infallible versus fallible", paragraphs: ["From<T> promises that every T can become Self without failure or information loss significant enough to surprise callers. TryFrom<T> exposes an Error when validation is necessary. Do not implement From and panic for rejected values; that breaks the trait's semantic promise."], note: "If conversion can fail, make failure part of the type—even when most inputs succeed." },
      { title: "Owned conversion versus borrowed view", paragraphs: ["From consumes or copies a value to produce another owned value. AsRef cheaply exposes a borrowed reference. A function generic over AsRef<Path> is not asking callers to convert ownership; it asks for a view for the duration of the call."], code: "fn parse(bytes: impl AsRef<[u8]>) -> Result<Message, Error> {\n    parse_inner(bytes.as_ref())\n}" },
      { title: "Borrow is stronger than AsRef", paragraphs: ["Borrow<T> promises that borrowed equality, ordering, and hashing behave exactly like the owned value. HashMap uses this to let a HashMap<String, V> be queried with &str. AsRef only promises a cheap reference conversion and carries no equivalence law."], code: `let mut map: HashMap<String, usize> = HashMap::new();
map.insert("rust".into(), 1);
assert_eq!(map.get("rust"), Some(&1));` },
      { title: "Design rule", bullets: ["Use From for obvious, lossless, infallible conversions.", "Use TryFrom when validation belongs at the boundary.", "Use AsRef for flexible borrowed inputs.", "Use Borrow when borrowed and owned forms must compare and hash identically.", "Avoid stacking Into bounds everywhere; generic flexibility should pay for itself at call sites."] },
    ],
    sources: [{ label: "std::convert", url: "https://github.com/rust-lang/rust/blob/master/library/core/src/convert/mod.rs" }, { label: "std::borrow", url: "https://github.com/rust-lang/rust/blob/master/library/core/src/borrow.rs" }],
  },
  {
    slug: "builders-and-typed-payloads", number: 5, part: "Part II · Ergonomic libraries", level: "Intermediate", time: "55 min",
    title: "Builders and typed payloads", subtitle: "http::Request<T> separates stable protocol structure from caller-defined data.",
    apis: ["http::Request<T>", "http::request::Builder", "HashMap::entry"],
    sections: [
      { title: "The constructor that grew too large", paragraphs: ["Constructors become brittle when a type has many optional settings. Positional arguments hide meaning, and adding a new option breaks every caller. A builder gives configuration names and makes defaults explicit."], code: `// Which None is the timeout?
Request::new(method, uri, None, None, body)

Request::builder()
    .method(Method::POST)
    .uri("/notes")
    .header(CONTENT_TYPE, "application/json")
    .body(body)?` },
      { title: "Why the body is generic", paragraphs: ["HTTP metadata is stable: method, URI, version, and headers. Bodies vary enormously: (), Vec<u8>, Bytes, a file stream, or an application-specific type. Request<T> keeps those concerns separate without forcing heap allocation or dynamic dispatch."], code: "pub struct Request<T> {\n    head: Parts,\n    body: T,\n}\n\nfn map<F, U>(self, f: F) -> Request<U>\nwhere F: FnOnce(T) -> U" },
      { title: "A builder that remembers failure", paragraphs: ["method and uri setters accept values that may require parsing. Returning Result<Builder> after every setter would ruin fluent use. http's Builder stores the first error internally and returns it from body, the terminal method.", "This is a deliberate tradeoff: the error appears slightly later, but ordinary construction stays readable and there is one obvious error boundary."], code: "let request = Request::builder()\n    .method(user_method)  // conversion may fail internally\n    .uri(user_uri)        // later calls preserve the error\n    .body(payload)?;      // failure surfaces here" },
      { title: "Consuming and borrowing accessors", paragraphs: ["A mature owned type often offers three levels: body(&self), body_mut(&mut self), and into_body(self). The consuming form can move data out without cloning. Request also offers into_parts so callers can dismantle ownership cleanly."], code: "request.body()             // observe\nrequest.body_mut()         // modify\nrequest.into_body()        // take ownership\nlet (parts, body) = request.into_parts();" },
      { title: "A smaller cousin: Entry", paragraphs: ["HashMap::entry turns a lookup decision into a typed intermediate value: Occupied or Vacant. Methods such as or_insert refine that state and avoid a second lookup. Both Entry and Builder show a recurring technique: return a value representing unfinished work, then let methods guide it to completion."], note: "Intermediate API objects are valuable when they preserve context, avoid repeated work, or make a multi-step operation fluent." },
    ],
    sources: [{ label: "http Request source", url: "https://github.com/hyperium/http/blob/master/src/request.rs" }, { label: "HashMap Entry", url: "https://github.com/rust-lang/rust/blob/master/library/std/src/collections/hash/map.rs" }],
  },
  {
    slug: "errors-for-callers", number: 6, part: "Part II · Ergonomic libraries", level: "Intermediate", time: "55 min",
    title: "Errors for callers", subtitle: "thiserror and reqwest illustrate two different promises a library can make.",
    apis: ["thiserror", "reqwest::Error", "std::error::Error"],
    sections: [
      { title: "Errors are part of the public API", paragraphs: ["An error type tells callers which failures are expected, which distinctions are stable, and what recovery is possible. Designing it after the happy path is finished often produces strings that callers must parse or enums that expose implementation details."], code: `#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("could not read {path}")]
    Read { path: PathBuf, source: io::Error },
    #[error("invalid setting: {key}")]
    Invalid { key: String },
}` },
      { title: "Concrete enums: matchable and precise", paragraphs: ["thiserror generates Display, Error::source, and From implementations while leaving your type an ordinary enum. This works well when variants are meaningful domain events and you are willing to support them as public API."], note: "Every public enum variant is a compatibility promise. Adding a variant can break exhaustive matches unless the enum is marked non_exhaustive." },
      { title: "Opaque errors: stable and classifiable", paragraphs: ["Reqwest takes another approach. Error's internal kind is private. Public methods such as is_timeout, is_connect, status, and url expose recovery-relevant facts without freezing the internal taxonomy.", "Callers cannot exhaustively match every internal cause, but reqwest can evolve transports and dependencies without redesigning its public enum."], code: "match client.get(url).send().await {\n    Err(e) if e.is_timeout() => retry(),\n    Err(e) if e.status() == Some(StatusCode::NOT_FOUND) => absent(),\n    Err(e) => return Err(e),\n    Ok(response) => use_it(response),\n}" },
      { title: "Application errors are different", paragraphs: ["Applications often benefit from anyhow-style context because their primary error consumer is a human or log. Libraries should usually expose typed, documented errors because downstream code needs stable recovery decisions. The correct design depends on the audience, not ideology."], bullets: ["Preserve the source chain.", "Include context the lower-level error cannot know.", "Do not require string matching for recovery.", "Avoid leaking dependency error types accidentally.", "Document whether retry is safe."] },
    ],
    sources: [{ label: "thiserror", url: "https://github.com/dtolnay/thiserror" }, { label: "reqwest error.rs", url: "https://github.com/seanmonstar/reqwest/blob/master/src/error.rs" }],
  },
  {
    slug: "separate-data-from-formats", number: 7, part: "Part II · Ergonomic libraries", level: "Intermediate", time: "65 min",
    title: "Separate data from formats", subtitle: "Serde divides responsibility so data types and wire formats can evolve independently.",
    apis: ["serde::Serialize", "serde::Deserialize", "serde::Serializer", "Visitor"],
    sections: [
      { title: "The matrix problem", paragraphs: ["Suppose ten domain types each need JSON, TOML, and a binary format. If every type implements to_json, to_toml, and to_binary, work grows as types × formats. Serde splits the matrix: data types describe structure through Serialize; formats implement Serializer."], code: "pub trait Serialize {\n    fn serialize<S>(&self, serializer: S)\n        -> Result<S::Ok, S::Error>\n    where S: Serializer;\n}" },
      { title: "The serializer owns format decisions", paragraphs: ["A User knows that it has an id and name. It should not know whether JSON uses braces or a binary format uses length prefixes. Serializer exposes operations such as serialize_bool, serialize_str, and serialize_struct. Its associated Ok and Error types let each format choose its natural output and failure representation."], note: "Separate stable semantic structure from changeable representation details." },
      { title: "Why deserialization is harder", paragraphs: ["Serialization walks a value the program already owns. Deserialization must construct an unknown type from an input stream, possibly borrowing slices directly from that input. Serde's Visitor says which shapes a destination accepts; a Deserializer drives the visitor with available input."], code: "impl<'de> Deserialize<'de> for Name<'de> {\n    fn deserialize<D>(d: D) -> Result<Self, D::Error>\n    where D: Deserializer<'de> {\n        d.deserialize_str(NameVisitor)\n    }\n}" },
      { title: "Derive is the ergonomic layer", paragraphs: ["The core traits are powerful but verbose. #[derive(Serialize, Deserialize)] generates implementations from a struct or enum definition. Attributes handle naming, defaults, flattening, and enum representation. This is a good macro use: it removes structural repetition while leaving behavior governed by normal traits."], bullets: ["Keep the core protocol trait-based and usable without macros.", "Use derive for predictable structural implementations.", "Let formats own their error and output types.", "Preserve borrowing when input lifetime can safely flow into output."] },
    ],
    sources: [{ label: "Serde repository", url: "https://github.com/serde-rs/serde" }, { label: "Serialize source", url: "https://github.com/serde-rs/serde/blob/master/serde/src/ser/mod.rs" }, { label: "Deserialize source", url: "https://github.com/serde-rs/serde/blob/master/serde/src/de/mod.rs" }],
  },
  {
    slug: "async-capabilities", number: 8, part: "Part III · Async boundaries", level: "Intermediate", time: "60 min",
    title: "Async capabilities", subtitle: "Tokio and futures-rs keep low-level poll contracts separate from everyday methods.",
    apis: ["tokio::io::AsyncRead", "AsyncReadExt", "futures::Stream", "StreamExt"],
    sections: [
      { title: "Async is a return-type decision", paragraphs: ["An async fn is syntax for a function returning a Future. The future stores suspended state and advances when polled. Public async API design therefore includes cancellation, borrowing across await points, Send requirements, and runtime assumptions—even when the signature looks simple."], code: "async fn read_message(&mut self) -> io::Result<Message>\n\n// conceptually\nfn read_message(&mut self)\n    -> impl Future<Output = io::Result<Message>> + '_" },
      { title: "Minimal poll trait, rich extension trait", paragraphs: ["AsyncRead defines the low-level capability needed by runtimes and adapters. AsyncReadExt is blanket-implemented for AsyncRead types and adds friendly methods such as read, read_exact, and read_to_end.", "This keeps implementer burden small and lets convenience methods evolve separately. It also avoids making the foundational trait enormous."], code: "pub trait AsyncRead {\n    fn poll_read(self: Pin<&mut Self>, cx: &mut Context<'_>, buf: &mut ReadBuf<'_>)\n        -> Poll<io::Result<()>>;\n}\n\nreader.read_to_end(&mut bytes).await?; // AsyncReadExt" },
      { title: "Stream is an asynchronous Iterator", paragraphs: ["Stream reuses a familiar shape: items arrive one at a time, and None marks completion. Poll adds the third state needed for async work: not ready yet. StreamExt supplies map, filter, next, buffer, and other combinators."], code: "pub trait Stream {\n    type Item;\n    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>)\n        -> Poll<Option<Self::Item>>;\n}" },
      { title: "Cancellation lives at await points", paragraphs: ["Dropping a future cancels it. An API must decide whether partial work is safe to abandon. Reading some bytes into a buffer and then cancelling may leave the stream advanced. Documentation should distinguish cancellation-safe operations from those that can lose framing or state."], note: "Async ergonomics are not only about adding .await. State what happens when the future is dropped." },
      { title: "Design rule", bullets: ["Keep foundational async traits minimal.", "Put conveniences in extension traits.", "Avoid exposing a runtime unless the operation truly requires it.", "Document cancellation behavior.", "Add Send bounds only where execution may cross threads."] },
    ],
    sources: [{ label: "Tokio AsyncReadExt", url: "https://github.com/tokio-rs/tokio/blob/master/tokio/src/io/util/async_read_ext.rs" }, { label: "futures-rs", url: "https://github.com/rust-lang/futures-rs" }],
  },
  {
    slug: "types-as-framework-language", number: 9, part: "Part III · Async boundaries", level: "Intermediate", time: "60 min",
    title: "Types as framework language", subtitle: "Axum turns ordinary function parameters and return values into an extensible HTTP vocabulary.",
    apis: ["axum::FromRequest", "FromRequestParts", "IntoResponse", "Router<S>"],
    sections: [
      { title: "The handler is the API", paragraphs: ["Framework users spend most of their time writing handlers, so Axum optimizes that surface. A handler is an ordinary async function. Its parameters declare what should be extracted from the request; its return value declares how to construct a response."], code: "async fn update_user(\n    State(db): State<Database>,\n    Path(id): Path<UserId>,\n    Json(input): Json<UpdateUser>,\n) -> Result<Json<User>, AppError> { … }" },
      { title: "Extraction through traits", paragraphs: ["FromRequestParts handles values available without consuming the body: method, URI, headers, path parameters, and state. FromRequest may consume the body. Splitting these traits makes a critical invariant visible: a streaming request body can generally be consumed only once."], note: "Trait implementations let applications introduce new extractors without the framework owning every possible parameter type." },
      { title: "Conversion on the way out", paragraphs: ["IntoResponse plays the inverse role. Strings, status codes, headers, JSON wrappers, tuples, and application types can become responses. A Result<T, E> becomes a response when both T and E implement IntoResponse.", "The handler remains domain-shaped while protocol conversion happens at the edge."], code: "impl IntoResponse for AppError {\n    fn into_response(self) -> Response {\n        let status = self.status_code();\n        (status, Json(self.public_body())).into_response()\n    }\n}" },
      { title: "State in the type system", paragraphs: ["Router<S> uses its generic state parameter to track missing state. Adding routes that require AppState yields a Router<AppState>; supplying the state produces a router ready to serve. The type guides assembly while handler signatures stay simple."], bullets: ["Optimize the API surface users repeat most.", "Use conversion traits at framework boundaries.", "Represent one-shot resources, such as bodies, distinctly.", "Let application-defined types join the framework vocabulary.", "Keep protocol mechanics out of business logic."] },
    ],
    sources: [{ label: "Axum repository", url: "https://github.com/tokio-rs/axum" }, { label: "Extract traits", url: "https://github.com/tokio-rs/axum/blob/main/axum-core/src/extract/mod.rs" }, { label: "IntoResponse", url: "https://github.com/tokio-rs/axum/blob/main/axum-core/src/response/into_response.rs" }],
  },
  {
    slug: "one-service-many-layers", number: 10, part: "Part III · Async boundaries", level: "Advanced", time: "75 min",
    title: "One service, many layers", subtitle: "Tower standardizes async operations so middleware can be written once and composed everywhere.",
    apis: ["tower::Service", "tower::Layer", "ServiceBuilder"],
    sections: [
      { title: "A common shape for operations", paragraphs: ["HTTP clients, servers, queues, and mock functions all accept a request and eventually produce a response or error. Tower captures that shape in Service<Request>. Middleware can then wrap the abstraction instead of depending on one protocol."], code: "pub trait Service<Request> {\n    type Response;\n    type Error;\n    type Future: Future<Output = Result<Self::Response, Self::Error>>;\n\n    fn poll_ready(&mut self, cx: &mut Context<'_>)\n        -> Poll<Result<(), Self::Error>>;\n    fn call(&mut self, request: Request) -> Self::Future;\n}" },
      { title: "Why Request is generic but outputs are associated", paragraphs: ["A service may intentionally accept several request types, so Request is a trait parameter. For a chosen request type, it has one response, error, and future type, so those are associated types. The distinction follows the relationship between implementer and types."], note: "Ask whether an implementation chooses one type or should support many. That question often resolves associated type versus generic parameter." },
      { title: "Readiness before work", paragraphs: ["poll_ready models backpressure. A service may be temporarily unable to accept another request because a connection pool is full or concurrency limit is reached. Separating readiness from call prevents unbounded queues from hiding inside every service."], code: "ready!(service.poll_ready(cx))?;\nlet response = service.call(request).await?;" },
      { title: "Layer separates configuration from traffic", paragraphs: ["A Layer<S> transforms an inner service S into a wrapped service. The layer typically stores reusable configuration; the produced service stores per-instance state. ServiceBuilder composes layers in a readable order."], code: "let service = ServiceBuilder::new()\n    .timeout(Duration::from_secs(2))\n    .concurrency_limit(64)\n    .layer(TraceLayer::new_for_http())\n    .service(inner);" },
      { title: "The price of zero-cost composition", paragraphs: ["Every layer changes the concrete service type, sometimes producing intimidating compiler messages. Associated future types can also force implementers to name custom futures or box them. Tower chooses infrastructure performance and broad composition; an application-facing API may reasonably hide these types behind impl Trait or a boxed service."], bullets: ["Make middleware transparent where possible: preserve response and error types.", "Separate configuration objects from runtime objects.", "Model capacity when overload matters.", "Offer an erased escape hatch when concrete types become unusable."] },
    ],
    sources: [{ label: "Tower repository", url: "https://github.com/tower-rs/tower" }, { label: "Service trait", url: "https://github.com/tower-rs/tower/blob/master/tower-service/src/lib.rs" }, { label: "ServiceBuilder", url: "https://github.com/tower-rs/tower/blob/master/tower/src/builder/mod.rs" }],
  },
  {
    slug: "retry-and-replayability", number: 11, part: "Part IV · Production evolution", level: "Advanced", time: "70 min",
    title: "Retry and replayability", subtitle: "Tower and Reqwest make a hidden ownership problem part of the design.",
    apis: ["tower::retry::Policy", "reqwest::Request::try_clone", "FnMut attempt factories"],
    sections: [
      { title: "Retry means replay", paragraphs: ["The first service call consumes its request. A second attempt therefore needs another request. Requiring Req: Clone seems easy until a request contains a file stream, network stream, or one-shot channel receiver. Those values cannot be duplicated faithfully."], code: "let result = service.call(request).await;\nif result.is_err() {\n    service.call(request).await // error: request was moved\n}" },
      { title: "Make replayability explicit", paragraphs: ["Tower's Policy asks clone_request(&Req) -> Option<Req>. Reqwest exposes Request::try_clone() -> Option<Request>. Both avoid claiming that every request is Clone. None means the initial attempt may proceed but automatic retry is unavailable."], code: "fn clone_request(&mut self, req: &Req) -> Option<Req>;\n\npub fn try_clone(&self) -> Option<Request>;" },
      { title: "Policy inspects responses too", paragraphs: ["A retry system that only sees errors misses protocol-level temporary failures. HTTP 503 is often Ok(Response), not Err. Tower therefore gives Policy access to Result<Response, Error> and the request, allowing method safety, status, headers, and transport errors to influence the decision."], note: "Fallible operations often have two failure layers: failure to complete the protocol, and a completed protocol response that asks the caller to try later." },
      { title: "An alternative: recreate each attempt", paragraphs: ["For application APIs, accepting a closure can avoid cloning altogether. The closure rebuilds fresh owned input for every attempt. FnMut permits it to update attempt state; its returned Future performs one try."], code: "async fn retry<F, Fut, T, E>(mut attempt: F) -> Result<T, E>\nwhere\n    F: FnMut() -> Fut,\n    Fut: Future<Output = Result<T, E>>,\n{\n    loop {\n        match attempt().await {\n            Ok(value) => return Ok(value),\n            Err(error) if should_retry(&error) => backoff().await,\n            Err(error) => return Err(error),\n        }\n    }\n}" },
      { title: "Safety is semantic, not only mechanical", paragraphs: ["A request can be byte-for-byte replayable but unsafe to repeat. A payment POST may charge twice unless it carries an idempotency key. Retry APIs need policy hooks or documentation for semantic idempotency, attempt limits, total deadlines, backoff, and cancellation."], bullets: ["Distinguish attempts from retries.", "Do not require Clone merely for implementation convenience.", "Inspect successful protocol responses as well as transport errors.", "Prefer a total deadline over independent per-attempt timeouts.", "Make exhausted retry information available without hiding the final cause."] },
    ],
    sources: [{ label: "Tower Policy", url: "https://github.com/tower-rs/tower/blob/master/tower/src/retry/policy.rs" }, { label: "Tower retry state machine", url: "https://github.com/tower-rs/tower/blob/master/tower/src/retry/future.rs" }, { label: "Reqwest Request", url: "https://github.com/seanmonstar/reqwest/blob/master/src/async_impl/request.rs" }],
  },
  {
    slug: "designing-for-version-two", number: 12, part: "Part IV · Production evolution", level: "Advanced", time: "65 min",
    title: "Designing for version two", subtitle: "Privacy, non-exhaustive types, and sealed traits preserve room for APIs to grow.",
    apis: ["#[non_exhaustive]", "sealed traits", "private error kinds", "feature flags"],
    sections: [
      { title: "Public means promised", paragraphs: ["A public field allows direct construction and mutation. A public enum variant allows exhaustive matching. A public trait allows downstream implementations. Each capability may be desirable, but each is also a compatibility commitment."], code: "// Adding a field breaks struct literals in downstream crates.\npub struct Config {\n    pub timeout: Duration,\n}\n\nlet config = Config { timeout };" },
      { title: "Private fields preserve construction invariants", paragraphs: ["Private fields let constructors and builders validate combinations, introduce defaults, cache derived state, and add new fields later. Expose accessors for facts callers need; do not expose representation simply because writing getters feels repetitive."], code: "pub struct Config {\n    timeout: Duration,\n    retries: usize,\n}\n\nimpl Config {\n    pub fn builder() -> ConfigBuilder { … }\n    pub fn timeout(&self) -> Duration { self.timeout }\n}" },
      { title: "Non-exhaustive types reserve possibilities", paragraphs: ["#[non_exhaustive] on an enum requires downstream matches to include a wildcard, allowing variants to be added compatibly. On structs, it prevents external struct literals. This is useful when the domain will predictably grow, but it reduces exhaustive reasoning for callers."], note: "Do not use non_exhaustive automatically. It trades caller certainty for author flexibility." },
      { title: "Sealed traits control who implements", paragraphs: ["A public trait is difficult to extend with required methods after downstream crates implement it. A sealed trait uses a private supertrait so users can call it and write generic bounds but cannot implement it. The crate retains freedom to add requirements or guarantee a closed set of implementers."], code: "mod private { pub trait Sealed {} }\n\npub trait ByteSource: private::Sealed {\n    fn bytes(&self) -> &[u8];\n}" },
      { title: "A compatibility checklist", bullets: ["Can a caller construct this value directly?", "Can a caller exhaustively match this enum?", "Can another crate implement this trait?", "Does a dependency type appear in the signature?", "Will a new optional setting break callers?", "Are feature flags additive, and do combinations compile?", "Does the error surface expose stable recovery facts rather than internals?"], note: "A good 1.0 API does not predict every feature. It deliberately keeps selected doors open." },
    ],
    sources: [{ label: "Rust API Guidelines checklist", url: "https://rust-lang.github.io/api-guidelines/checklist.html" }, { label: "Reqwest private errors", url: "https://github.com/seanmonstar/reqwest/blob/master/src/error.rs" }, { label: "Apollo Compiler", url: "https://github.com/apollographql/apollo-rs/tree/main/crates/apollo-compiler" }],
  },
  {
    slug: "fluent-apis-have-ownership", number: 13, part: "Part V · Lessons from the field", level: "Intermediate", time: "55 min",
    title: "Fluent APIs have ownership", subtitle: "Bevy, Polars, and Iced look fluent for three different reasons.",
    apis: ["bevy::App", "polars::LazyFrame", "iced::Application"],
    sections: [
      { title: "Two chains that mean different things", paragraphs: ["Method chaining is visual syntax, not a design pattern by itself. Bevy's App assembly methods generally take &mut self and return &mut Self. Polars' LazyFrame transformations take self and return Self. Both read fluently, but their ownership semantics describe different objects.", "A Bevy App is an identity-bearing container under construction: plugins and resources accumulate in one runtime object. A LazyFrame is a query-plan value: each transformation consumes the previous plan and yields a new plan. The method receiver should follow the value's meaning, not a style guide that says builders always consume or always borrow."], code: "app.add_plugins(DefaultPlugins)\n   .insert_resource(Settings::default())\n   .add_systems(Update, tick); // &mut Self -> &mut Self\n\nlet plan = frame.lazy()\n    .filter(col(\"active\").eq(true))\n    .select([col(\"name\")]); // Self -> Self" },
      { title: "Iced separates configuration from execution", paragraphs: ["Iced's Application<P> configuration methods consume and return Self, and run(self) is terminal. This gives the configured application a single-use lifecycle. Fonts, window options, theme functions, and subscriptions accumulate as a value; running consumes the complete recipe."], code: "iced::application(boot, update, view)\n    .window_size((900.0, 600.0))\n    .theme(theme)\n    .run()?;" },
      { title: "Choose from semantics", bullets: ["Use &mut self -> &mut Self for a stable, identity-bearing object assembled in place.", "Use self -> Self for a value-like plan or configuration whose old state should be unavailable.", "Use a consuming terminal method when starting the operation makes reuse surprising.", "Mark plan-like values must_use when silently discarding them is almost certainly a bug.", "Do not choose receivers merely to enable dots between method calls."] },
    ],
    sources: [{ label: "Bevy App", url: "https://github.com/bevyengine/bevy/blob/main/crates/bevy_app/src/app.rs" }, { label: "Polars LazyFrame", url: "https://github.com/pola-rs/polars/blob/main/crates/polars-lazy/src/frame/mod.rs" }, { label: "Iced Application", url: "https://github.com/iced-rs/iced/blob/master/src/application.rs" }],
  },
  {
    slug: "lend-access-with-closures", number: 14, part: "Part V · Lessons from the field", level: "Intermediate", time: "50 min",
    title: "Lend access with closures", subtitle: "egui and ArcSwap constrain borrowed access so synchronization details cannot escape.",
    apis: ["egui::Context", "arc_swap::Guard", "std::thread::scope"],
    sections: [
      { title: "Returning a guard exports your locking policy", paragraphs: ["A method that returns MutexGuard gives callers control over lock duration. They may retain it through expensive work or across another lock acquisition. That flexibility can be correct for a low-level primitive, but a higher-level context often wants a stronger rule.", "egui's Context exposes methods such as input, memory, and data that accept FnOnce and return the closure's result. The state is accessible only during the call. Its lock guard and concrete storage remain private."], code: "let pointer = ctx.input(|input| input.pointer.hover_pos());\n\nctx.memory_mut(|memory| {\n    memory.options.zoom_factor = 1.25;\n});" },
      { title: "The closure is a lifetime boundary", paragraphs: ["The higher-ranked shape of closure-scoped APIs can prevent references tied to temporary access from escaping. This same family includes thread::scope, scoped task APIs, database transactions, and visitors. A closure becomes a small region in which an extra capability is valid."], note: "Closures are not only callbacks. They can delimit access, transactions, threads, tracing spans, and temporary invariants." },
      { title: "When an explicit guard is better", paragraphs: ["ArcSwap intentionally returns a Guard from load because cheap repeated reads and guard lifetime control are central to its low-level purpose. It also offers load_full when the caller wants an owned Arc. The abstraction exposes both costs rather than hiding them."], code: "let guarded = config.load();      // cheap protected view\nlet owned = config.load_full();   // independently owned Arc" },
      { title: "Design rule", bullets: ["Use closure-scoped access when temporary capability boundaries are part of correctness.", "Return explicit guards when callers genuinely need to control access duration.", "Offer an owned escape hatch when retaining a value is common.", "Name closure parameters by role—reader, writer, transaction—not generic callback when that clarifies the contract."] },
    ],
    sources: [{ label: "egui Context", url: "https://github.com/emilk/egui/blob/main/crates/egui/src/context.rs" }, { label: "ArcSwap", url: "https://github.com/vorner/arc-swap/blob/master/src/lib.rs" }],
  },
  {
    slug: "erase-concrete-types-keep-protocols", number: 15, part: "Part V · Lessons from the field", level: "Advanced", time: "60 min",
    title: "Erase concrete types, keep protocols", subtitle: "Iced, Tower, and Bevy show that type erasure need not erase everything useful.",
    apis: ["iced::Element", "tower::util::BoxService", "bevy::Plugin"],
    sections: [
      { title: "The concrete widget type is accidental", paragraphs: ["An Iced widget tree can have an enormous nested concrete type. Element<'a, Message, Theme, Renderer> erases the concrete Widget implementation behind dynamic dispatch while retaining the types that define the application protocol: its emitted Message, Theme, Renderer, and borrowing lifetime.", "This is selective type erasure. The API hides composition detail without reducing every value to an untyped object."], code: "pub struct Element<'a, Message, Theme, Renderer> { /* boxed Widget */ }\n\nfn view(state: &State) -> Element<'_, Message> {\n    button(\"Save\").on_press(Message::Save).into()\n}" },
      { title: "Map preserves structure and changes protocol", paragraphs: ["Element::map consumes an element and transforms its emitted message type. A reusable component may define local messages; a parent maps them into the application's message enum. The child stays decoupled from its embedding context."], code: "counter_view(counter)\n    .map(Message::Counter)" },
      { title: "Static first, erased at boundaries", paragraphs: ["Tower composes concrete Service types for zero-cost middleware, then provides boxed services where type complexity or heterogeneous storage warrants erasure. Bevy plugins use downcasting and trait objects because a runtime plugin registry is inherently heterogeneous. Mature APIs offer the appropriate boundary rather than declaring static or dynamic dispatch universally superior."], bullets: ["Erase implementation detail, not domain information callers still need.", "Keep protocol types—messages, errors, requests—visible through the erased wrapper.", "Prefer static composition internally when it pays off; erase at storage and subsystem boundaries.", "Provide transformations such as map so erased containers remain composable."] },
    ],
    sources: [{ label: "Iced Element", url: "https://github.com/iced-rs/iced/blob/master/core/src/element.rs" }, { label: "Tower boxed services", url: "https://github.com/tower-rs/tower/tree/master/tower/src/util" }, { label: "Bevy Plugin", url: "https://github.com/bevyengine/bevy/blob/main/crates/bevy_app/src/plugin.rs" }],
  },
  {
    slug: "parse-validate-activate", number: 16, part: "Part V · Lessons from the field", level: "Intermediate", time: "55 min",
    title: "Parse, validate, activate", subtitle: "Pingora, rustls, clap, and domain newtypes move failure to the earliest useful boundary.",
    apis: ["pingora::ServerConf", "rustls::ConfigBuilder", "clap::Parser", "uuid::Uuid"],
    sections: [
      { title: "Deserialized does not mean usable", paragraphs: ["Pingora's ServerConf can be loaded from YAML, merged with command-line options, and validated. Its validate(self) -> Result<Self> consumes the candidate and returns a usable value only after cross-field checks. The ownership transition prevents accidentally continuing with the unchecked value."], code: "let config = ServerConf::load_from_yaml(path)?\n    .validate()?;" },
      { title: "Typestate makes required steps unskippable", paragraphs: ["rustls uses ConfigBuilder<Side, State>. State types such as WantsVerifier make the construction phase part of the type. Methods available in one phase transition to another, and a final ClientConfig or ServerConfig cannot be obtained until security-critical choices are supplied.", "Typestate is strongest when steps are few, ordered, and safety-relevant. It becomes counterproductive when it creates a combinatorial set of states for ordinary optional configuration."], code: "let config = ClientConfig::builder()\n    .with_root_certificates(roots)\n    .with_no_client_auth();" },
      { title: "Derive at text-heavy boundaries", paragraphs: ["Clap projects a typed struct onto command-line strings. uuid, url, semver, and time similarly turn untrusted text into validated domain values. Once parsing succeeds, downstream functions can accept the domain type and stop rechecking syntax."], note: "Parse, don't validate means making the parsed type carry the invariant—not merely calling validate and continuing to pass the original string." },
      { title: "Design rule", bullets: ["Separate syntax parsing from semantic cross-field validation.", "Consume an unchecked candidate when successful validation should replace it.", "Use distinct validated types when callers must not confuse the phases.", "Use typestate for short, essential construction protocols—not every optional setting.", "Make safe defaults easy and unsafe choices conspicuous."] },
    ],
    sources: [{ label: "Pingora configuration", url: "https://github.com/cloudflare/pingora/blob/main/pingora-core/src/server/configuration/mod.rs" }, { label: "rustls ConfigBuilder", url: "https://github.com/rustls/rustls/blob/main/rustls/src/builder.rs" }, { label: "Clap", url: "https://github.com/clap-rs/clap" }],
  },
  {
    slug: "lazy-programs-are-values", number: 17, part: "Part V · Lessons from the field", level: "Advanced", time: "55 min",
    title: "Lazy programs are values", subtitle: "Polars, Nushell, Typst, and parser libraries expose plans that can be inspected before execution.",
    apis: ["polars::LazyFrame", "nu_protocol::PipelineData", "typst::World", "winnow::Parser"],
    sections: [
      { title: "Delay work to preserve optimization", paragraphs: ["A LazyFrame records a logical query rather than immediately processing rows. Because the plan remains a value, Polars can push projections and predicates, eliminate common subplans, choose streaming execution, and explain the optimized plan. Eager convenience would surrender those choices too early."], code: "let query = scan_parquet(path, args)?\n    .filter(col(\"year\").gt(lit(2020)))\n    .group_by([col(\"country\")])\n    .agg([col(\"sales\").sum()]);\n\nprintln!(\"{}\", query.explain(true)?);\nlet result = query.collect()?;" },
      { title: "must_use communicates unfinished work", paragraphs: ["Polars marks LazyFrame must_use. Nushell marks conversions that would otherwise silently discard a transformed pipeline. The attribute is appropriate for plan, future, result, guard, and builder values whose destruction usually means a forgotten action."], note: "must_use should identify probable mistakes, not punish callers for every ignored convenience value. A warning that fires constantly loses authority." },
      { title: "One enum can preserve multiple execution modes", paragraphs: ["Nushell's PipelineData represents immediate values, list streams, byte streams, empty data, and metadata. Its map, flat_map, write_to, and collection methods operate across modes without forcing eager buffering at every command boundary. The enum makes different execution forms explicit while preserving one pipeline vocabulary."], bullets: ["Represent plans as values when inspection, caching, optimization, or alternate execution matters.", "Provide an explicit terminal verb: collect, run, execute, write, compile.", "Expose explain or debug representations for complex plans.", "Preserve streaming until an operation truly requires materialization.", "Use must_use when dropping the plan is almost certainly accidental."] },
    ],
    sources: [{ label: "Polars LazyFrame", url: "https://github.com/pola-rs/polars/blob/main/crates/polars-lazy/src/frame/mod.rs" }, { label: "Nushell PipelineData", url: "https://github.com/nushell/nushell/blob/main/crates/nu-protocol/src/pipeline/pipeline_data.rs" }, { label: "Typst compile API", url: "https://github.com/typst/typst/blob/main/crates/typst/src/lib.rs" }],
  },
  {
    slug: "ecosystem-scale-compatibility", number: 18, part: "Part V · Lessons from the field", level: "Advanced", time: "60 min",
    title: "Compatibility at ecosystem scale", subtitle: "Tauri, bitflags, Serde, and the Rust standard library reserve different kinds of future change.",
    apis: ["tauri::RunEvent", "bitflags!", "Serde attributes", "feature flags"],
    sections: [
      { title: "Open domains need open matching", paragraphs: ["Tauri marks runtime event enums non_exhaustive, including selected struct-like variants. Desktop and mobile platforms evolve; a downstream exhaustive match would turn every new event into a breaking release. The wildcard is the price callers pay for ecosystem growth."], code: "match event {\n    RunEvent::ExitRequested { api, .. } => api.prevent_exit(),\n    RunEvent::WindowEvent { label, event, .. } => handle(label, event),\n    _ => {} // future events remain compatible\n}" },
      { title: "Unknown bits are not unknown variants", paragraphs: ["Bitflags represents a set whose backing integer may contain flags a newer producer understands. APIs must choose whether to retain, truncate, reject, or expose unknown bits. Forward compatibility here is about preserving representation, not adding an enum wildcard.", "The lesson is broader: identify whether your domain is closed, open by named cases, or open by opaque data. Each needs a different compatibility mechanism."], note: "Non-exhaustive is not a universal future-proofing switch. Choose a mechanism matching how the domain can grow." },
      { title: "Features form a public matrix", paragraphs: ["Serde, Tokio, and other foundational crates use feature flags to keep dependencies and capabilities optional. Every advertised feature combination is part of the API surface. Additive features are easier to reason about than flags that remove methods or change semantics. Re-exports and prelude modules similarly become compatibility commitments."], bullets: ["Use non_exhaustive for predictably growing named variants.", "Preserve unknown representation data when round-tripping matters.", "Keep feature flags additive where possible and test meaningful combinations.", "Avoid exposing dependency types unintentionally; they couple your versioning to another crate.", "Document MSRV and whether it changes only in minor or major releases."] },
    ],
    sources: [{ label: "Tauri RunEvent", url: "https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/app.rs" }, { label: "bitflags", url: "https://github.com/bitflags/bitflags" }, { label: "Serde feature flags", url: "https://github.com/serde-rs/serde/blob/master/serde/Cargo.toml" }],
  },
  {
    slug: "research-method", number: 19, part: "Appendix", level: "Foundation", time: "20 min",
    title: "How this evidence was selected", subtitle: "A reproducible popularity snapshot, a curated control cohort, and important limits on what the sample proves.",
    apis: ["100 GitHub repositories", "40 curated libraries", "snapshot: 2026-08-13"],
    sections: [
      { title: "The top-100 snapshot", paragraphs: ["On 13 August 2026, the study queried GitHub's repository search API for language:rust ordered by stars and recorded the first 100 results. Every repository was cloned from its default branch at depth one and pinned to an exact commit. The snapshot is reproducible but time-sensitive: stars, repository ownership, and default branches change.", "All 100 clones were verified by resolving HEAD and reading its commit object. Partial clone filtering avoids downloading file contents until inspected; it does not change the commit or tree being studied."], code: "gh api 'search/repositories?q=language%3Arust&sort=stars&order=desc&per_page=100'\n\ngit clone --depth 1 --filter=blob:none --no-checkout <repository>" },
      { title: "Popularity is not API quality", paragraphs: ["The top results contain libraries, applications, compilers, teaching material, generated workspaces, and recent viral projects. Stars measure attention, not design. Eighty-seven repositories contain at least one src/lib.rs, but many of those library crates are internal workspace boundaries rather than supported downstream APIs.", "Consequently, no principle in this book is justified by star count alone. Claims rely on documented public entry points, caller examples, and a traced implementation path. Applications contribute lessons only where they expose a deliberate reusable boundary."], note: "The top 100 is a field sample. It reveals what successful Rust systems actually do, including tradeoffs and inconsistencies; it is not a leaderboard of API craftsmanship." },
      { title: "The curated control cohort", paragraphs: ["A separate cohort of 40 purpose-built libraries fills gaps that popularity rankings systematically miss. It covers macros, errors, parsing, concurrency, data structures, networking, validated domain types, testing, and safety abstractions. Inclusion is editorial and each repository has an explicit lesson hypothesis.", "Examples include Serde, Clap, syn, Rayon, Crossbeam, bytes, bstr, http, Tower, rustls, thiserror, nom, Winnow, regex, UUID, time, camino, proptest, bitflags, pin-project, and async-trait."], bullets: ["Compare at least two APIs before generalizing a rule.", "Prefer supported public surfaces over internal pub visibility.", "Separate descriptive findings—what projects do—from normative advice—what a new API should do.", "Cite exact upstream files so readers can challenge the interpretation.", "Deepen Git history only for selected evolution case studies; the main corpus represents current design."] },
      { title: "What the study does not prove", paragraphs: ["The sample does not measure usability experimentally, survey downstream users, or score repositories. It cannot show that one receiver style, error representation, or dispatch strategy wins universally. Repository language classification is approximate, and GitHub search ranking can be influenced by trends unrelated to Rust library use.", "The book therefore presents contextual heuristics. The most valuable finding is often a contrast: two mature projects choose different APIs because their values have different identity, lifecycle, performance, or compatibility constraints."] },
    ],
    sources: [{ label: "GitHub search syntax", url: "https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories" }, { label: "Research repository", url: "https://github.com/beejmaxx/rust-api-field-guide" }],
  },
];

function routeFromHash() {
  const match = window.location.hash.match(/^#\/chapter\/([^/]+)/);
  return match?.[1] ?? null;
}

function Sidebar({ current, onClose }: { current: string | null; onClose: () => void }) {
  const parts = [...new Set(chapters.map(c => c.part))];
  return <aside className="book-sidebar">
    <div className="book-brand"><a href="#/" onClick={onClose}><span>R</span><b>Rust API<br/>Field Guide</b></a><button onClick={onClose} aria-label="Close navigation">×</button></div>
    <div className="sidebar-scroll">
      <a className={!current ? "chapter-link active" : "chapter-link"} href="#/" onClick={onClose}><i>→</i><span>Introduction</span></a>
      {parts.map(part => <div className="part" key={part}><h3>{part}</h3>{chapters.filter(c => c.part === part).map(c => <a className={current === c.slug ? "chapter-link active" : "chapter-link"} href={`#/chapter/${c.slug}`} onClick={onClose} key={c.slug}><i>{String(c.number).padStart(2,"0")}</i><span>{c.title}</span></a>)}</div>)}
      <div className="sidebar-bottom"><a href="https://github.com/beejmaxx/rust-api-field-guide" target="_blank" rel="noreferrer">Source on GitHub ↗</a></div>
    </div>
  </aside>;
}

function Introduction() {
  const parts = [...new Set(chapters.map(c => c.part))];
  return <article className="book-page intro-page">
    <div className="eyebrow">A SOURCE-READING BOOK</div>
    <h1>Rust API<br/><em>Field Guide</em></h1>
    <p className="lede">A practical guide to designing Rust APIs, grounded in the standard library, a reproducible study of GitHub&apos;s top 100 Rust repositories, and 40 purpose-built libraries.</p>
    <div className="intro-rule"><span>19 chapters</span><span>140 repositories studied</span><span>About 17 hours</span></div>
    <section id="about"><h2>What this book teaches</h2><p>Rust API design is the art of turning behavioral promises into types. A signature can describe ownership, mutation, absence, failure, concurrency, extensibility, and compatibility. The best APIs do this without making ordinary use feel ceremonial.</p><p>This book studies those choices in real libraries and production systems. We begin with Option and Result, work through ownership and iterators, then examine builders, Serde, Tokio, Axum, Tower, retry, and long-term API evolution. A research-derived final part compares Bevy, Polars, egui, Iced, Pingora, Tauri, Nushell, rustls, and other mature projects. The aim is not to memorize patterns. It is to develop judgment about tradeoffs.</p></section>
    <aside className="callout"><b>Prerequisites</b><p>You should be able to read basic Rust: structs, enums, match, references, generics, traits, Result, and Cargo. Advanced chapters explain the additional machinery they use.</p></aside>
    <section id="how"><h2>How to read this book</h2><p>Read in order on the first pass. Every chapter assumes vocabulary introduced earlier. Type the small examples rather than copying them. When a signature feels surprising, pause and predict the alternative before reading the explanation.</p><ol className="reading-steps"><li><b>Read the caller’s view.</b><span>What must a user provide? What do they receive?</span></li><li><b>Trace ownership.</b><span>Which values move, borrow, mutate, or outlive the call?</span></li><li><b>Find the promise.</b><span>Which behavior is guaranteed by the type rather than prose?</span></li><li><b>Challenge the choice.</b><span>What would become easier or harder with another design?</span></li></ol></section>
    <section id="contents"><h2>Contents</h2>{parts.map(part => <div className="contents-part" key={part}><h3>{part}</h3>{chapters.filter(c=>c.part===part).map(c=><a href={`#/chapter/${c.slug}`} key={c.slug}><span>{String(c.number).padStart(2,"0")}</span><b>{c.title}</b><i>{c.time}</i></a>)}</div>)}</section>
    <a className="begin" href={`#/chapter/${chapters[0].slug}`}><span>Begin reading</span><b>Chapter 1 · {chapters[0].title}</b><i>→</i></a>
  </article>;
}

function ChapterPage({ chapter }: { chapter: Chapter }) {
  const index = chapters.findIndex(c => c.slug === chapter.slug);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  useEffect(() => { window.scrollTo(0, 0); }, [chapter.slug]);
  return <>
    <article className="book-page chapter-page">
      <header className="chapter-header"><div className="eyebrow">{chapter.part} · Chapter {chapter.number}</div><h1>{chapter.title}</h1><p className="lede">{chapter.subtitle}</p><div className="chapter-meta"><span>{chapter.level}</span><span>{chapter.time} read</span><span>{chapter.apis.join(" · ")}</span></div></header>
      {chapter.sections.map((section, i) => <section id={`section-${i+1}`} key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs?.map((p,j)=><p key={j}>{p}</p>)}
        {section.code && <div className="code-block"><div><span></span><span></span><span></span><b>Rust</b></div><pre><code>{section.code}</code></pre></div>}
        {section.note && <aside className="callout"><b>Design note</b><p>{section.note}</p></aside>}
        {section.bullets && <ul className="rule-list">{section.bullets.map(b=><li key={b}><span>✓</span>{b}</li>)}</ul>}
      </section>)}
      <section className="sources"><h2>Read the source</h2><p>The public surface is the primary text. Open these files and trace one ordinary call path.</p>{chapter.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label}<span>GitHub ↗</span></a>)}</section>
      <nav className="page-nav">
        {previous ? <a href={`#/chapter/${previous.slug}`} className="prev"><span>← Previous</span><b>{previous.title}</b></a> : <a href="#/" className="prev"><span>← Previous</span><b>Introduction</b></a>}
        {next && <a href={`#/chapter/${next.slug}`} className="next"><span>Next →</span><b>{next.title}</b></a>}
      </nav>
    </article>
    <aside className="on-this-page"><b>On this page</b>{chapter.sections.map((s,i)=><a href={`#/chapter/${chapter.slug}#section-${i+1}`} onClick={(e)=>{e.preventDefault();document.getElementById(`section-${i+1}`)?.scrollIntoView({behavior:"smooth"});}} key={s.title}>{s.title}</a>)}<a href={`#/chapter/${chapter.slug}#sources`} onClick={(e)=>{e.preventDefault();document.querySelector(".sources")?.scrollIntoView({behavior:"smooth"});}}>Read the source</a></aside>
  </>;
}

export default function Home() {
  const [slug, setSlug] = useState<string|null>(() => routeFromHash());
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const update = () => { setSlug(routeFromHash()); setSidebar(false); setSearch(false); };
    window.addEventListener("hashchange", update);
    const keys = (e: KeyboardEvent) => {
      if ((e.key === "/" || e.key.toLowerCase() === "s") && !/input|textarea/i.test((e.target as HTMLElement).tagName)) { e.preventDefault(); setSearch(true); }
      if (e.key === "Escape") { setSearch(false); setSidebar(false); }
      const i = chapters.findIndex(c=>c.slug===routeFromHash());
      if (e.key === "ArrowRight" && i >= 0 && chapters[i+1]) location.hash=`/chapter/${chapters[i+1].slug}`;
      if (e.key === "ArrowLeft" && i > 0) location.hash=`/chapter/${chapters[i-1].slug}`;
    };
    window.addEventListener("keydown", keys);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("keydown", keys); };
  }, []);
  const chapter = chapters.find(c => c.slug === slug);
  const results = useMemo(() => chapters.filter(c => `${c.title} ${c.subtitle} ${c.apis.join(" ")} ${c.sections.map(s=>s.title).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="book-shell">
    <div className={sidebar ? "sidebar-wrap visible" : "sidebar-wrap"}><Sidebar current={chapter?.slug ?? null} onClose={()=>setSidebar(false)}/><button className="scrim" onClick={()=>setSidebar(false)} aria-label="Close navigation"/></div>
    <header className="mobile-bar"><button onClick={()=>setSidebar(true)} aria-label="Open table of contents">☰</button><a href="#/">Rust API Field Guide</a><button onClick={()=>setSearch(true)} aria-label="Search">⌕</button></header>
    <main className="reader">{chapter ? <ChapterPage chapter={chapter}/> : <Introduction/>}</main>
    <button className="search-button" onClick={()=>setSearch(true)}><span>⌕</span> Search <kbd>/</kbd></button>
    {search && <div className="search-modal" role="dialog" aria-modal="true"><button className="modal-scrim" onClick={()=>setSearch(false)} aria-label="Close search"/><div className="search-box"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search chapters and APIs…" aria-label="Search chapters and APIs"/><kbd>esc</kbd></label><div>{results.map(c=><a href={`#/chapter/${c.slug}`} key={c.slug}><i>{String(c.number).padStart(2,"0")}</i><span><b>{c.title}</b><small>{c.subtitle}</small></span><em>→</em></a>)}</div></div></div>}
  </div>;
}
