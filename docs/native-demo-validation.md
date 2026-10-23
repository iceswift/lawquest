# Native Demo Validation

Validated on 2026-10-23 using the local fictional dataset, Android 15 x86_64 Emulator, and Expo Go with SDK 54. This is a manual smoke test, not full device certification.

| Step | Evidence | Result |
| --- | --- | --- |
| Refresh Books | One demo library package appears in the catalog | Passed |
| Download TH and EN | App displays Download complete | Passed |
| Open installed English section | Section 2 contains both fictional paragraphs and outline label | Passed |
| Highlight paragraph | Yellow highlight renders after selecting a color | Passed, paragraph-level interaction |
| Invoke Listen | STOP state appears and Android GoogleTTSServiceImpl logs English synthesis requests | Passed for invocation/state; audio quality not independently assessed |
| Read another installed section in airplane mode | Section 3 renders with airplane-mode indicator visible | Passed for the running app; cold relaunch not covered |

The demo API test also checks HTTP headers, compressed and uncompressed SHA-256/size, paragraph offsets, missing routes, and unsupported methods.

## Recordings

- [Download and reading](images/demo-download-read.mp4): native capture from the first demo installation. The generic translation notice shown in this earlier capture was subsequently replaced by the explicit fictional-data disclaimer.
- [Highlight interaction](images/demo-highlight-tts.mp4): native screen capture of study controls. Recordings are silent; Android screenrecord does not capture the speaker audio here.
- [Highlighted demo section](images/demo-study.png).
- [TTS state](images/demo-speech.png).
- [TTS control recording](images/demo-speech.mp4), silent.
- [Reading in airplane mode](images/demo-offline.png); emulator networking was restored immediately afterward.

## Still To Validate

- Physical iPhone and Android devices, including accessibility and text scaling.
- Character-level selection and cross-paragraph offsets; current captured interaction highlights a paragraph.
- TTS auto-next and stop/resume during rapid navigation and background transitions.
- Audio quality and installed/offline voice availability.
- Cold relaunch with network disabled (in-session airplane-mode reading passed).
- Long sessions and low-memory devices.

Warnings observed in Expo Go include limited media-library access and a Reanimated shared-value warning during rendering. They are not hidden by this validation report.
