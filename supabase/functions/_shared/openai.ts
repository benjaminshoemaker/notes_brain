export type OpenAIChatJsonRequest = {
  fetchFn: typeof fetch;
  apiKey: string;
  model: string;
  prompt: string;
};

export type OpenAIWhisperTranscriptionRequest = {
  fetchFn: typeof fetch;
  apiKey: string;
  audio: Blob;
  filename: string;
  model?: string;
};

export type ClassificationResult = {
  category: string;
  confidence: number;
};

export function buildClassificationPrompt(content: string) {
  return `Classify this note into exactly one category. Return JSON only.

Categories:
- ideas: Shower thoughts, product concepts, things to explore
- projects: Active work tasks, deliverables
- family: Spouse, kids, household
- friends: Social relationships, people to reach out to
- health: Exercise, diet, medical, mental health
- admin: Bills, appointments, errands, life maintenance
- uncategorized: Doesn't fit cleanly

Note content:
"""
${content}
"""

Return: {"category": "<category>", "confidence": <0.0-1.0>}`;
}

export function parseClassificationResult(rawContent: string): ClassificationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(
      `Failed to parse classification response as JSON: ${(error as Error).message}`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Classification response must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  const category = record["category"];
  const confidence = record["confidence"];

  if (typeof category !== "string") {
    throw new Error("Classification response missing category");
  }

  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    throw new Error("Classification response missing confidence");
  }

  return { category, confidence };
}

export async function callOpenAIChatJson({
  fetchFn,
  apiKey,
  model,
  prompt
}: OpenAIChatJsonRequest): Promise<ClassificationResult> {
  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${response.status} ${text}`.trim());
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("OpenAI response missing content");
  }

  return parseClassificationResult(content);
}

export async function callOpenAIWhisperTranscription({
  fetchFn,
  apiKey,
  audio,
  filename,
  model = "whisper-1"
}: OpenAIWhisperTranscriptionRequest): Promise<string> {
  const formData = new FormData();
  formData.append("file", audio, filename);
  formData.append("model", model);

  const response = await fetchFn("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${response.status} ${text}`.trim());
  }

  const data = (await response.json()) as { text?: string | null };
  const transcript = data.text ?? "";
  if (!transcript) {
    throw new Error("OpenAI transcription missing text");
  }

  return transcript;
}
