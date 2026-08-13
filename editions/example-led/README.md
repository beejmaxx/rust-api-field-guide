# Rust API Field Guide

<p class="chapter-subtitle">Example-led edition: each chapter begins with a consequential API-design choice in production Rust.</p>

<div class="edition-note"><strong>You are reading the example-led edition.</strong> Use the edition menu in the top-right toolbar to move to the matching page in another edition.</div>

This is a book about designing APIs, not about navigating repositories. Concrete libraries supply evidence: `http` shows how ownership forms an access ladder, rustls shows when invalid construction should be unrepresentable, Tower shows how a tiny protocol creates an ecosystem, and Serde shows how an intermediate model decouples producers from consumers.

Each example answers four design questions:

- Which distinctions does the public type preserve?
- What does the caller own, and what does a method consume?
- Which misuse does the compiler prevent?
- What implementation freedom remains for version two?

The examples are followed by synthesis chapters that turn the observed decisions into a vocabulary you can apply to your own libraries.

Begin with [`http::Request<T>`: separate head from body](case-studies/http-request.md).
