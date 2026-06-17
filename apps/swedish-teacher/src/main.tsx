import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Languages,
  LoaderCircle,
  Map,
  Mic2,
  Play,
  RotateCcw,
  Square,
  Timer,
  Utensils,
  Volume2,
} from "lucide-react";
import "./styles.css";

type Phrase = {
  sv: string;
  en: string;
  note?: string;
};

type Lesson = {
  id: string;
  minutes: string;
  title: string;
  focus: string;
  icon: typeof Mic2;
  phrases: Phrase[];
};

type ApiHealth = {
  hasApiKey: boolean;
  ttsModel: string;
  transcribeModel: string;
  voice: string;
};

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

const lessons: Lesson[] = [
  {
    id: "sounds",
    minutes: "0-5",
    title: "Pronunciation",
    focus: "Get the alphabet traps out of the way first.",
    icon: Mic2,
    phrases: [
      { sv: "j", en: "y, like ja -> yah" },
      { sv: "sj / sk / stj", en: "a soft sh sound" },
      { sv: "å", en: "o in more" },
      { sv: "ä", en: "e in bed" },
      { sv: "ö", en: "between uh and French eu" },
    ],
  },
  {
    id: "survival",
    minutes: "5-10",
    title: "Survival Phrases",
    focus: "The handful of words that unlock polite help.",
    icon: Languages,
    phrases: [
      { sv: "Hej", en: "Hi" },
      { sv: "God morgon", en: "Good morning" },
      { sv: "Tack så mycket", en: "Thank you very much" },
      { sv: "Varsågod", en: "You're welcome" },
      { sv: "Ursäkta", en: "Excuse me" },
      { sv: "Förlåt", en: "Sorry" },
      { sv: "Jag förstår inte", en: "I don't understand" },
      { sv: "Talar du engelska?", en: "Do you speak English?" },
    ],
  },
  {
    id: "patterns",
    minutes: "10-15",
    title: "Sentence Patterns",
    focus: "Swap one ending and you can say useful things.",
    icon: BookOpenText,
    phrases: [
      { sv: "Jag heter Sean.", en: "My name is Sean." },
      { sv: "Jag kommer från USA.", en: "I come from the USA." },
      { sv: "Jag bor i Kalifornien.", en: "I live in California." },
      { sv: "Jag vill ha kaffe.", en: "I want coffee." },
      { sv: "Jag vill ha vatten.", en: "I want water." },
      { sv: "Jag gillar Sverige.", en: "I like Sweden." },
    ],
  },
  {
    id: "restaurant",
    minutes: "15-20",
    title: "Restaurant",
    focus: "Order, pay, and stay polite.",
    icon: Utensils,
    phrases: [
      { sv: "En kaffe, tack", en: "A coffee, please" },
      { sv: "En öl, tack", en: "A beer, please" },
      { sv: "Menyn, tack", en: "The menu, please" },
      { sv: "Notan, tack", en: "The check, please" },
      { sv: "Hur mycket kostar det?", en: "How much does it cost?" },
    ],
  },
  {
    id: "numbers",
    minutes: "20-25",
    title: "Numbers",
    focus: "Enough counting to order and pay.",
    icon: Timer,
    phrases: [
      { sv: "Ett", en: "1" },
      { sv: "Två", en: "2" },
      { sv: "Tre", en: "3" },
      { sv: "Fyra", en: "4" },
      { sv: "Fem", en: "5" },
      { sv: "Sex", en: "6" },
      { sv: "Sju", en: "7" },
      { sv: "Åtta", en: "8" },
      { sv: "Nio", en: "9" },
      { sv: "Tio", en: "10" },
      { sv: "Två kaffe, tack.", en: "Two coffees, please." },
    ],
  },
  {
    id: "conversation",
    minutes: "25-30",
    title: "Conversation",
    focus: "Put the pieces together out loud.",
    icon: Map,
    phrases: [
      { sv: "Hej! Jag heter Sean.", en: "Hi! My name is Sean." },
      { sv: "Jag kommer från USA.", en: "I come from the USA." },
      { sv: "Talar du engelska?", en: "Do you speak English?" },
      { sv: "Ja, lite.", en: "Yes, a little." },
      { sv: "Jag vill ha kaffe och vatten.", en: "I would like coffee and water." },
      { sv: "Tack så mycket!", en: "Thank you very much!" },
      { sv: "Hej då!", en: "Goodbye!" },
    ],
  },
];

