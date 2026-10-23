# AI Agent Instructions: Thai Legal Codes Translation & Validation Pipeline (legal-v3)

You are tasked with translating 8 authoritative Thai legal codes from their schema-version 3 JSON format into a target language (e.g., English `en`, Simplified Chinese `zh-CN`, Japanese `ja`, Korean `ko`, French `fr`, German `de`, etc.). This is a high-responsibility legal engineering task. You must follow this strict pipeline to ensure 100% structural alignment and high statutory legal language standards.

---

## 1. Directory & File Structure

### Inputs (Authoritative Thai Sources)
Located under: `data/legal-v3/texts/{code-id}/th/th-ocs-{date}.json`

### Outputs (AI Drafts)
Target directory: `data/legal-v3/texts/{code-id}/{target-lang}/`
Target filename format: `{target-lang}-ai-draft-{date}.json`
*(Note: Use standard BCP-47 language tags for `{target-lang}`, e.g., `ja`, `ko`, `fr`, `zh-CN`)*

---

## 2. Technical Infrastructure Requirements

### API Translation & Caching
1. **Library**: Use `deep-translator` (specifically `GoogleTranslator`) in Python:
   - Instantiate with appropriate source and target: `GoogleTranslator(source='th', target=target_lang_code)`
2. **HTTP GET Constraints**:
   - Do not send text chunks larger than **1,200 characters** in a single API call to avoid HTTP GET URL limit errors.
   - Split section texts into paragraph lists (`split('\n\n')`) and pack them into chunks under 1,200 characters before translating.
3. **Local Cache**:
   - Establish `.tmp/{target_lang}_translation_cache.json`.
   - Use a unique cache key: `"{code-id}::sec::{section-id}"` for sections and `"{code-id}::app::{appendix-id}"` for appendices.
   - Implement a **1.0-second polite delay** between chunk API requests to prevent rate limits and IP bans.

### Cache Seeding (Crucial Optimization)
Before running fresh translations, read historical drafts (V2) in the target language to seed the cache:
1. Match V2 section texts to V3 section IDs (use a section ID mapping regex to bridge slight naming changes between V2 and V3, e.g. `quad` -> `quater`).
2. Only seed the cache with V2 sections that are **active in V3**, **not empty**, **not repealed**, and **do not contain draft pending warnings**.
3. During execution, only translate sections not present in the seeded cache. This saves thousands of API calls, preserves previous human corrections, and ensures that the script runs in seconds instead of hours.

---

## 3. Post-Processing Engine Rules

Machine translation alone is insufficient. You must apply target-language post-processing rules to clean up stylistic anomalies. To support a new language, configure the following four components:

### A. Section Header Stripping
Google Translate often prepends the section header (e.g. `Section 1`, `第1条`, `第1条`) to the translated body text. You must dynamically generate case-insensitive header patterns based on `sectionNo` and strip them from the start of the translated text.
- **Pattern Generator Rules**:
  - Latin/Western languages (EN, FR, DE, ES): Match patterns like `Section X`, `Article X`, `Section X bis`, `Article X-1`, `SectionX`.
  - Eastern Asian languages (JA, KO, ZH): Match patterns like `第X条`, `第X之二条`, `第X条之二`, `제X조` (Korean Article X).

### B. Repealed Section Format
For sections where `status == 'repealed'`, write the official target language placeholder for repealed/abolished law:
- **English**: `(Repealed)`
- **Chinese (Simplified)**: `（已废止）`
- **Chinese (Traditional)**: `（已廢止）`
- **Japanese**: `（廃止）`
- **Korean**: `(폐지)`
- **French**: `(Abrogé)`
- **German**: `(Aufgehoben)`

### C. Legal Suffix Mapping
Convert Thai numeral labels in section headings (e.g., `มาตรา ๕ ทวิ` -> Section 5 bis) into the correct legal numbering format of the target language:

