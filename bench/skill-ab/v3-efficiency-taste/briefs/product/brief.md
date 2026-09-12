# Fold One — product reveal

Build a self-contained launch story for a folding reading lamp using the supplied product renders and detail drawing. The visual system should feel precise, domestic and tactile: warm pools of light, graphite hardware and measured typographic spacing. Do not borrow the Web Design Studio showcase palette.

Create an opening product silhouette, a pinned reveal that moves from closed to open to lit, and a concise specification ending. The change in hinge angle must be the signature interaction and should feel continuous rather than like three unrelated cards. On mobile, keep the product legible without cropping its key form. Reduced motion must resolve immediately to a stable sequence. With JavaScript disabled, all three states and all copy must be visible.

Use every supplied asset. Keep the supplied wording verbatim and do not add claims.

Expose honest machine-readable evidence for this benchmark. Mark the continuously
changing product plate with `data-product-stage`. Keep
`document.documentElement.dataset.hingeProgress` updated as a numeric value from
`0` (closed) to `1` (lit/open) across the pinned reveal. Its value and the plate's
actual visual geometry must change together; the attribute is evidence, not a
substitute for the reveal.

## Supplied copy

Fold One

Light where the page turns

Closed, the lamp is 28 millimetres deep.

The arm opens through 118 degrees and holds at any angle.

A warm 2700 K pool reaches both pages without lighting the room.

Anodised aluminium, linen cable, replaceable LED module.

Designed for desks, shelves and bedside tables.

Available in graphite and chalk.

View dimensions