const wordBank: Phrase[] = [
  { sv: "Hej", en: "Hi" },
  { sv: "Hej då", en: "Bye" },
  { sv: "Ja", en: "Yes" },
  { sv: "Nej", en: "No" },
  { sv: "Tack", en: "Thanks" },
  { sv: "Ursäkta", en: "Excuse me" },
  { sv: "Förlåt", en: "Sorry" },
  { sv: "Jag", en: "I" },
  { sv: "Du", en: "You" },
  { sv: "Heter", en: "Am called" },
  { sv: "Vill", en: "Want" },
  { sv: "Har", en: "Have" },
  { sv: "Är", en: "Am/is/are" },
  { sv: "Kaffe", en: "Coffee" },
  { sv: "Vatten", en: "Water" },
  { sv: "Mat", en: "Food" },
  { sv: "Hus", en: "House" },
  { sv: "Bra", en: "Good" },
  { sv: "Inte", en: "Not" },
  { sv: "Engelska", en: "English" },
];

const challenge = [
  { prompt: "Hi, my name is Sean.", answer: "Hej, jag heter Sean." },
  { prompt: "Do you speak English?", answer: "Talar du engelska?" },
  { prompt: "I would like coffee.", answer: "Jag vill ha kaffe." },
  { prompt: "Thank you very much.", answer: "Tack så mycket." },
  { prompt: "I don't understand.", answer: "Jag förstår inte." },
];

const patternOptions = {
  opener: ["Jag heter", "Jag kommer från", "Jag bor i", "Jag vill ha", "Jag gillar"],
  ending: ["Sean", "USA", "Kalifornien", "kaffe", "Sverige"],
};

const localApiOrigin =
  window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8787"
    : "";
const productionBasePath = "/swedish-teacher";

function apiUrl(path: string) {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  if (localApiOrigin) return `${localApiOrigin}${apiPath}`;
  return `${productionBasePath}${apiPath}`;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

async function playSwedishAudio(text: string) {
  try {
    const response = await fetch(apiUrl("/api/speech"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      speak(text);
      return false;
    }

    const audioUrl = URL.createObjectURL(await response.blob());
    const audio = new Audio(audioUrl);
    audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl), { once: true });
    await audio.play();
    return true;
  } catch {
    speak(text);
    return false;
  }
}

