# Format and capacity contract

These are implemented subsets, not declarations of full compatibility with the native products.

| Area | Supported | Explicit boundary |
|---|---|---|
| Drawing | LINE/CIRCLE/TEXT DXF import; rectangles decomposed to lines on export; true color and layers; SVG/PNG | No DWG, spline/NURBS solver, parametric constraints, full hatch/block/layout support; displayed dimensions export as lines |
| 3D | Triangle geometry, primitive composition, positive/negative OBJ face indices, triangulated polygon faces, transformed OBJ/ASCII STL | No animation rigs, materials/textures, NURBS, CSG/solid Boolean kernel or full mesh repair; OBJ polygon fan triangulation is not a general concave-face tessellator |
| Music | PCM16 stereo RIFF/WAVE; SMF note/tempo MIDI; deterministic synthesized voices | No plug-ins, arbitrary MIDI import, stems, microphone multitrack capture or proprietary DAW project files |
| Video | Browser-decodable local/bundled video, sequential cuts/trim/rate/volume/looks/captions/fades; MediaRecorder output | Real-time export; no multiple video tracks, DRM input, arbitrary codec guarantee or frame-exact offline encoder |
| DOCX | Paragraphs, heading/list/text structures, common inline emphasis; sanitized text import | Tables/layout/images/comments/revisions are not arbitrary-document lossless; unsupported styling is simplified |
| XLSX | One worksheet, cell strings/numbers/formulas and basic formats, cached values | No macros, pivot tables, multi-sheet reference graph, external workbook data or complete Excel function semantics |
| PPTX | Editable slide titles/body and basic colors | Visual designs/artwork/notes are better preserved by project JSON or HTML; arbitrary Office masters/layouts/media are not reconstructed |
| Painting | PNG flattened export, bitmap layer project JSON, common browser image import | No PSD or vector brush engine; imported images are size-bounded and may be re-encoded |
| ZIP | CRC32, central directory, bounded STORE/DEFLATE reads; deterministic STORE writes | No encryption, ZIP64 or unbounded extraction |

Formula operators: `+ - * / ^ % & = <> < > <= >=`, parentheses, ranges and `$` references. Functions: SUM, AVERAGE/AVG, MIN, MAX, COUNT, COUNTA, ABS, SQRT, ROUND, POWER, MOD, LEN, UPPER, LOWER, CONCAT/CONCATENATE, AND, OR, NOT, lazy IF and IFERROR. Errors are displayed as cell codes including parse/name/reference/value/division/cycle/limit failures. This is a documented expression language, not a claim of identical Excel coercion and precedence in every case.

Principal limits: 2,000 drawing entities; 100 scene objects; 20,000 vertices / 40,000 triangles per imported mesh and aggregate bounds during session validation; 128 profile points; 16 audio tracks; 16 or 32 steps; 130-second offline audio output; 180-second real-time video export; 200 × 52 cells; 100 slides; 12 painting layers up to 1,600 × 1,600; 24 MB per cabinet file; 32 MB session/backup input; 400 recorded scenario events. Some operations apply tighter limits to protect interactivity. Error messages expose the relevant bound.

Office output is tested with independent Python ZIP CRC/XML parsing and with the application importers. Those tests do not constitute an exhaustive Microsoft Office interoperability certification. JSON project files are the intended fidelity-preserving editable format for these apps.
