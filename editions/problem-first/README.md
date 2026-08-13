# Rust API Field Guide

<p class="chapter-subtitle">Problem-first edition: begin with the obvious interface, then learn by discovering exactly where it breaks.</p>

<div class="edition-note"><strong>You are reading the problem-first edition.</strong> Use the edition menu in the top-right toolbar to move to the matching page in another edition.</div>

Most Rust material teaches a mechanism and later searches for a use. This edition reverses that sequence. It begins with a reasonable API under a narrow requirement. A new constraint then exposes a lost distinction, an ownership conflict, or an invalid state. Only after you predict a repair does the chapter name the Rust mechanism and show its production counterpart.

The book is complete: it covers the whole conceptual curriculum and all twelve production case studies. Its order is designed around increasing pressure rather than language feature categories.

## The reading loop

For every chapter:

1. Write the smallest API that satisfies the initial requirement.
2. Predict which new requirement will break it.
3. Make the lost information or missing capability explicit.
4. Compare your repair with the production API.
5. Name a context in which the earlier, simpler design still wins.

Begin with [Signatures tell the story](01-signatures-tell-the-story.md), then follow the arrows at the sides of the page.