function App() {
  const [activeLesson, setActiveLesson] = useLessonIndex();
  const [revealedCards, setRevealedCards] = useSetState<string>();
  const [completedLessons, setCompletedLessons] = useSetState<string>();
  const [selectedPattern, setSelectedPattern] = useState({
    opener: patternOptions.opener[0],
    ending: patternOptions.ending[0],
  });

  const lesson = lessons[activeLesson];
  const completion = Math.round((completedLessons.size / lessons.length) * 100);
  const LessonIcon = lesson.icon;
  const patternSentence = `${selectedPattern.opener} ${selectedPattern.ending}.`;

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__content">
          <div className="hero__eyebrow">
            <Coffee size={17} aria-hidden="true" />
            Tourist Swedish sprint
          </div>
          <h1 id="page-title">Swedish in 30</h1>
          <p>
            A guided practice session for getting from zero to basic tourist
            conversation without memorizing a giant vocabulary list.
          </p>
          <div className="hero__actions">
            <a href="#lesson" className="primary-action">
              <Play size={18} aria-hidden="true" />
              Start lesson
            </a>
            <a href="#challenge" className="secondary-action">
              <Check size={18} aria-hidden="true" />
              Try challenge
            </a>
          </div>
        </div>
        <div className="hero__visual" aria-label="Swedish lesson phrase preview">
          <div className="phrase-stack">
            <span>Hej!</span>
            <span>Jag vill ha kaffe.</span>
            <span>Tack så mycket.</span>
          </div>
        </div>
      </section>

      <section className="course-shell" id="lesson" aria-label="30 minute Swedish lesson">
        <aside className="timeline" aria-label="Lesson steps">
          <div className="progress-label">
            <span>{completion}% complete</span>
            <span>{completedLessons.size}/{lessons.length}</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${completion}%` }} />
          </div>
          <div className="lesson-list">
            {lessons.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeLesson;
              const isDone = completedLessons.has(item.id);
              return (
                <button
                  className={`lesson-tab ${isActive ? "is-active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setActiveLesson(index)}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>
                    <strong>{item.minutes}</strong>
                    {item.title}
                  </span>
                  {isDone && <Check size={17} aria-label="Complete" />}
                </button>
              );
            })}
          </div>
        </aside>

        <article className="lesson-panel">
          <div className="lesson-panel__top">
            <div>
              <div className="lesson-time">{lesson.minutes} minutes</div>
              <h2>
                <LessonIcon size={28} aria-hidden="true" />
                {lesson.title}
              </h2>
              <p>{lesson.focus}</p>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                setRevealedCards(new Set());
                setCompletedLessons(new Set());
              }}
              aria-label="Reset progress"
              title="Reset progress"
            >
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="phrase-grid">
            {lesson.phrases.map((phrase, index) => {
              const key = `${lesson.id}-${index}`;
              const isRevealed = revealedCards.has(key);
              return (
                <button
                  className={`phrase-card ${isRevealed ? "is-revealed" : ""}`}
                  key={key}
                  type="button"
                  onClick={() => setRevealedCards(toggleSet(revealedCards, key))}
                >
                  <span className="phrase-card__sv">{phrase.sv}</span>
                  <span className="phrase-card__en">
                    {isRevealed ? phrase.en : "Tap to reveal meaning"}
                  </span>
                  <span className="phrase-card__hint">
                    {isRevealed ? "Tap again to hide" : "Say it first"}
                  </span>
                </button>
              );
            })}
          </div>

          <PronunciationCoach lesson={lesson} />

          <div className="lesson-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => setActiveLesson(Math.max(activeLesson - 1, 0))}
              disabled={activeLesson === 0}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              Previous
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                setCompletedLessons(addToSet(completedLessons, lesson.id));
                setActiveLesson(Math.min(activeLesson + 1, lessons.length - 1));
              }}
            >
              Mark done
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>

      <section className="practice-band" aria-labelledby="pattern-title">
        <div className="section-heading">
          <span>Pattern builder</span>
          <h2 id="pattern-title">Build useful sentences quickly</h2>
          <p>Choose an opener and ending, then read the Swedish sentence aloud.</p>
        </div>
        <div className="builder">
          <label>
            Opener
            <select
              value={selectedPattern.opener}
              onChange={(event) =>
                setSelectedPattern((current) => ({
                  ...current,
                  opener: event.target.value,
                }))
              }
            >
              {patternOptions.opener.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <ArrowRight size={22} aria-hidden="true" />
          <label>
            Ending
            <select
              value={selectedPattern.ending}
              onChange={(event) =>
                setSelectedPattern((current) => ({
                  ...current,
                  ending: event.target.value,
                }))
              }
            >
              {patternOptions.ending.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="sentence-output">
            <span>{patternSentence}</span>
            <button
              className="icon-button"
              type="button"
              onClick={() => void playSwedishAudio(patternSentence)}
              aria-label="Hear Swedish sentence"
              title="Hear Swedish sentence"
            >
              <Volume2 size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="word-bank" aria-labelledby="word-bank-title">
        <div className="section-heading">
          <span>20 word bank</span>
          <h2 id="word-bank-title">Memorize the words with the most travel value</h2>
          <p>Audio examples use an AI-generated voice.</p>
        </div>
        <div className="word-grid">
          {wordBank.map((word, index) => (
            <button
              className="word-chip"
              key={word.sv}
              type="button"
              onClick={() => void playSwedishAudio(word.sv)}
              title={`Hear ${word.sv}`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{word.sv}</strong>
              <em>{word.en}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="challenge" id="challenge" aria-labelledby="challenge-title">
        <div className="section-heading">
          <span>Final challenge</span>
          <h2 id="challenge-title">Translate five lines without looking</h2>
          <p>If you can produce these, you can navigate most everyday interactions.</p>
        </div>
        <ChallengeList />
      </section>
    </main>
  );
}

function PronunciationCoach({ lesson }: { lesson: Lesson }) {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const selectedPhrase = lesson.phrases[selectedIndex] ?? lesson.phrases[0];
  const isBusy = isRecording || isSubmitting;

  useEffect(() => {
    setSelectedIndex(0);
    setResult(null);
    setError(null);
    setAudioNotice(null);
  }, [lesson.id]);

  useEffect(() => {
    let isMounted = true;
    fetch(apiUrl("/api/health"))
      .then((response) => response.json())
      .then((data: ApiHealth) => {
        if (isMounted) setHealth(data);
      })
      .catch(() => {
        if (isMounted) {
          setHealth({
            hasApiKey: false,
            ttsModel: "",
            transcribeModel: "",
            voice: "",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function startRecording() {
    setError(null);
    setResult(null);

    if (!health?.hasApiKey) {
      setError("Set OPENAI_API_KEY and restart the dev server to use pronunciation scoring.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not expose microphone recording.");
      return;
    }

    try {
      const recordingTarget = selectedPhrase.sv;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        void submitRecording(blob, recordingTarget);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access was blocked or unavailable.");
      setIsRecording(false);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }

  async function submitRecording(blob: Blob, target: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("target", target);
      formData.append("audio", blob, "attempt.webm");
      const response = await fetch(apiUrl("/api/pronunciation"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Pronunciation scoring failed.");
      }

      setResult(data as PronunciationResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pronunciation scoring failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="coach" aria-labelledby="coach-title">
      <div className="coach__header">
        <div>
          <span>Pronunciation coach</span>
          <h3 id="coach-title">Hear it, say it, check it</h3>
        </div>
        {health === null ? (
          <small>Checking audio</small>
        ) : health.hasApiKey ? (
          <small>AI voice, not human</small>
        ) : (
          <small className="coach__warning">API key needed</small>
        )}
      </div>

      <div className="coach__controls">
        <label>
          Practice phrase
          <select
            value={selectedIndex}
            onChange={(event) => {
              setSelectedIndex(Number(event.target.value));
              setResult(null);
              setError(null);
            }}
            disabled={isBusy}
          >
            {lesson.phrases.map((phrase, index) => (
              <option key={`${lesson.id}-${phrase.sv}`} value={index}>
                {phrase.sv}
              </option>
            ))}
          </select>
        </label>

        <button
          className="secondary-action"
          type="button"
          onClick={async () => {
            setAudioNotice(null);
            const usedOpenAiAudio = await playSwedishAudio(selectedPhrase.sv);
            if (!usedOpenAiAudio) {
              setAudioNotice("Using browser speech because OpenAI audio was not available.");
            }
          }}
        >
          <Volume2 size={18} aria-hidden="true" />
          Hear phrase
        </button>

        <button
          className={isRecording ? "record-action is-recording" : "record-action"}
          type="button"
          onClick={isRecording ? stopRecording : () => void startRecording()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoaderCircle size={18} aria-hidden="true" className="spin" />
          ) : isRecording ? (
            <Square size={17} aria-hidden="true" />
          ) : (
            <Mic2 size={18} aria-hidden="true" />
          )}
          {isSubmitting ? "Checking" : isRecording ? "Stop" : "Record"}
        </button>
      </div>

      {error && <p className="coach__error">{error}</p>}
      {audioNotice && <p className="coach__notice">{audioNotice}</p>}

      {result && (
        <div className="coach-result">
          <div className="score-ring" aria-label={`Pronunciation score ${result.score}`}>
            <strong>{result.score}</strong>
            <span>{result.rating}</span>
          </div>
          <div className="coach-result__body">
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{result.target}</dd>
              </div>
              <div>
                <dt>Heard</dt>
                <dd>{result.transcript}</dd>
              </div>
            </dl>
            <p>{result.feedback}</p>
            <ul>
              {result.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function ChallengeList() {
  const [openAnswers, setOpenAnswers] = useSetState<number>();

  return (
    <div className="challenge-list">
      {challenge.map((item, index) => {
        const isOpen = openAnswers.has(index);
        return (
          <div className="challenge-row" key={item.prompt}>
            <div>
              <span>Prompt {index + 1}</span>
              <strong>{item.prompt}</strong>
              {isOpen && <em>{item.answer}</em>}
            </div>
            <button
              className={isOpen ? "secondary-action" : "primary-action"}
              type="button"
              onClick={() => setOpenAnswers(toggleSet(openAnswers, index))}
            >
              {isOpen ? "Hide" : "Reveal"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useLessonIndex() {
  return useState(0);
}

function useSetState<T>(initial?: Iterable<T>) {
  return useState<Set<T>>(new Set(initial));
}

function toggleSet<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function addToSet<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  next.add(value);
  return next;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
