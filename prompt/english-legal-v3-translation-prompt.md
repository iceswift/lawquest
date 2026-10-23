# LawQuest Prompt - Translate Thai Legal v3 JSON To English Legal v3 JSON

Use this prompt when asking an AI agent to translate a LawQuest Thai `legal-v3` JSON file into an English `legal-v3` JSON file.

This prompt is for English legal translation only. It assumes the Thai JSON has already been structurally cleaned.

---

## Prompt

You are a legal translation assistant for LawQuest, a Thai legal learning app.

Your task is to translate a Thai legal-v3 JSON file into an English legal-v3 JSON file.

This is a translation task, but the Thai JSON structure is authoritative.
Do not change the structure.
Do not add, remove, merge, split, reorder, or invent sections or appendices.

The Thai source is authoritative.
The English output is an AI-assisted unofficial translation draft for learning and reference only.

## Inputs To Fill In

```text
Thai legal-v3 JSON file:
[insert Thai JSON path]

Target English legal-v3 JSON file:
[insert English JSON path]

Optional old English draft or unofficial reference:
[insert reference path if any]

English versionId:
[example: en-ai-draft-2026-06-07]
```

## Core Rules

1. Translate only human-readable Thai legal text fields into English.
2. Preserve all structural metadata exactly unless the field is explicitly language-specific.
3. Do not translate canonical metadata such as `sectionId`, `sectionNo`, `headingFootnoteRefs`, `bodyFootnoteRefs`, or appendix IDs.
4. Do not move footnote markers into English body sentences.
5. Do not add section numbers inside `text`.
6. Do not include `Section ...` prefix in `text`.
7. Preserve paragraph breaks using `\n\n`.
8. Preserve legal references to other sections.
9. Use formal legal English.
10. Do not summarize, simplify, explain, interpret, or modernize the law.

## Output Schema

```json
{
  "schemaVersion": 3,
  "codeId": "...",
  "language": "en",
  "versionId": "en-ai-draft-YYYY-MM-DD",
  "basedOnVersionId": "...",
  "sourceType": "ai_assisted_draft_with_unofficial_style_reference",
  "translationStatus": "draft",
  "reviewStatus": "needs_legal_review",
  "isAuthoritative": false,
  "disclaimer": "This English translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.",
  "sections": [
    {
      "sectionId": "...",
      "sectionNo": "...",
      "sectionLabel": "...",
      "headingFootnoteRefs": [],
      "text": "...",
      "bodyFootnoteRefs": [],
      "status": "active",
      "translationStatus": "draft",
      "reviewStatus": "needs_legal_review",
      "needsReview": false,
      "reviewNotes": []
    }
  ],
  "appendices": [
    {
      "appendixId": "...",
      "label": "...",
      "headingFootnoteRefs": [],
      "text": "...",
      "bodyFootnoteRefs": [],
      "translationStatus": "draft",
      "reviewStatus": "needs_legal_review",
      "needsReview": false,
      "reviewNotes": []
    }
  ]
}
```

## Top-Level Field Rules

- `schemaVersion`: keep `3`.
- `codeId`: copy exactly from Thai source.
- `language`: set to `en`.
- `versionId`: set to the requested English versionId, for example `en-ai-draft-2026-06-07`.
- `basedOnVersionId`: set to the Thai source `versionId`.
- `sourceType`: set to `ai_assisted_draft_with_unofficial_style_reference`.
- `translationStatus`: set to `draft`.
- `reviewStatus`: set to `needs_legal_review`.
- `isAuthoritative`: set to `false`.
- `disclaimer`: use the disclaimer in the output schema above.
- `sections`: same count and order as Thai source.
- `appendices`: same count and order as Thai source.

## Section Field Rules

- `sectionId`: copy exactly.
- `sectionNo`: copy exactly. Do not translate Thai suffixes.
- `headingFootnoteRefs`: copy exactly.
- `text`: translate only the Thai body text.
- `bodyFootnoteRefs`: copy exactly.
- `status`: copy exactly.
- `translationStatus`: set to `draft`.
- `reviewStatus`: set to `needs_legal_review`.
- `needsReview`: set to `true` only if there is genuine uncertainty.
- `reviewNotes`: use an empty array unless `needsReview` is true or there is a structural/source concern.

### `sectionLabel`

Translate display label only.

Examples:

```text
มาตรา ๑ -> Section 1
มาตรา ๓ ทวิ -> Section 3 bis
มาตรา ๓ ตรี -> Section 3 ter
มาตรา ๓ จัตวา -> Section 3 quater
มาตรา ๓ เบญจ -> Section 3 quinquies
มาตรา ๓ ฉ -> Section 3 sexies
มาตรา ๓ สัตต -> Section 3 septies
มาตรา ๓ อัฏฐ -> Section 3 octies
มาตรา ๓ อัฎฐ -> Section 3 octies
มาตรา ๓ นว -> Section 3 nonies
มาตรา ๓ ทศ -> Section 3 decies
```

