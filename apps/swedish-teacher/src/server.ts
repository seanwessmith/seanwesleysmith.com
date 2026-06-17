import OpenAI from "openai";

const port = Number(process.env.PORT ?? 8787);
const publicDir = new URL("../dist/", import.meta.url);
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const ttsModel = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const transcribeModel =
  process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";
const voice = process.env.OPENAI_TTS_VOICE ?? "coral";

type PronunciationResult = {
  target: string;
  transcript: string;
  score: number;
  rating: string;
  feedback: string;
  tips: string[];
  missingWords: string[];
  extraWords: string[];
};

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/api/health") {
      return json({
        hasApiKey: Boolean(openai),
        ttsModel,
        transcribeModel,
        voice,
      });
    }

    if (url.pathname === "/api/speech" && request.method === "POST") {
      return handleSpeech(request);
    }

    if (url.pathname === "/api/pronunciation" && request.method === "POST") {
      return handlePronunciation(request);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return serveStatic(url.pathname);
  },
});

console.log(`Swedish teacher API listening on http://127.0.0.1:${port}`);

async function handleSpeech(request: Request) {
  if (!openai) return missingKeyResponse();

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 220) {
    return json({ error: "Expected a short Swedish phrase." }, 400);
  }

  const speech = await openai.audio.speech.create({
    model: ttsModel,
    voice,
    input: text,
    instructions:
      "Speak in clear Sweden Swedish at a patient learning pace. Keep the phrase natural, not theatrical.",
    response_format: "mp3",
  });

  return new Response(await speech.arrayBuffer(), {
    headers: {
      ...corsHeaders(),
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function handlePronunciation(request: Request) {
  if (!openai) return missingKeyResponse();

  const formData = await request.formData();
  const target = formData.get("target");
  const audio = formData.get("audio");

  if (typeof target !== "string" || !target.trim()) {
    return json({ error: "Missing target phrase." }, 400);
  }

  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: "Missing recorded audio." }, 400);
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: transcribeModel,
    language: "sv",
    prompt: `The speaker is practicing Swedish. Expected phrase: ${target}. Transcribe only the Swedish words that were spoken.`,
    response_format: "json",
  });

  const transcript = "text" in transcription ? transcription.text : "";
  return json(scorePronunciation(target, transcript));
}

function scorePronunciation(
  target: string,
  transcript: string,
): PronunciationResult {
  const targetWords = tokenizeSwedish(target);
  const heardWords = tokenizeSwedish(transcript);
  const targetText = targetWords.join(" ");
  const heardText = heardWords.join(" ");
  const distance = levenshtein(targetText, heardText);
  const longest = Math.max(targetText.length, heardText.length, 1);
  const score = Math.max(0, Math.round((1 - distance / longest) * 100));
  const missingWords = targetWords.filter((word) => !heardWords.includes(word));
  const extraWords = heardWords.filter((word) => !targetWords.includes(word));
  const tips = buildTips(target, transcript, missingWords, extraWords, score);

  return {
    target,
    transcript: transcript.trim() || "(nothing detected)",
    score,
    rating:
      score >= 90
        ? "Ready for travel"
        : score >= 75
          ? "Close"
          : score >= 55
            ? "Needs another pass"
            : "Slow it down",
    feedback:
      score >= 90
        ? "The transcription matched the target well. Keep the same rhythm and confidence."
        : score >= 75
          ? "The core phrase came through. One or two sounds or words likely need cleaning up."
          : "The phrase was not recognized clearly enough yet. Listen once, then repeat it more slowly.",
    tips,
    missingWords,
    extraWords,
  };
}

function buildTips(
  target: string,
  transcript: string,
  missingWords: string[],
  extraWords: string[],
  score: number,
) {
  const lowerTarget = target.toLocaleLowerCase("sv-SE");
  const lowerTranscript = transcript.toLocaleLowerCase("sv-SE");
  const tips = new Set<string>();

  if (missingWords.length > 0) {
    tips.add(
      `Listen for these missing words: ${missingWords.slice(0, 3).join(", ")}.`,
    );
  }

  if (extraWords.length > 0 && score < 90) {
    tips.add(
      "Try a cleaner start and finish so extra syllables do not get picked up.",
    );
  }

  if (/[å]/.test(lowerTarget))
    tips.add("For å, round your mouth toward the o in more.");
  if (/[ä]/.test(lowerTarget))
    tips.add("For ä, keep it close to the e in bed.");
  if (/[ö]/.test(lowerTarget))
    tips.add("For ö, round your lips while saying a soft uh.");
  if (/\bj/.test(lowerTarget))
    tips.add("Swedish j sounds like English y, as in ja -> yah.");
  if (/(sj|sk|stj)/.test(lowerTarget))
    tips.add("For sj/sk/stj, aim for a soft Swedish sh sound.");
  if (lowerTarget.includes("tack") && !lowerTranscript.includes("tack")) {
    tips.add("Tack is short and crisp. Keep the final ck tight.");
  }

  if (tips.size === 0) {
    tips.add("Repeat at the same pace once more, then slightly faster.");
  }

  return Array.from(tips).slice(0, 4);
}

function tokenizeSwedish(value: string) {
  return value
    .toLocaleLowerCase("sv-SE")
    .replace(/[^\p{L}\p{N}\såäö]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function missingKeyResponse() {
  return json(
    {
      error:
        "OPENAI_API_KEY is not set. Add it to your environment or .env.local before using audio coaching.",
      code: "missing_openai_api_key",
    },
    503,
  );
}

function serveStatic(pathname: string) {
  const cleanPath = pathname.replace(/^\/swedish-teacher/, "") || "/";
  const safePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const file = Bun.file(new URL(`.${safePath}`, publicDir));

  if (file.size > 0) {
    return new Response(file);
  }

  return new Response(Bun.file(new URL("./index.html", publicDir)));
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}
