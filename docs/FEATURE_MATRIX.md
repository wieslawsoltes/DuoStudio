# Feature matrix and honest service boundaries

The modules implement complete local interaction loops for the prototype's selected scenarios. They are not ports of the official applications' source or binaries and do not provide all commercial features.

| Application | Real implemented behavior | Deliberate boundary |
| --- | --- | --- |
| ChatGPT | Editable artifact, template prompts, user text context, source/preview, copy, exports, sharing, undo | No OpenAI API, account, LLM inference, speech service, image generation or browsing |
| Threads | Selected feed item, search, local posts and replies, follow, like, repost, saved items | No Meta account, publication to a real feed, federation or recommendation service |
| Google | Token-weighted search across eight original articles, selected reader, bookmarks, source comparison | No Internet search, live index, Google account or external site fetching |
| TikTok | Three playable 16-second films, seek, mute, next/previous/swipe, save, follow, local comments | No TikTok service, remote uploads, recommendation model or real engagement counts |
| WhatsApp | Local conversation search, drafts, new contacts, messages, image/text attachments, artifact receipt, local camera/mic test | No real contacts, phone verification, encryption protocol, remote message delivery, VoIP signaling or calls |
| Instagram | Original stories/gallery, imported image decoding, CSS filter preview, publish locally, comments/likes/saves/follows | No Instagram login, real posting, remote stories/reels, messaging or recommendation service |
| YouTube | Bundled playback, chapters, captions, queue, notes, timestamps, local video file import, local comments and exports | No YouTube account, public videos, remote streaming service, uploads or recommendations; imported video is session-only |
| Google Maps | SVG city, selected places, pan/zoom, graph routing, multiple stops, reorder/remove, modes, route animation and export | Fictional city only; no Google tiles, GPS, geocoding, real traffic, transit, business data or navigation |
| Gmail | Folder/search workflow, draft editing, reply/forward, attachments, local Sent, archive/trash/undo, plain-text EML export | No Gmail OAuth, SMTP, IMAP, delivery, account sync, spam filtering or attachment MIME reproduction in EML |
| Gemini | Local brief templates, visual storyboard, editing/reordering, original images, palette copy, Markdown/JSON exports | No Gemini API or model, image generation service, account or cloud documents |

## System study

Implemented: launcher, app search, side dock, ten app icons plus Camera/Settings, Today-style demo widgets, app switcher, distinct app pairs, resizable divider, pane adaptation, manually selected postures, rotation, theme, four wallpapers, brightness overlay, reduced motion, focus visualization, clipboard shelf, sharing, session import/export/reset, visual lock/StandBy, local device previews.

Not implemented: iOS kernel, native application execution, App Store, real notification delivery, push services, cellular/Wi-Fi control, operating-system authentication, biometric enrollment, payments, native accessibility implementation, background service infrastructure, actual fold sensors, physical hinge emulation, same-app multiwindow or exact reproduction of Apple's proprietary UI assets.

The 5G indicator, battery percentage, sample weather/calendar and social counters are visual sample data. The brightness setting adjusts a screen overlay, not hardware luminance. Focus changes demo visibility, not operating-system notification settings. The visual lock has no security semantics.

## Data export details

A session includes app data, preferences, local imported images, pairs and clipboard context. It does not include account credentials because none are requested. It does not include temporary imported video bytes. Bundled media is already contained in the HTML.

Canvas exports are text/Markdown or HTML as appropriate. Gmail's EML export is a plain-text message representation. Route exports are explicitly fictional graph-route data, not GPX for real-world navigation. Moodboards export their local structure or Markdown descriptions, not proprietary cloud formats.

## Production extensions require explicit new boundaries

Connecting actual services would require authorized APIs, authentication/token handling, server-side secrets where relevant, permission and privacy design, provider terms review, rate limiting and error handling. Those connections should remain separate adapters rather than disguising local template responses as live service results.