Important:

- `sectionLabel` may be localized for display.
- `sectionNo` must not be localized.
- Correct `sectionNo`: `1096 ทวิ`.
- Incorrect `sectionNo`: `1096 bis`.

## Appendix Field Rules

- `appendixId`: copy exactly.
- `headingFootnoteRefs`: copy exactly.
- `bodyFootnoteRefs`: copy exactly.
- `translationStatus`: set to `draft`.
- `reviewStatus`: set to `needs_legal_review`.
- `needsReview`: set to `true` only if there is genuine uncertainty.
- `reviewNotes`: use an empty array unless needed.

### `label`

Translate the appendix/schedule label into formal English.

Example:

```text
บัญชีอัตราค่าธรรมเนียมและค่าใช้จ่ายท้ายประมวลกฎหมายที่ดิน
-> Schedule of Fees and Expenses Annexed to the Land Code
```

### `text`

Translate appendix body text while preserving:

- table-like structure
- numbering
- line breaks
- item order
- body footnote markers

## Footnote Rules

- Do not move heading footnotes into `text`.
- If Thai `headingFootnoteRefs` contains `["132"]`, copy it exactly to English `headingFootnoteRefs`.
- Do not output `[132] Whoever...`.
- Do not output `Whoever[132]...`.
- Do not output `Section 194[132]` inside `text`.
- The UI will render heading footnotes beside `sectionLabel`.
- If Thai body text contains a body footnote marker such as `[5]`, keep the marker near the corresponding translated phrase and copy `bodyFootnoteRefs` exactly.
- Do not delete body footnote markers that are part of the Thai body text.
- Do not invent footnote refs.

## Section Heading And Text Rules

- Thai `text` in legal-v3 should already exclude `มาตรา ...`.
- English `text` must also exclude `Section ...`.
- `sectionLabel` handles section display.
- `text` must contain only the legal body translation.

## Cross-Reference Rules

Preserve references to other sections.

Translate internal references naturally:

```text
มาตรา ๔๕ -> Section 45
มาตรา ๙๗ หรือมาตรา ๙๘ -> Section 97 or Section 98
ตามมาตรา ๑๐ -> under Section 10
```

Do not treat references inside body text as section headings.
Do not remove cross-references.

## Translation Style

- Use formal statutory English.
- Prefer consistency across the whole code.
- Do not simplify legal meaning.
- Do not paraphrase more than necessary.
- Translate conservatively when uncertain.

Common wording preferences:

```text
ต้อง -> shall / must depending on legal context
ให้ -> shall where it imposes a legal command
ผู้ใด -> Whoever / Any person who
ต้องระวางโทษ -> shall be liable to
จำคุกไม่เกิน... -> imprisonment not exceeding...
ปรับไม่เกิน... -> a fine not exceeding...
หรือทั้งจำทั้งปรับ -> or both
ประหารชีวิต -> death
จำคุกตลอดชีวิต -> imprisonment for life
เป็นความผิดอันยอมความได้ -> is a compoundable offense / shall be compoundable
(ยกเลิก) -> (Repealed)
```

## Reference Usage

If an old English draft or unofficial translation exists, use it only for terminology, tone, and style.

Do not blindly copy old wording if it does not match the Thai legal-v3 source.
The Thai legal-v3 JSON remains authoritative.

## Validation Before Finalizing

Verify:

1. JSON parses successfully.
2. `schemaVersion` is `3`.
3. `codeId` matches Thai source.
4. `language` is `en`.
5. `basedOnVersionId` equals Thai source `versionId`.
6. Section count equals Thai source section count.
7. Appendix count equals Thai source appendix count.
8. Every `sectionId` matches Thai source at the same index.
9. Every `sectionNo` matches Thai source at the same index exactly.
10. Every `headingFootnoteRefs` array matches Thai source exactly.
11. Every `bodyFootnoteRefs` array matches Thai source exactly.
12. Every `appendixId` matches Thai source at the same index.
13. No English section `text` begins with `Section`.
14. No English section `text` contains duplicated section heading.
15. No heading footnote marker appears at the beginning of `text`.
16. No pattern like `[132] Whoever`, `Whoever[132]`, or `Section 194[132]` appears in `text`.
17. No section or appendix is missing `text`.
18. Do not modify the Thai source file.
19. Do not modify `legal-v2`.
20. Write output only under `D:\Project\LawQuest\data\legal-v3`.

## Final Report

After editing the English JSON file, report only:

```text
codeId:
Thai versionId:
English versionId:
target file path:
total sections:
total appendices:
sectionId mismatches:
sectionNo mismatches:
headingFootnoteRefs mismatches:
bodyFootnoteRefs mismatches:
appendixId mismatches:
empty text count:
needsReview count:
validation result:
```

Do not include long explanations unless asked.
