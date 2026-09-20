# A continuous display, not two adjacent phone applications

## Verified reference, as of 20 September 2026

Apple describes iPhone Duo's inner display as a **single 7.6-inch folding OLED**, 1878 × 2670 pixels. Its 5.4-inch outer display is 1398 × 2034 pixels. The open enclosure is 164.6 × 117.8 × 5.2 mm; folded it is 84.1 × 117.8 × 11.3 mm. These facts inform the reference proportions, rather than defining browser CSS points. [Apple specifications](https://www.apple.com/iphone-duo/specs/)

The product was announced on 9 September 2026, with preorders on 16 October and availability on 23 October. Apple's system description moves controls and the dock to the side, uses a vertical side Dynamic Island, and supports Split View, continuity and app pairs. This prototype is based on that published description, not on physical-device testing or an extracted operating-system image. [Apple announcement](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)

## Design conclusion

The useful abstraction is **one task with simultaneous context**, not “two copies of the phone UI.” Keeping a source next to its consequence reduces repeated navigation: results beside a reader, a conversation beside its artifact, or a film beside a notebook.

A central crease is a visual condition, not a mandatory blank strip. The prototype's unfolded display is one canvas with a subtle crease overlay. App layouts allocate space according to the task. A distinct app-pair divider appears only when two apps are explicitly paired.

The outer display is not simply half the inner display's width. Its aspect ratio is different. Studio mode uses logical rectangles of 1068 × 751 for the landscape inner display and 466 × 678 for the outer display; each approximates the corresponding pixel ratio. These are **design coordinates**, not claims about native logical resolution, safe-area measurements or UIKit scaling. The announcement describes the display proportions as the same; its published pixel counts are not exactly identical in ratio. The prototype follows the numerical specifications rather than treating that wording as an exact mathematical equivalence.

## Four layout postures

| Posture | Design response | Continuity invariant |
| --- | --- | --- |
| Unfolded | Complementary panes side by side; both can scroll | Same app model and mounted root |
| Book | Side-by-side reading/composition with a more visible crease | Selection, draft and editor stay alive |
| Tabletop | Main content above context or tools; useful for film + notes | Media element is not recreated merely to fold |
| Folded | Compact navigation switches between task panes | Both pane trees remain available without data loss |

The angle slider selects a layout/visual condition. It does not simulate actual hinge mechanics, physical occlusion, touch delivery from two display controllers or a browser device-posture sensor. Book and Tabletop are design proposals in this project.

**Direct touch** is a separate accessibility/usability mode: it fits the real browser viewport instead of shrinking a simulated device. On a narrow viewport, pane tabs stay reachable regardless of the last physical-studio posture. On a wider viewport the design expands again. It is deliberately not a pixel-scale hardware simulator in that mode.

## App-specific use of the expanded canvas

**Creation.** ChatGPT keeps instructions next to editable output; Gemini keeps the brief next to an editable visual board. The point is not a larger chat transcript but an inspectable, editable result. Local template engines make these interactions reproducible offline without suggesting a model is actually running.

**Reading.** Google retains the search context beside a selected source. Threads retains the feed beside the selected discussion. WhatsApp and Gmail retain the conversation/mailbox overview while the user writes. A back-navigation action is no longer necessary just to change the current item.

**Media.** TikTok reserves context space for comments and saved selections instead of covering the film with an overlay. YouTube provides a chapter/queue/notebook companion pane. Tabletop turns these into watch-above, act-below arrangements. Bundled video makes seeking, captions, sound and continuity testable rather than decorative.

**Spatial work.** Maps keeps route decisions beside the spatial result. Dijkstra routing follows the fictional street graph and permitted bridge crossings. The route is structured data that can be shared into a conversation, rather than an unrelated screenshot.

**Photography.** Instagram separates discovery from inspection and composition. Imported photos, captions and selected filters remain local, creating a real create–inspect–publish loop in the study.

## Multitasking is a second level, not the app layout itself

Each app has its own adaptive two-pane task. Split View then combines two apps into a workspace. As each allocation narrows, the app's container query chooses its compact navigation instead of forcing four illegibly narrow columns onto the screen.

The shell preserves one mounted instance per app. A parked instance can return without losing transient DOM state. This intentionally prevents multiple independent windows of the same app; implementing those would require instance-keyed models, per-window commands and explicit conflict resolution.

Sharing is typed enough to be meaningful: a route can become a chat attachment, a board can become a mail draft, and a text/code artifact can become context for another local workflow. The receiving application never silently sends the imported content to an external service.

## Performance and interaction priorities

The wallpaper is a bounded, decorative GPU workload; the interactive applications remain semantic HTML. GPU loss cannot remove the inbox, text editor or navigation controls. The renderer caps internal resolution and update frequency, respects reduced motion, and stops continuous animation while its wallpaper is behind an app.

Useful adaptation should preserve state first and visual polish second. A posture change must not erase a draft, restart a film or remount an editor. The browser tests directly compare retained DOM identities and selection state while cycling layouts. Real hardware, assistive technology and browser-specific behavior still require separate device testing.
