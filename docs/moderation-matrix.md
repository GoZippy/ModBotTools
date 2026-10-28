# Moderation matrix v0.1

This matrix replaces the Gemini draft's immediate ban/kick/mute rules with human-reviewed actions. Values are provisional and must be calibrated on consented Kiro Discord examples before enabling `hold`.

| Signal | Type | Question or rule | Current action |
| --- | --- | --- | --- |
| Spam | Noul or narrow local patterns | Unsolicited repeat promotion, bulk links, or mention spam | ≥0.70 flag; ≥0.98 contributes to hold in `hold` mode |
| Scam | Noul or narrow local patterns | Phishing, fake giveaway, credential or wallet theft | ≥0.70 flag; ≥0.98 contributes to hold in `hold` mode |
| Targeted abuse | Noul or narrow local patterns | Harassment, threats, or hate targeting people | ≥0.70 flag; never auto hold in v0.1 |
| Private information | Noul plus local patterns | Another person's nonpublic contact or identifying information | ≥0.70 flag; never auto hold in v0.1 |
| Severity | Score 0–3 | Overall moderation concern | ≥2 with ≥0.80 Score confidence flags |
| Topic | Choice | Technical, community, other | Logged in result only; no enforcement |

`hold` requires **both** spam and scam ≥0.98, text-only content of 1–1800 characters, and no abuse/privacy flag. The local rules emit binary hits under this common interface; their values are not calibrated probabilities. The ordinary-message hold deletes a post after publication. `/submit` always queues before publication, irrespective of classifier result. No automatic account sanctions are implemented.

## Voice surfaces

| Surface | Input | Status | Action |
| --- | --- | --- | --- |
| Text chat in voice | Discord message content | Implemented | Same text matrix |
| Voice audio | Audio packets plus speaker and consent state | Research only | None |
| Speech transcript | STT text with timestamps and error estimates | Contract reserved as `voice_transcript` | None |

The Gemini `voice_disruption`, `threat_level`, and `evasion_detected` rows are research candidates, not executable policy. Noise/music detection needs audio features; a transcript alone cannot reliably classify it. Threat and evasion judgments need context and appeal. No automatic voice move, deafen, disconnect, or timeout belongs in this scaffold.
