# Rust API Field Guide

<p class="chapter-subtitle">Workshop edition: design each public boundary yourself before comparing it with production Rust.</p>

<div class="edition-note"><strong>You are reading the workshop edition.</strong> Use the edition menu in the top-right toolbar to move to the matching page in another edition.</div>

This edition behaves like a patient interviewer. Requirements arrive incrementally. At each stopping point you must write public signatures, identify ownership, and state the failure contract before the discussion continues. Explanations are still present, but they follow prediction and retrieval instead of replacing them.

It covers the full conceptual curriculum and all twelve case studies. The cases appear as a solution gallery after the design rounds so that real APIs test and refine your judgment rather than supply it prematurely.

## Workshop rules

1. Use a scratch file; do not solve only in your head.
2. Write signatures before implementation.
3. State what information each type preserves.
4. Name one rejected alternative and the condition that would make it preferable.
5. Do the common challenge without reopening earlier pages.

Begin with [Signatures tell the story](01-signatures-tell-the-story.md).
