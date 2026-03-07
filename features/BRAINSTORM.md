# Feature Brainstorm: Echo Insights

## One-Line Pitch

At classification time, the AI also returns a one-line personal insight by scanning your recent notes, turning every captured thought into a mirror that reflects your patterns.

---

## Why This, Why Now

NotesBrain already sends every text/voice note through an OpenAI classification call. That call currently returns just `{category, confidence}` — two fields. The LLM is already reading your note and thinking about it, then throwing away 99% of its understanding. Meanwhile, the daily summary only looks backward at 8am. Between summaries, notes are inert atoms with no intelligence attached.

Competitors like Mem auto-link notes and Reflect builds knowledge graphs, but none provide *real-time personal commentary* at the moment of capture. This is NotesBrain's opportunity to feel alive.

---

## What It Changes

**Before:** You capture "should learn Rust for the backend rewrite." It gets classified as "projects." That's it until tomorrow's summary.

**After:** Same note gets classified, but also gets an insight: "You've mentioned backend rewrite 3 times this week — sounds like it's moved from idea to decision." This appears as a subtle line below your note in the feed.

---

## How It Works

- Expand the classification prompt to also return an `insight` field. Pass the last 15-20 notes (same user) as context alongside the new note, so the LLM can detect patterns, repetitions, and connections.
- Add an `ai_insight` nullable text column to the `notes` table. Written at classification time alongside category/confidence.
- Display the insight as a subtle, muted-text line below the note content in NoteCard (web) and MobileNoteCard (mobile). Only shown when non-null.
- The insight prompt is constrained: "One sentence. Be specific and personal. Reference other notes by content, not ID. If there's nothing interesting to say, return null." This prevents generic filler.
- Cost impact is near-zero: the classification call already happens. Adding 15 recent notes as context increases token usage marginally (gpt-4o-mini is $0.15/1M input tokens — even 20 notes is pennies).

---

## Implementation Sketch

**Effort:** LOW (1-2 days)

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/00006_ai_insight.sql` | Add `ai_insight TEXT` column to `notes` table |
| `supabase/functions/_shared/openai.ts` | Expand classification prompt and parser to handle `insight` field |
| `supabase/functions/classify-note/handler.ts` | Fetch last 20 user notes, pass as context, write `ai_insight` on update |
| `packages/shared/src/types.ts` | Add `ai_insight: string \| null` to `Note` interface |
| `apps/web/src/components/NoteCard.tsx` | Render insight with muted styling below note content |
| `apps/mobile/components/MobileNoteCard.tsx` | Render insight with muted styling below note content |

### Dependencies

None new. Uses existing OpenAI API + Supabase.

### Steps

1. Add `ai_insight TEXT` column to `notes` table via migration
2. Rewrite `buildClassificationPrompt()` to accept recent notes context and return `{category, confidence, insight}`. Update parser to extract all three fields.
3. In `classify-note` handler, fetch last 20 notes for the user before calling classify. Pass them as context. Write `ai_insight` alongside category on update.
4. Add the insight to `Note` type in shared package. Render it in NoteCard with muted styling (`color: #888; font-style: italic; font-size: 13px`).

---

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Insights could be banal ("This is a note about health") or hallucinate connections that don't exist | Prompt explicitly says "return null if nothing interesting." Null insights aren't displayed. Start with a tight prompt and iterate on quality. |
| Slightly increased latency on classification | gpt-4o-mini is fast; 20 notes of context adds ~500 tokens. Negligible impact. |
| Users may find insights noisy | Only display when non-null. Post-MVP: add a toggle to hide insights. |

---

## Criteria Scorecard

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Leverage | HIGH | Piggybacks on existing classification call; one prompt change unlocks a new dimension of value |
| Surprise | HIGH | "My notes app noticed I keep coming back to the same idea" is a genuinely startling moment |
| Feasibility | HIGH | One DB column, one prompt edit, one UI line. Buildable in 1-2 days |
| Fit | HIGH | Extends the core thesis ("the magic is the AI loop") from classify+summarize to classify+reflect |
| Defensibility | HIGH | Insights improve with note volume; your personal history is the moat no competitor can replicate |

---

## Research References

- [Mem – Your AI Thought Partner](https://get.mem.ai/) — auto-resurfaces relevant notes as you write
- [Best 15 Second Brain Apps in 2026](https://buildin.ai/blog/best-second-brain-apps) — AI knowledge bases connecting disparate ideas
- [Beyond the App: The 2026 Market Trends of AI Note Taker](https://www.einpresswire.com/article/889265650/beyond-the-app-the-2026-market-trends-of-ai-note-taker) — shift toward proactive intelligence
- [12 Best Voice to Notes Apps (2026)](https://voicetonotes.ai/blog/best-voice-to-notes-app/) — RAG-based personal knowledge graphs as emerging standard