| Thai Suffix | English/Western (Latin) | Chinese (Simplified) | Japanese / Chinese (Trad) | Korean |
| :--- | :--- | :--- | :--- | :--- |
| **ทวิ** | `bis` | `之二` | `之二` | `의2` |
| **ตรี** | `ter` | `之三` | `之三` | `의3` |
| **จัตวา** | `quater` | `之四` | `之四` | `의4` |
| **เบญจ** | `quinquies` | `之五` | `之五` | `의5` |
| **ฉ** | `sexies` | `之六` | `之六` | `의6` |
| **สัตต** | `septies` | `之七` | `之七` | `의7` |
| **อัฏฐ / อัฎฐ** | `octies` | `之八` | `之八` | `의8` |
| **นว** | `nonies` | `之九` | `之九` | `의9` |
| **ทศ** | `decies` | `之十` | `之十` | `의10` |

*Implement these replacements using regex check for slash `/` or end of string `$`, e.g. `re.sub(rf'{thai_suffix}(?=/|$)', target_suffix, label)`.*

### D. Legal Terminology Replacements
Define dictionary replacements to normalize common statutory vocabulary in the target language. For example:

- **Western Languages (e.g. English, French, German)**:
  - Translate standard prefixes like `ผู้ใด` to the correct legal pronoun (`Whoever` / `Any person who` in English; `Quiconque` in French; `Wer` in German).
  - Format penalties cleanly (e.g., `shall be punished with imprisonment not exceeding X years or a fine not exceeding Y Baht, or both.`).
- **Eastern Asian Languages (e.g. Japanese, Korean)**:
  - Translate `ผู้ใด` to `何人も` (Japanese) or `누구든지` (Korean).
  - Format punishments to match their standard criminal code conventions (e.g., `X년 이하의 징역 또는 Y바트 이하의 벌금에 처한다` in Korean).

---

## 4. The 17-Point Validation Checklist

Before saving any translated file, the script must execute and pass the following validation rules. If even a single check fails, **stop execution and fail the build**.

1. **Schema Check**: `schemaVersion` must be exactly `3`.
2. **Language Check**: `language` must match the target language BCP-47 tag.
3. **Version ID Check**: Output file versioning must match the target draft version format.
4. **Based On Version Check**: `basedOnVersionId` must match the input Thai file's `versionId`.
5. **Section Count Check**: The number of sections must exactly match the Thai source.
6. **Appendix Count Check**: The number of appendices must exactly match the Thai source.
7. **Section ID Match**: `sectionId` at each index must match the Thai source.
8. **Section No Match**: `sectionNo` at each index must match the Thai source.
9. **Heading Footnote Alignment**: `headingFootnoteRefs` arrays must be identical to the Thai source.
10. **Body Footnote Alignment**: `bodyFootnoteRefs` arrays must be identical to the Thai source.
11. **Appendix ID Match**: `appendixId` at each index must match the Thai source.
12. **Appendix Footnote Alignment**: Appendix footnote references must align with the Thai source.
13. **Header Duplication Check**: Text must not start with the section header (e.g., `Section X` or `第X条`).
14. **Heading Footnote Start Check**: Text must not start with a heading footnote marker (e.g., `[12]`).
15. **Empty Text Check**: No section text or appendix text can be empty/whitespace.
16. **Translation Status Check**: `translationStatus` must be set to `draft`, and `reviewStatus` to `needs_legal_review`.
17. **Repealed Format Check**: Active sections must not contain repealed placeholders, and repealed sections must be mapped exactly to the designated target-language repealed placeholder (e.g. `(Repealed)` or `（已废止）`).

---

## 5. Generic Execution Workflow Prompt Template

Use the following prompt format when delegating this task to a subagent or future AI assistant:

```markdown
Translate the 8 Thai legal codes (V3 Schema JSON) into [Target Language Code, e.g., ja / ko / fr] under the workspace directory.

Instructions:
1. Review the input Thai sources located under data/legal-v3/texts/**/th/th-ocs-*.json.
2. Establish a cache-seeded pipeline by extracting valid translations from the historical V2 files in the target language (if available under data/legal-v2/texts/**/[lang]/...).
3. Write a Python automation runner that applies deep-translator with chunking (<=1,200 chars) and polite API delays (1.0s).
4. Integrate the Post-Processing Engine with rules for [Target Language] legal terminology, prefix header stripping, and suffix labeling (e.g., bis/ter or 의2/의3).
5. Run the 17-point validation engine on all generated files. Do not save output drafts unless they pass validation checks with 0 errors.
6. Provide a tabular summary showing the code ID, section count, target path, and validation results.
```
