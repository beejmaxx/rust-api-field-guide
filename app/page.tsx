"use client";

import { useMemo, useState } from "react";

type Study = {
  n: number;
  name: string;
  crate: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  topic: string;
  lesson: string;
  signature: string;
  why: string;
  read: string;
  repo: string;
};

const studies: Study[] = [
  { n: 1, name: "Absence without ambiguity", crate: "std::Option", level: "Foundation", topic: "Errors", lesson: "Model one expected kind of absence as a two-variant enum.", signature: "pub enum Option<T> { None, Some(T) }", why: "The type makes absence visible while keeping the happy path lightweight. Its combinators turn branching into composition.", read: "library/core/src/option.rs — enum, map, and_then, as_ref", repo: "https://github.com/rust-lang/rust/blob/master/library/core/src/option.rs" },
  { n: 2, name: "Failure as a value", crate: "std::Result", level: "Foundation", topic: "Errors", lesson: "Keep success and failure types explicit and composable.", signature: "pub enum Result<T, E> { Ok(T), Err(E) }", why: "Result works with pattern matching, the ? operator, iterators, and conversion traits without prescribing one universal error type.", read: "library/core/src/result.rs — map, map_err, and_then", repo: "https://github.com/rust-lang/rust/blob/master/library/core/src/result.rs" },
  { n: 3, name: "Borrow the widest useful input", crate: "std::Path", level: "Foundation", topic: "Ownership", lesson: "Accept borrowed views; let callers choose storage.", signature: "pub fn open<P: AsRef<Path>>(path: P) -> Result<File>", why: "Path and PathBuf mirror str and String. AsRef<Path> accepts several path-like inputs without taking ownership or allocating.", read: "library/std/src/path.rs — Path, PathBuf, AsRef implementations", repo: "https://github.com/rust-lang/rust/blob/master/library/std/src/path.rs" },
  { n: 4, name: "Ownership with automatic cleanup", crate: "std::fs::File", level: "Foundation", topic: "Ownership", lesson: "Make a resource an owned value whose lifetime controls cleanup.", signature: "pub fn open<P: AsRef<Path>>(path: P) -> io::Result<File>", why: "RAII removes close() from the ordinary API. Read and Write use &mut self because I/O advances resource state.", read: "library/std/src/fs.rs — File::open, OpenOptions", repo: "https://github.com/rust-lang/rust/blob/master/library/std/src/fs.rs" },
  { n: 5, name: "One trait, an ecosystem of adapters", crate: "std::Iterator", level: "Foundation", topic: "Traits", lesson: "A tiny required core can support a rich provided API.", signature: "trait Iterator { type Item; fn next(&mut self) -> Option<Self::Item>; }", why: "Only next is fundamental. Dozens of lazy, zero-cost adapters build on it, and the associated type states that an iterator has one item type.", read: "library/core/src/iter/traits/iterator.rs — next, map, collect", repo: "https://github.com/rust-lang/rust/blob/master/library/core/src/iter/traits/iterator.rs" },
  { n: 6, name: "Convert at the boundary", crate: "std::From / TryFrom", level: "Foundation", topic: "Conversions", lesson: "Use conversion traits to make interoperability predictable.", signature: "trait TryFrom<T> { type Error; fn try_from(value: T) -> Result<Self, Self::Error>; }", why: "From implies Into automatically; TryFrom names failure. Generic callers can accept inputs without inventing crate-specific conversion conventions.", read: "library/core/src/convert/mod.rs — From, Into, AsRef, TryFrom", repo: "https://github.com/rust-lang/rust/blob/master/library/core/src/convert/mod.rs" },
  { n: 7, name: "Borrowed or owned, only when needed", crate: "std::borrow::Cow", level: "Foundation", topic: "Ownership", lesson: "Delay allocation while preserving an owned escape hatch.", signature: "pub enum Cow<'a, B> { Borrowed(&'a B), Owned(B::Owned) }", why: "Cow makes copy-on-write explicit and is especially useful when most values pass through unchanged.", read: "library/alloc/src/borrow.rs — Cow and to_mut", repo: "https://github.com/rust-lang/rust/blob/master/library/alloc/src/borrow.rs" },
  { n: 8, name: "A collection with two entry modes", crate: "HashMap::entry", level: "Foundation", topic: "Ergonomics", lesson: "Represent a lookup decision as a value that can be refined fluently.", signature: "pub fn entry(&mut self, key: K) -> Entry<'_, K, V>", why: "Entry avoids duplicate lookups and exposes occupied/vacant states as types. or_insert returns a useful mutable reference.", read: "library/std/src/collections/hash/map.rs — Entry API", repo: "https://github.com/rust-lang/rust/blob/master/library/std/src/collections/hash/map.rs" },
  { n: 9, name: "Protocol head, generic body", crate: "http::Request<T>", level: "Intermediate", topic: "Generics", lesson: "Keep stable metadata separate from an application-defined payload.", signature: "pub struct Request<T> { head: Parts, body: T }", why: "A generic body avoids boxing and lets one protocol type serve bytes, streams, and empty bodies. map transforms only the payload.", read: "src/request.rs — Request<T>, into_parts, map", repo: "https://github.com/hyperium/http/blob/master/src/request.rs" },
  { n: 10, name: "Fluent construction, retained failure", crate: "http::request::Builder", level: "Intermediate", topic: "Builders", lesson: "Let a builder remember conversion errors until its terminal method.", signature: "pub fn body<T>(self, body: T) -> Result<Request<T>>", why: "Setter calls stay fluent even though strings-to-methods and strings-to-URIs can fail. The terminal call is the single error boundary.", read: "src/request.rs — Builder and body", repo: "https://github.com/hyperium/http/blob/master/src/request.rs" },
  { n: 11, name: "Derive behavior from data types", crate: "serde", level: "Intermediate", topic: "Traits", lesson: "Separate a data model from formats through Serialize and Deserialize.", signature: "trait Serialize { fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>; }", why: "The data type knows its structure; the serializer knows its format. The visitor model supports borrowed, streaming deserialization.", read: "serde/src/ser/mod.rs and de/mod.rs — core traits", repo: "https://github.com/serde-rs/serde" },
  { n: 12, name: "Typed configuration from CLI text", crate: "clap", level: "Intermediate", topic: "Macros", lesson: "Use derives to project a type-safe domain model onto a stringly boundary.", signature: "#[derive(Parser)] struct Cli { #[arg(long)] port: u16 }", why: "One struct drives parsing, validation, usage, and help. Field types remove downstream string parsing and impossible states.", read: "clap_derive and examples — Parser, Args, Subcommand", repo: "https://github.com/clap-rs/clap" },
  { n: 13, name: "Errors for library callers", crate: "thiserror", level: "Intermediate", topic: "Errors", lesson: "Derive standard error plumbing without changing your public representation.", signature: "#[derive(Error, Debug)] enum DataError { #[error(transparent)] Io(#[from] io::Error) }", why: "The crate generates Display, Error, source, and From while your enum remains an ordinary concrete type callers can match.", read: "src/lib.rs and examples — transparent errors and sources", repo: "https://github.com/dtolnay/thiserror" },
  { n: 14, name: "Ergonomic async request building", crate: "reqwest", level: "Intermediate", topic: "Builders", lesson: "Use a cheap client handle and consume one-shot request builders.", signature: "pub async fn send(self) -> Result<Response>", why: "Client owns pooled state; RequestBuilder accumulates configuration; send consumes it because a body may be a one-shot stream.", read: "src/async_impl/request.rs — RequestBuilder, build, send, try_clone", repo: "https://github.com/seanmonstar/reqwest/blob/master/src/async_impl/request.rs" },
  { n: 15, name: "Capabilities as async extension traits", crate: "tokio::io", level: "Intermediate", topic: "Async", lesson: "Put ergonomic async methods in extension traits over minimal poll traits.", signature: "fn read<'a>(&'a mut self, buf: &'a mut [u8]) -> Read<'a, Self>", why: "AsyncRead stays runtime machinery; AsyncReadExt supplies discoverable methods. Borrowed buffers avoid allocation and encode exclusivity.", read: "tokio/src/io/util/async_read_ext.rs", repo: "https://github.com/tokio-rs/tokio/blob/master/tokio/src/io/util/async_read_ext.rs" },
  { n: 16, name: "Streams are async iterators", crate: "futures::Stream", level: "Intermediate", topic: "Async", lesson: "Reuse a familiar abstraction while making readiness explicit.", signature: "fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>>", why: "Poll<Option<Item>> composes end-of-stream with async readiness. Pin makes self-referential async state safe.", read: "futures-core/src/stream.rs and StreamExt", repo: "https://github.com/rust-lang/futures-rs" },
  { n: 17, name: "Extract inputs, convert outputs", crate: "axum", level: "Intermediate", topic: "Conversions", lesson: "Turn handler parameters and return values into an extensible protocol DSL.", signature: "async fn handler(Path(id): Path<u64>) -> Result<Json<User>, AppError>", why: "FromRequest and IntoResponse keep handlers ordinary async functions. New behavior arrives through trait implementations, not framework base classes.", read: "axum-core/src/extract and response/into_response.rs", repo: "https://github.com/tokio-rs/axum" },
  { n: 18, name: "Observability through structured fields", crate: "tracing", level: "Intermediate", topic: "Macros", lesson: "Design macros that capture syntax the type system cannot express ergonomically.", signature: "let span = tracing::info_span!(\"request\", method = %method);", why: "Spans preserve causality across async work; typed fields remain machine-readable. Subscribers are decoupled from instrumentation.", read: "tracing/src/macros.rs and tracing-core", repo: "https://github.com/tokio-rs/tracing" },
  { n: 19, name: "One async operation abstraction", crate: "tower::Service", level: "Advanced", topic: "Traits", lesson: "Standardize request/response behavior without fixing concrete types.", signature: "trait Service<Request> { type Response; type Error; type Future; fn call(&mut self, req: Request) -> Self::Future; }", why: "Associated types permit zero-cost concrete futures. poll_ready models backpressure separately from starting work.", read: "tower-service/src/lib.rs and tower/src/builder", repo: "https://github.com/tower-rs/tower" },
  { n: 20, name: "Retry without assuming Clone", crate: "tower::retry::Policy", level: "Advanced", topic: "Ownership", lesson: "Make replayability an explicit fallible operation.", signature: "fn clone_request(&mut self, req: &Req) -> Option<Req>", why: "Streaming bodies may not be replayable. Option permits a first attempt while gracefully disabling retry for that request.", read: "tower/src/retry/policy.rs and future.rs", repo: "https://github.com/tower-rs/tower/blob/master/tower/src/retry/policy.rs" },
  { n: 21, name: "Runtime-neutral async HTTP", crate: "hyper", level: "Advanced", topic: "Async", lesson: "Build on traits and body frames rather than one runtime-specific convenience API.", signature: "pub trait Body { type Data: Buf; type Error; fn poll_frame(...) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>>; }", why: "A streaming body is generic over data and error, supports trailers, and does not force buffering. Higher-level crates can add convenience.", read: "http-body/src/lib.rs and hyper service modules", repo: "https://github.com/hyperium/hyper" },
  { n: 22, name: "Queries checked against the database", crate: "sqlx", level: "Advanced", topic: "Macros", lesson: "Spend compile-time work to remove an entire class of runtime errors.", signature: "sqlx::query_as!(User, \"SELECT id, name FROM users WHERE id = ?\", id)", why: "The macro validates SQL and maps output types while the Executor trait keeps connections and transactions generic.", read: "sqlx-core/src/executor.rs and sqlx-macros", repo: "https://github.com/launchbadge/sqlx" },
  { n: 23, name: "State machines in the type system", crate: "typestate builders", level: "Advanced", topic: "Builders", lesson: "Use generic marker states only when construction order is genuinely safety-critical.", signature: "impl ClientBuilder<MissingUrl> { fn url(self, url: Url) -> ClientBuilder<HasUrl> }", why: "A terminal method can exist only for valid states. The tradeoff is more public types and harder diagnostics—valuable when misuse is costly.", read: "AWS SDK smithy client builders as a large-scale example", repo: "https://github.com/smithy-lang/smithy-rs" },
  { n: 24, name: "A domain API that survives growth", crate: "apollo-compiler", level: "Advanced", topic: "Evolution", lesson: "Expose semantic domain concepts while keeping representation details private.", signature: "pub struct Schema { /* private representation */ }", why: "Parsed syntax, validation, schema coordinates, and diagnostics form layers. Private fields preserve room to evolve internals without breaking callers.", read: "crates/apollo-compiler/src/lib.rs and validation", repo: "https://github.com/apollographql/apollo-rs/tree/main/crates/apollo-compiler" },
];

