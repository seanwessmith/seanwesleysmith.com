const spaSites = ["/swedish-teacher"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const swedishResponse = await handleSwedishTeacherApi(request, env, url);
    if (swedishResponse) return swedishResponse;

    const spaBase = spaSites.find(
      (base) => url.pathname === base || url.pathname.startsWith(`${base}/`),
    );
    if (spaBase && !looksLikeAssetPath(url.pathname)) {
      url.pathname = `${spaBase}/`;
      return env.ASSETS.fetch(rewriteAssetRequest(request, url));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    if (spaBase) {
      url.pathname = `${spaBase}/`;
      return env.ASSETS.fetch(rewriteAssetRequest(request, url));
    }

    url.pathname = "/index.html";
    return env.ASSETS.fetch(rewriteAssetRequest(request, url));
  },
};

function rewriteAssetRequest(request, url) {
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: request.redirect,
  });
}

function looksLikeAssetPath(pathname) {
  const lastSegment = pathname.split("/").pop() || "";
  return lastSegment.includes(".");
}

async function handleSwedishTeacherApi(request, env, url) {
  if (!url.pathname.startsWith("/swedish-teacher/api/")) return null;
  const apiPath = url.pathname.replace("/swedish-teacher", "");

  if (apiPath === "/api/health") {
    return json({
      hasApiKey: Boolean(env.OPENAI_API_KEY),
      ttsModel: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      transcribeModel: env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
      voice: env.OPENAI_TTS_VOICE || "coral",
    });
  }

  if (apiPath === "/api/speech" && request.method === "POST") {
    return handleSpeech(request, env);
  }

  if (apiPath === "/api/pronunciation" && request.method === "POST") {
    return handlePronunciation(request, env);
  }

  return json({ error: "Not found" }, 404);
}

async function handleSpeech(request, env) {
  if (!env.OPENAI_API_KEY) return missingKeyResponse();

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 220) {
    return json({ error: "Expected a short Swedish phrase." }, 400);
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: env.OPENAI_TTS_VOICE || "coral",
      input: text,
      instructions:
        "Speak in clear Sweden Swedish at a patient learning pace. Keep the phrase natural, not theatrical.",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    return json({ error: "Speech generation failed." }, response.status);
  }

  return new Response(response.body, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function handlePronunciation(request, env) {
  if (!env.OPENAI_API_KEY) return missingKeyResponse();

  const formData = await request.formData();
  const target = formData.get("target");
  const audio = formData.get("audio");

  if (typeof target !== "string" || !target.trim()) {
    return json({ error: "Missing target phrase." }, 400);
  }

  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: "Missing recorded audio." }, 400);
  }

  const openAiForm = new FormData();
  openAiForm.set("file", audio, audio.name || "practice.webm");
  openAiForm.set("model", env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe");
  openAiForm.set("language", "sv");
  openAiForm.set(
    "prompt",
    `The speaker is practicing Swedish. Expected phrase: ${target}. Transcribe only the Swedish words that were spoken.`,
  );
  openAiForm.set("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: openAiForm,
  });

  if (!response.ok) {
    return json({ error: "Pronunciation check failed." }, response.status);
  }

  const transcription = await response.json();
  return json(scorePronunciation(target, transcription.text || ""));
}

function scorePronunciation(target, transcript) {
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

function buildTips(target, transcript, missingWords, extraWords, score) {
  const lowerTarget = target.toLocaleLowerCase("sv-SE");
  const lowerTranscript = transcript.toLocaleLowerCase("sv-SE");
  const tips = new Set();

  if (missingWords.length > 0) {
    tips.add(`Listen for these missing words: ${missingWords.slice(0, 3).join(", ")}.`);
  }

  if (extraWords.length > 0 && score < 90) {
    tips.add("Try a cleaner start and finish so extra syllables do not get picked up.");
  }

  if (/[å]/.test(lowerTarget)) tips.add("For å, round your mouth toward the o in more.");
  if (/[ä]/.test(lowerTarget)) tips.add("For ä, keep it close to the e in bed.");
  if (/[ö]/.test(lowerTarget)) tips.add("For ö, round your lips while saying a soft uh.");
  if (/\bj/.test(lowerTarget)) tips.add("Swedish j sounds like English y, as in ja -> yah.");
  if (/(sj|sk|stj)/.test(lowerTarget)) tips.add("For sj/sk/stj, aim for a soft Swedish sh sound.");
  if (lowerTarget.includes("tack") && !lowerTranscript.includes("tack")) {
    tips.add("Tack is short and crisp. Keep the final ck tight.");
  }

  if (tips.size === 0) {
    tips.add("Repeat at the same pace once more, then slightly faster.");
  }

  return Array.from(tips).slice(0, 4);
}

function tokenizeSwedish(value) {
  return value
    .toLocaleLowerCase("sv-SE")
    .replace(/[^\p{L}\p{N}\såäö]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function missingKeyResponse() {
  return json(
    {
      error:
        "OPENAI_API_KEY is not set. Add it as a Cloudflare Worker secret before using audio coaching.",
      code: "missing_openai_api_key",
    },
    503,
  );
}

function json(data, status = 200) {
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
