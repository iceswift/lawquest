# Development Case Study

## Product Problem

LawQuest explores how section-based reading can make Thai law easier to navigate and study. Instead of treating a code as one long document, it gives each section a workspace linked to its outline, language version, notes, highlights, and saved state.

## Decisions

| Decision | Reason and tradeoff |
| --- | --- |
| Separate content from app releases | Downloadable packages permit content updates without shipping every legal code inside the app; catalog/cache consistency becomes important. |
| JSON with reader sidecars | The project moved away from its SQLite legal-reader experiment after instability. JSON simplifies the current pipeline, while memory management still requires care. |
| Native OS TTS | Enables device speech without a cloud speech service; voice availability and pause/selection behavior vary by platform. |
| Local study before login | Users can read and annotate before signing in; later sync needs identity migration and conflict handling. |
| Independent content languages | Thai source and unofficial translations share section identity; labels, suffixes, and heading translations require validation. |

## Author and Process

The project is maintained by [iceswift](https://github.com/iceswift). Product requirements, visual direction, and development priorities are iterated with AI-assisted engineering and translation tools. The repository presents implementation evidence and limitations rather than claiming every generated component was written without assistance.

## Evidence and Limitations

CI checks TypeScript and existing migration/reader tests. Screenshots document the running native UI. There are no published user adoption metrics, performance benchmarks, or legal-review certification. Offline behavior, native selection, TTS sequencing, and repeated navigation should be evaluated on devices before production release.