const topics = ["All", "Ownership", "Errors", "Traits", "Builders", "Conversions", "Generics", "Async", "Macros", "Ergonomics", "Evolution"];

type Workshop = { n:number; title:string; build:string; time:string; concepts:string; steps:string[]; checkpoint:string; code:string };
const workshops: Workshop[] = [
  { n:1, title:"Design a tiny parser", build:"Turn strings into a validated Port type", time:"25 min", concepts:"newtypes · Result · FromStr", steps:["Begin with fn parse_port(&str) -> u16 and observe the lie in its return type.","Introduce Port(u16) so invalid values cannot enter the rest of the program.","Define PortError variants for syntax, zero, and reserved ports.","Implement FromStr so the type works naturally with str::parse."], checkpoint:"cargo test — valid ports construct; invalid states have distinct errors", code:"impl FromStr for Port {\n  type Err = PortError;\n  fn from_str(s: &str) -> Result<Self, Self::Err> { … }\n}" },
  { n:2, title:"Evolve a file loader", build:"Grow one rigid function into an ergonomic borrowed API", time:"30 min", concepts:"borrowing · AsRef · error context", steps:["Start with fn load(path: String), then note the unnecessary ownership transfer.","Change the boundary to &Path and call it with PathBuf and Path.","Generalize to P: AsRef<Path> and inspect what callers gain.","Wrap io::Error with the path that failed, without erasing its source."], checkpoint:"cargo test — String, &str, PathBuf, and &Path all work", code:"pub fn load<P: AsRef<Path>>(path: P)\n  -> Result<Config, LoadError> { … }" },
  { n:3, title:"Build a fallible request builder", build:"Construct a generic Request<T> without setter boilerplate", time:"40 min", concepts:"builders · generics · delayed errors", steps:["Split request metadata into Parts and keep the body generic.","Add method and uri setters that accept convertible inputs.","Store the first conversion failure inside Builder to keep calls fluent.","Make body(self, T) the terminal error boundary; add into_parts and map."], checkpoint:"cargo test — fluent success, retained error, and body transformation", code:"Request::builder()\n  .method(\"POST\")\n  .uri(\"/notes\")\n  .body(bytes)?" },
  { n:4, title:"Invent a lazy iterator adapter", build:"Implement take_until without allocating", time:"35 min", concepts:"Iterator · closures · associated types", steps:["Write the eager Vec-returning version as a baseline.","Create TakeUntil<I, P> that stores an iterator and predicate.","Implement Iterator with type Item = I::Item and one next method.","Add an extension trait so callers can write iter.take_until(predicate)."], checkpoint:"cargo test — lazy behavior, stopping rule, and fused completion", code:"items.into_iter()\n  .take_until(|item| item.is_terminal())\n  .collect::<Vec<_>>()" },
  { n:5, title:"Separate data from formats", build:"Serialize one domain type into two output formats", time:"45 min", concepts:"traits · associated types · visitors", steps:["Hard-code User::to_json and identify the coupling.","Define a minimal Serializer trait with Ok and Error associated types.","Make User describe its fields without choosing the output format.","Implement JSON-like and key-value serializers; compare with Serde’s design."], checkpoint:"cargo test — one model, two formats, format-specific errors", code:"trait Encode {\n  fn encode<S: Serializer>(&self, s: S)\n    -> Result<S::Ok, S::Error>;\n}" },
  { n:6, title:"Create a service and middleware", build:"Wrap any operation with logging and timeouts", time:"50 min", concepts:"Service · associated futures · composition", steps:["Model an operation as fn(Request) -> Future<Result<Response, Error>>.","Move response, error, and future into associated types on Service.","Create a Logging<S> wrapper that delegates while preserving types.","Add a Layer trait so configuration and per-service state are separate."], checkpoint:"cargo test — wrapper is transparent and layers compose in order", code:"trait Service<Req> {\n  type Response; type Error; type Future;\n  fn call(&mut self, req: Req) -> Self::Future;\n}" },
  { n:7, title:"Retry a consumed operation", build:"Add retry without requiring every request to be Clone", time:"55 min", concepts:"ownership · FnMut · async policy", steps:["Watch a naive retry fail because the first call consumes its input.","Try Req: Clone and document which streaming requests it excludes.","Switch to an attempt factory: FnMut() -> Future, recreating each input.","Extract a policy that inspects both responses and errors and returns a delay future."], checkpoint:"cargo test — eventual success, exhausted attempts, non-cloneable inputs", code:"async fn retry<F, Fut, T, E>(mut attempt: F)\nwhere F: FnMut() -> Fut,\n      Fut: Future<Output = Result<T, E>>" },
  { n:8, title:"Design for version two", build:"Publish a small client API, then evolve it without breakage", time:"40 min", concepts:"privacy · non_exhaustive · sealed traits", steps:["Expose a Config with public fields, then attempt to add a required field.","Make fields private and move construction behind Config::builder.","Compare an exhaustive public error enum with classification methods.","Seal an extension trait; add one capability and verify old caller code."], checkpoint:"two example consumers compile against both API versions", code:"pub struct Error { inner: Box<Inner> }\nimpl Error {\n  pub fn is_timeout(&self) -> bool { … }\n}" },
];

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const [open, setOpen] = useState(false);
  return <article className={`workshop ${open ? "open" : ""}`}>
    <button onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="workshop-n">LAB {String(workshop.n).padStart(2,"0")}</span><span><b>{workshop.title}</b><i>{workshop.build}</i></span><span className="workshop-time">{workshop.time}</span><span className="expand">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="workshop-body"><div><h4>Build it in four passes</h4><ol>{workshop.steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol></div><aside><span>{workshop.concepts}</span><pre><code>{workshop.code}</code></pre><p><b>Checkpoint</b>{workshop.checkpoint}</p></aside></div>}
  </article>;
}

