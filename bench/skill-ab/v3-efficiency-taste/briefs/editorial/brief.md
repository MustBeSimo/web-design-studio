# Night Lines — editorial scroll story

Build a self-contained editorial feature from the supplied copy and image kit. The subject is Melbourne's tram conductors after dark. Let the visual language come from ticket punches, route diagrams, sodium streetlight and dark wool uniforms; do not imitate Web Design Studio's showcase brand.

The page must have a quiet opening, a pinned three-beat narrative sequence, and a resolved closing. The signature moment should move the supplied route line through the three photographs while the corresponding chapter copy becomes fully readable. Motion should clarify geography and time. On mobile, preserve the story in a compact vertical sequence. Reduced motion must show every photograph and all copy without relying on animation. With JavaScript disabled, the full article must remain readable.

Use every supplied asset. Keep the supplied wording verbatim and do not add facts.

Expose honest machine-readable evidence for this benchmark. Mark the moving route
graphic with `data-route-line`. Keep `document.documentElement.dataset.routeChapter`
set to `1`, `2`, or `3` for the photograph/chapter currently dominant at the four
review depths. The value and the route graphic's actual visual geometry must change
through all three chapters; the attribute is evidence, not a substitute for motion.

## Supplied copy

Night Lines

Three conductors, one last circuit

At 11:42 pm, Route 86 turns east and the city changes register.

Mara checks the brass punch by touch. She has worked the late shift for eleven winters.

At the depot, every ticket is counted before the lights go out.

The final tram reaches Preston at 1:08 am.

Photographs by Inez Park

Words by Rowan Bell

Read the field notes
