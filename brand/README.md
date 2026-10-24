# Soma icon set: neon S family

Extracted component tiles from the approved icon sheet
(`soma-set/`, one file per tile), plus the generator that tiles them into
`public/` (`scripts/generate-icons.sh`).

| File | What | Used for |
|---|---|---|
| `s-128.png` | Primary S, full detail (331px master) | `icon-soma.png`, `icon-192/512`, apple-touch, maskable, og-image |
| `s-64.png` | Simplified S | `favicon-48x48.png` |
| `s-32.png` | Simplified S | `favicon-32x32.png` |
| `s-16.png` | Simplified S blob | `favicon-16x16.png` |
| `android-circle.png` | Circular S variant | Reference for Android launchers |
| `soma-labs.png` | Flask-check S variant | Reserved for the Soma Labs repo |
| `son-voice.png` | Waveform S variant | Reserved for the Son repo |
| `cyber-spine.png` | Circuit S variant | Alternate / docs use |

Regenerate after touching a master: `bash scripts/generate-icons.sh`.
Small favicons come from the simplified tiles, never from downscaling the
master. Provenance: sheet was a watermarked preview; these extractions are
placeholders until final art ships. Do not publish the sheet itself.