function StudyCard({ study }: { study: Study }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`study-card ${open ? "open" : ""}`}>
      <button className="card-main" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="study-number">{String(study.n).padStart(2, "0")}</span>
        <span className="card-copy">
          <span className="card-meta"><span>{study.level}</span><span>{study.topic}</span></span>
          <strong>{study.name}</strong>
          <code>{study.crate}</code>
          <span className="lesson">{study.lesson}</span>
        </span>
        <span className="expand" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="card-detail">
        <pre><code>{study.signature}</code></pre>
        <p>{study.why}</p>
        <div className="read-row"><span><b>Read next</b>{study.read}</span><a href={study.repo} target="_blank" rel="noreferrer">Open source ↗</a></div>
      </div>}
    </article>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => studies.filter((s) => {
    const topicMatch = topic === "All" || s.topic === topic;
    const q = query.trim().toLowerCase();
    return topicMatch && (!q || `${s.name} ${s.crate} ${s.lesson} ${s.topic}`.toLowerCase().includes(q));
  }), [topic, query]);

  return <>
    <header className="topbar">
      <a href="#top" className="wordmark"><span>R</span> Rust API Field Guide</a>
      <nav><a href="#path">Guidebook</a><a href="#catalog">Case studies</a><a href="#method">Reading method</a><a href="#workshops">Build labs</a></nav>
      <a className="github" href="https://github.com/rust-lang/api-guidelines" target="_blank" rel="noreferrer">API Guidelines ↗</a>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-kicker">A CURATED SOURCE READER · 24 CASE STUDIES</div>
        <h1>Learn Rust API design<br/><em>from the APIs that got it right.</em></h1>
        <p className="hero-intro">A guided reading course through the standard library and exemplary open-source crates. Study one design decision at a time—from ownership and errors to async traits and API evolution.</p>
        <div className="hero-actions"><a className="primary" href="#path">Start the guidebook <span>↓</span></a><a className="secondary" href="#catalog">Browse all 24 studies</a></div>
        <div className="code-window" aria-label="A Rust API signature">
          <div className="window-bar"><span></span><span></span><span></span><b>the shape of a good API</b></div>
          <pre><code><i>pub trait</i> Iterator {'{'}
  <i>type</i> Item;

  <i>fn</i> next(&amp;<i>mut</i> self) -&gt; Option&lt;Self::Item&gt;;
{'}'}</code></pre>
          <div className="annotation"><b>Small required surface.</b> A single method supports an ecosystem of lazy, composable adapters.</div>
        </div>
      </section>

      <section className="manifesto">
        <p>Good APIs feel <em>inevitable.</em></p>
        <div>They make the common path obvious, mistakes difficult, and future change possible. Rust gives library authors unusually expressive tools; these studies show when—and when not—to use them.</div>
      </section>

      <section id="path" className="section path-section">
        <div className="section-label">01 / THE STUDY PATH</div>
        <div className="section-heading"><h2>Build judgment in layers.</h2><p>Follow the sequence once. Each phase introduces vocabulary used by the next.</p></div>
        <div className="phases">
          <a href="#catalog" onClick={() => setTopic("All")}><span>PHASE 1 · STUDIES 01–08</span><b>Foundations</b><p>Values, ownership, errors, conversion, and the smallest useful traits.</p><i>Begin here →</i></a>
          <a href="#catalog" onClick={() => setTopic("All")}><span>PHASE 2 · STUDIES 09–18</span><b>Ergonomic libraries</b><p>Builders, serialization, macros, async I/O, and framework boundaries.</p><i>Then continue →</i></a>
          <a href="#catalog" onClick={() => setTopic("All")}><span>PHASE 3 · STUDIES 19–24</span><b>Infrastructure</b><p>Services, streaming, replayability, typestate, and long-term evolution.</p><i>Finish strong →</i></a>
        </div>
      </section>

      <section id="catalog" className="section catalog">
        <div className="section-label">02 / GUIDEBOOK CHAPTERS</div>
        <div className="section-heading"><h2>Read the surface. Trace the choice.</h2><p>Open a study for the signature, rationale, and exact source to inspect.</p></div>
        <div className="controls">
          <div className="topics" aria-label="Filter case studies by topic">{topics.map((t) => <button key={t} className={topic === t ? "active" : ""} onClick={() => setTopic(t)}>{t}</button>)}</div>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search APIs or ideas…" aria-label="Search case studies"/></label>
        </div>
        <div className="result-count">{visible.length} {visible.length === 1 ? "study" : "studies"}</div>
        <div className="study-grid">{visible.map((s) => <StudyCard study={s} key={s.n}/>)}</div>
        {visible.length === 0 && <div className="empty">No matching studies. Try a broader term or choose “All.”</div>}
      </section>

      <section id="method" className="section method">
        <div className="section-label">03 / HOW TO STUDY AN API</div>
        <div className="method-grid">
          <div><h2>Four passes.<br/>One hour.</h2><p>Do not begin in the implementation. Start where the user starts.</p></div>
          <ol>
            <li><span>10 min</span><b>Use it</b><p>Copy one caller example. Note what the compiler makes you state—and what the API infers.</p></li>
            <li><span>15 min</span><b>Map the surface</b><p>Write down public types, consuming methods, borrowed methods, generic parameters, and errors.</p></li>
            <li><span>20 min</span><b>Trace one path</b><p>Follow a normal call into the implementation. Ignore unrelated machinery.</p></li>
            <li><span>15 min</span><b>Redesign it</b><p>Sketch one alternative. Explain exactly what becomes easier, slower, less safe, or harder to evolve.</p></li>
          </ol>
        </div>
      </section>

      <section className="principles section">
        <div className="section-label">04 / RECURRING PRINCIPLES</div>
        <h2>Patterns worth stealing.</h2>
        <div className="principle-grid">
          <div><b>01</b><h3>Borrow by default</h3><p>Take ownership when the operation stores, transforms, or consumes the value.</p></div>
          <div><b>02</b><h3>Make states visible</h3><p>Use enums and types when a distinction changes what callers may safely do.</p></div>
          <div><b>03</b><h3>Keep traits small</h3><p>Require the irreducible behavior; provide conveniences in defaults or extension traits.</p></div>
          <div><b>04</b><h3>Convert at edges</h3><p>Let the core operate on domain types. Parse, validate, and serialize at boundaries.</p></div>
          <div><b>05</b><h3>Optimize the common path</h3><p>Make ordinary usage short while leaving explicit exits for advanced control.</p></div>
          <div><b>06</b><h3>Preserve room to evolve</h3><p>Private fields, non-exhaustive types, and sealed internals are compatibility tools.</p></div>
        </div>
      </section>

      <section id="workshops" className="section workshops-section">
        <div className="section-label">05 / OPTIONAL BUILD LABS</div>
        <div className="section-heading"><h2>Then build the pattern yourself.</h2><p>After the guidebook, reinforce the ideas with eight minimal tutorials. Each begins with an attractive mistake and ends at a production-grade design.</p></div>
        <div className="lab-intro"><b>How each lab works</b><span>create a tiny crate</span><i>→</i><span>compile every step</span><i>→</i><span>feel the constraint</span><i>→</i><span>compare with real source</span></div>
        <div className="workshop-list">{workshops.map(w => <WorkshopCard workshop={w} key={w.n}/>)}</div>
      </section>
    </main>
    <footer><div className="wordmark"><span>R</span> Rust API Field Guide</div><p>Read source. Notice tradeoffs. Build better libraries.</p><a href="#top">Back to top ↑</a></footer>
  </>;
}
