import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLenis } from "lenis/react";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  Sparkles,
  Bot,
  Copy,
  Check,
  ChevronDown,
  Mic,
  Volume2,
  RefreshCw,
  SlidersHorizontal,
  Loader2,
  Pause,
  Eye,
  Edit3,
} from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { mdBlock } from "@/lib/markdown";
import { useContentItem, useContentList } from "@/lib/content";
import {
  buildEvaluationPrompts,
  evaluateTestWithLLM,
  resolveTestSource,
  getStoredAnswers,
  saveStoredAnswers,
  getStoredEvaluation,
  saveStoredEvaluation,
  clearStoredTest,
  getStoredSession,
  saveStoredSession,
  clearStoredTestAnswers,
  getStoredCustomAiConfig,
  saveStoredCustomAiConfig,
  saveTestSubmissionToDb,
  calculateComplexityAwareTimeLimit,
  formatSensibleDuration,
  type TestUserAnswers,
  type CustomAiConfig,
  type StoredTestEvaluation,
  type ResolvedTestSource,
} from "@/lib/testEvaluation";
import {
  checkSonAvailability,
  getSonBackendUrl,
  setSonBackendUrl,
  synthesizeSpeechWithSon,
  prefetchQuestionAudio,
  DEFAULT_VOICE_ID,
  KOKORO_VOICES,
  getSelectedKokoroVoice,
  setSelectedKokoroVoice,
  type KokoroVoiceOption,
  type SonStatus,
} from "@/lib/sonClient";
import OralQuestionAudio from "@/components/tests/OralQuestionAudio";
import OralAnswerInput from "@/components/tests/OralAnswerInput";
import { useOralQuestion } from "@/hooks/useOralQuestion";
import type {
  TestQuestion,
  OpenTestQuestion,
  MultipleChoiceTestQuestion,
  TestContent,
  StoryContent,
  GuideContent,
  DocContent,
} from "@/types";

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
}

const DEFAULT_MODELS: ModelInfo[] = [
  { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-flash-latest", label: "Gemini Flash Latest", provider: "gemini" },
  { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", provider: "gemini" },
  { id: "google/gemini-2.5-flash", label: "Google: Gemini 2.5 Flash", provider: "openrouter" },
  { id: "google/gemini-flash-latest", label: "Google: Gemini Flash Latest", provider: "openrouter" },
  { id: "google/gemini-flash-lite-latest", label: "Google: Gemini Flash-Lite Latest", provider: "openrouter" },
];

/**
 * Balance unclosed markdown fences (```) during live streaming.
 * Prevents marked from treating everything below as a code block.
 */
function balanceMarkdownFences(text: string): string {
  const matches = text.match(/(?:^|\n)```/g);
  if (matches && matches.length % 2 !== 0) {
    return text + "\n```";
  }
  return text;
}

export default function TestPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: test, loading: testLoading } = useContentItem<TestContent>("test", slug);
  const { data: evalStories } = useContentList<StoryContent>("story");
  const { data: evalGuides } = useContentList<GuideContent>("guide");
  const { data: evalDocs } = useContentList<DocContent>("doc");
  const sourceLookup = { stories: evalStories ?? [], guides: evalGuides ?? [], docs: evalDocs ?? [] };
  const lenis = useLenis();

  usePageMeta({ title: test?.title, description: test?.description, image: test?.image });
  // Core test state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<TestUserAnswers>({});
  const [viewMode, setViewMode] = useState<"intro" | "question" | "review" | "evaluation">("intro");

  // Oral mode state
  const [isOralMode, setIsOralMode] = useState<boolean>(test?.format === "oral");
  const [selectedVoice, setSelectedVoice] = useState<KokoroVoiceOption>(getSelectedKokoroVoice);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState<boolean>(false);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const voiceBtnRef = useRef<HTMLButtonElement>(null);

  const [sonStatus, setSonStatus] = useState<SonStatus>({
    available: false,
    url: getSonBackendUrl(),
  });
  const [isSonConfigOpen, setIsSonConfigOpen] = useState<boolean>(false);
  const [customSonUrlInput, setCustomSonUrlInput] = useState<string>(getSonBackendUrl());
  // Question 1 prompt audio readiness : the overview page holds until this is ready
  const [firstAudioStatus, setFirstAudioStatus] = useState<"idle" | "preparing" | "ready" | "failed">(
    "idle",
  );
  // Next question's prompt audio readiness : Question navigation holds until this is ready
  const [nextAudioStatus, setNextAudioStatus] = useState<"idle" | "preparing" | "ready" | "failed">(
    "idle",
  );

  // Timer state : frontier question countdown runs continuously in real-time
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [furthestQuestionIndex, setFurthestQuestionIndex] = useState<number>(0);
  const furthestQuestionIndexRef = useRef<number>(0);
  furthestQuestionIndexRef.current = furthestQuestionIndex;
  const questionEndTimesRef = useRef<Record<string, number>>({});
  const [autoSubmittedNotice, setAutoSubmittedNotice] = useState<boolean>(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState<string | null>(null);
  const [wasInterruptedNotice, setWasInterruptedNotice] = useState<boolean>(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState<boolean>(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState<number>(0);

  // LLM Evaluation state
  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [modelsReady, setModelsReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-flash");
  const [selectedProvider, setSelectedProvider] = useState<string>("deepseek");
  const [isCustomAiModalOpen, setIsCustomAiModalOpen] = useState<boolean>(false);
  const [customAiConfig, setCustomAiConfig] = useState<CustomAiConfig>({});
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationText, setEvaluationText] = useState<string>("");
  const [reasoningText, setReasoningText] = useState<string>("");
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [savedEvaluation, setSavedEvaluation] = useState<StoredTestEvaluation | null>(null);
  const [answerTab, setAnswerTab] = useState<"write" | "preview">("write");
  // Oral Evaluation Debrief state
  const [evalAudioUrl, setEvalAudioUrl] = useState<string | null>(null);
  const [isEvalAudioPlaying, setIsEvalAudioPlaying] = useState<boolean>(false);
  const [isEvalSynthesizing, setIsEvalSynthesizing] = useState<boolean>(false);
  const [evalAudioError, setEvalAudioError] = useState<string | null>(null);
  const evalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Model dropdown menu state
  const [modelMenuOpen, setModelMenuOpen] = useState<boolean>(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track active test state for departure handling
  const isTestingActiveRef = useRef<boolean>(false);
  isTestingActiveRef.current = viewMode === "question" || viewMode === "review";

  // Current viewed question
  const currentQuestion: TestQuestion | undefined = test?.questions[currentQuestionIndex];
  // Active frontier question being timed (furthest reached)
  const activeFrontierQuestion: TestQuestion | undefined = test?.questions[furthestQuestionIndex];

  const frontierComplexityLimit = useMemo(() => {
    if (!activeFrontierQuestion) {
      return { timeLimitSeconds: 60, formattedTime: "1m", complexityScore: "medium" as const };
    }
    return calculateComplexityAwareTimeLimit({
      question: activeFrontierQuestion,
      isOral: isOralMode && sonStatus.available,
      defaultTimeLimitSeconds: test?.defaultTimeLimitSeconds,
    });
  }, [activeFrontierQuestion, isOralMode, sonStatus.available, test]);

  const complexityLimit = frontierComplexityLimit;
  const questionTimeLimit = frontierComplexityLimit.timeLimitSeconds;
  // Total test time across all questions in clean sensible format
  const totalTestSeconds = useMemo(() => {
    if (!test) return 0;
    return test.questions.reduce((sum, q) => {
      return (
        sum +
        calculateComplexityAwareTimeLimit({
          question: q,
          isOral: isOralMode && sonStatus.available,
          defaultTimeLimitSeconds: test.defaultTimeLimitSeconds,
        }).timeLimitSeconds
      );
    }, 0);
  }, [test, isOralMode, sonStatus.available]);

  const formattedTotalTime = formatSensibleDuration(totalTestSeconds);

  // Oral exams hold on the overview page until Question 1's prompt audio exists.
  // A failed synthesis fails open: the exam is still startable, it just may wait inside Q1.
  const isFirstAudioPreparing =
    isOralMode && sonStatus.available && firstAudioStatus === "preparing";

  // Oral exams never advance into a question whose prompt audio is still synthesizing.
  const isNextAudioPreparing =
    isOralMode && sonStatus.available && viewMode === "question" && nextAudioStatus === "preparing";

  // Answer handler
  const handleAnswerChange = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers((prev) => {
        const updated = { ...prev, [questionId]: value };
        if (test) saveStoredAnswers(test.slug, updated);
        return updated;
      });
    },
    [test],
  );

  const currentAnswerText =
    currentQuestion && typeof answers[currentQuestion.id] === "string"
      ? (answers[currentQuestion.id] as string)
      : "";

  // Unified Oral Question Controller (Audio, Mic, and Phase Synchronization)
  const oral = useOralQuestion({
    questionId: currentQuestion ? currentQuestion.id : "",
    text: currentQuestion ? currentQuestion.question : "",
    title: currentQuestion?.description,
    examinerName: selectedVoice.name,
    voiceId: selectedVoice.id,
    currentAnswer: currentAnswerText,
    onAnswerChange: (newAnswer) => {
      if (!currentQuestion) return;
      handleAnswerChange(currentQuestion.id, newAnswer);
    },
    isOralMode,
    sonAvailable: sonStatus.available,
    enabled: viewMode === "question",
    autoPlay: viewMode === "question",
  });

  // Probe Son availability
  const refreshSonStatus = useCallback(async (overrideUrl?: string) => {
    const res = await checkSonAvailability(overrideUrl);
    setSonStatus(res);
  }, []);

  useEffect(() => {
    refreshSonStatus();
  }, [refreshSonStatus]);

  // Prefetch Question 1 audio on the overview page and HOLD the exam until it is ready.
  // Entering Question 1 without cached audio means the candidate sits in a silent question
  // view while the examiner's prompt is still being synthesized.
  useEffect(() => {
    if (!test || !isOralMode || !sonStatus.available || viewMode !== "intro") return;
    const firstQ = test.questions[0];
    if (!firstQ) {
      setFirstAudioStatus("ready");
      return;
    }

    let cancelled = false;
    setFirstAudioStatus("preparing");
    prefetchQuestionAudio(
      firstQ.id,
      firstQ.question,
      firstQ.description,
      selectedVoice.id,
      "kokoro",
    ).then((url) => {
      if (cancelled) return;
      setFirstAudioStatus(url ? "ready" : "failed");
    });

    return () => {
      cancelled = true;
    };
  }, [test, isOralMode, sonStatus.available, viewMode, selectedVoice.id]);

  // Prefetch the next question's audio while the candidate works on the current one, and track
  // readiness so navigation never lands on a question whose examiner prompt is not yet spoken.
  useEffect(() => {
    if (!test || !isOralMode || !sonStatus.available || viewMode !== "question") return;
    const nextQ = test.questions[currentQuestionIndex + 1];
    if (!nextQ) {
      setNextAudioStatus("ready");
      return;
    }

    let cancelled = false;
    setNextAudioStatus("preparing");
    prefetchQuestionAudio(
      nextQ.id,
      nextQ.question,
      nextQ.description,
      selectedVoice.id,
      "kokoro",
    ).then((url) => {
      if (cancelled) return;
      setNextAudioStatus(url ? "ready" : "failed");
    });

    return () => {
      cancelled = true;
    };
  }, [test, isOralMode, sonStatus.available, viewMode, currentQuestionIndex, selectedVoice.id]);

  // Load stored state on mount : tests are NOT resumable after leaving
  useEffect(() => {
    if (!test) return;

    const existingEval = getStoredEvaluation(test.slug);
    if (existingEval) {
      setSavedEvaluation(existingEval);
      setEvaluationText(existingEval.evaluation);
    }

    const session = getStoredSession(test.slug);
    if (session && (session.status === "in_progress" || session.status === "expired")) {
      clearStoredTestAnswers(test.slug);
      setAnswers({});
      setWasInterruptedNotice(true);
    } else {
      const storedAnswers = getStoredAnswers(test.slug);
      setAnswers(storedAnswers);
    }

    const customConfig = getStoredCustomAiConfig();
    if (customConfig) {
      setCustomAiConfig(customConfig);
      if (customConfig.model) setSelectedModel(customConfig.model);
    }

    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models ?? []);
        setModelsReady(true);
        if (data.models?.length) {
          if (!customConfig?.model) {
            const preferred =
              data.models.find((m: ModelInfo) => m.id === "deepseek-flash") ||
              data.models.find((m: ModelInfo) => m.id.includes("deepseek-flash")) ||
              data.models.find((m: ModelInfo) => m.id.includes("deepseek")) ||
              data.models.find((m: ModelInfo) => m.id.includes("claude-sonnet")) ||
              data.models[0];
            if (preferred) setSelectedModel(preferred.id);
          }
        }
      })
      .catch(() => { setModels([]); setModelsReady(true); });
  }, [test]);

  // No provider keys configured yet: AI actions stay visible but disabled,
  // with a message pointing at the fix, so nobody wonders where AI went.
  const aiUnavailable = !modelsReady || models.length === 0;

  // Enforce session invalidation on tab departure
  useEffect(() => {
    if (!test) return;

    const handleDeparture = () => {
      if (isTestingActiveRef.current) {
        saveStoredSession(test.slug, { status: "expired" });
        clearStoredTestAnswers(test.slug);
      }
    };

    window.addEventListener("beforeunload", handleDeparture);
    window.addEventListener("pagehide", handleDeparture);

    return () => {
      window.removeEventListener("beforeunload", handleDeparture);
      window.removeEventListener("pagehide", handleDeparture);
    };
  }, [test]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelMenuOpen &&
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node) &&
        modelBtnRef.current &&
        !modelBtnRef.current.contains(e.target as Node)
      ) {
        setModelMenuOpen(false);
      }
      if (
        isVoiceDropdownOpen &&
        voiceDropdownRef.current &&
        !voiceDropdownRef.current.contains(e.target as Node) &&
        voiceBtnRef.current &&
        !voiceBtnRef.current.contains(e.target as Node)
      ) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelMenuOpen, isVoiceDropdownOpen]);

  // Clean up debrief audio on unmount
  useEffect(() => {
    return () => {
      if (evalAudioUrl) URL.revokeObjectURL(evalAudioUrl);
      if (evalAudioRef.current) evalAudioRef.current.pause();
    };
  }, [evalAudioUrl]);

  // Synthesize and play oral evaluation debrief with Michael or chosen voice
  const handlePlayEvalDebrief = async () => {
    if (!sonStatus.available || !evaluationText.trim()) return;

    if (evalAudioRef.current && evalAudioUrl) {
      if (isEvalAudioPlaying) {
        evalAudioRef.current.pause();
        setIsEvalAudioPlaying(false);
      } else {
        evalAudioRef.current.play().then(() => setIsEvalAudioPlaying(true)).catch(() => {});
      }
      return;
    }

    setIsEvalSynthesizing(true);
    setEvalAudioError(null);

    try {
      const debriefSnippet = evaluationText.slice(0, 1500);
      const url = await synthesizeSpeechWithSon({
        text: `Here is your technical diagnostic debrief. ${debriefSnippet}`,
        voiceId: selectedVoice.id,
        provider: "kokoro",
      });

      setEvalAudioUrl(url);
      const audio = new Audio(url);
      audio.onended = () => setIsEvalAudioPlaying(false);
      audio.onpause = () => setIsEvalAudioPlaying(false);
      audio.onplay = () => setIsEvalAudioPlaying(true);
      evalAudioRef.current = audio;

      await audio.play();
      setIsEvalAudioPlaying(true);
    } catch (e: unknown) {
      setEvalAudioError(e instanceof Error ? e.message : "Failed to synthesize debrief audio");
      setIsEvalAudioPlaying(false);
    } finally {
      setIsEvalSynthesizing(false);
    }
  };

  // Forward declaration of evaluation runner
  const executeEvaluation = useCallback(
    async (submittedAnswers: TestUserAnswers) => {
      if (!test) return;
      setIsEvaluating(true);
      setEvaluationError(null);
      setEvaluationText("");
      setReasoningText("");
      setViewMode("evaluation");

      try {
        const selectedModelInfo = models.find((m) => m.id === selectedModel && m.provider === selectedProvider) || models.find((m) => m.id === selectedModel);
        const provider = customAiConfig.provider || selectedProvider || selectedModelInfo?.provider;
        const apiKey = customAiConfig.apiKey;
        const apiUrl = customAiConfig.apiUrl;

        let accumulated = "";
        let lastUpdateTime = 0;
        let updateRafId: number | null = null;

        await evaluateTestWithLLM({
          test,
          answers: submittedAnswers,
          model: selectedModel,
          provider,
          apiKey,
          apiUrl,
          lookup: sourceLookup,
          onReasoning: (_rToken, accReasoning) => {
            setReasoningText(accReasoning);
          },
          onToken: (_token, acc) => {
            accumulated = acc;
            const now = performance.now();
            if (now - lastUpdateTime > 50) {
              lastUpdateTime = now;
              if (updateRafId !== null) cancelAnimationFrame(updateRafId);
              updateRafId = requestAnimationFrame(() => {
                setEvaluationText(accumulated);
              });
            }
          },
        });

        if (updateRafId !== null) cancelAnimationFrame(updateRafId);
        setEvaluationText(accumulated);

        // Save evaluation locally & lock session as completed
        saveStoredEvaluation(test.slug, accumulated, selectedModel);
        saveStoredSession(test.slug, { status: "completed" });
        setSavedEvaluation({
          evaluation: accumulated,
          model: selectedModel,
          timestamp: new Date().toISOString(),
        });

        // Attempt to extract numeric score
        const scoreMatch = accumulated.match(/(?:Calculated\s+Mastery\s+Score|Total\s+Score):\s*(\d{1,3})/i);
        const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;

        // Save to database
        saveTestSubmissionToDb({
          slug: test.slug,
          answers: submittedAnswers,
          evaluation: accumulated,
          score: extractedScore,
          model: selectedModel,
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to complete evaluation.";
        setEvaluationError(message);
      } finally {
        setIsEvaluating(false);
      }
    },
    [test, models, selectedModel, customAiConfig],
  );

  // Timer countdown: driven by the frontier active question (furthest reached question).
  // If the candidate navigates back to previous questions, the frontier question's timer
  // continues running in real time and will expire if they don't return/answer in time.
  useEffect(() => {
    if (viewMode !== "question" || !test || !activeFrontierQuestion) return;

    const frontierQid = activeFrontierQuestion.id;

    // Initialize expiration timestamp for frontier question if not yet set
    if (!questionEndTimesRef.current[frontierQid]) {
      questionEndTimesRef.current[frontierQid] =
        Date.now() + frontierComplexityLimit.timeLimitSeconds * 1000;
    }

    const updateTimer = () => {
      // In oral mode, if audio examiner is reading, shift the expiration forward so listening is free
      if (isOralMode && sonStatus.available && oral.isListeningPhase) {
        questionEndTimesRef.current[frontierQid] =
          Date.now() + frontierComplexityLimit.timeLimitSeconds * 1000;
        setTimeLeft(frontierComplexityLimit.timeLimitSeconds);
        return;
      }

      const remainingMs = questionEndTimesRef.current[frontierQid] - Date.now();
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(secondsLeft);

      if (secondsLeft <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Frontier question expired!
        if (furthestQuestionIndexRef.current < test.questions.length - 1) {
          const prevIdx = furthestQuestionIndexRef.current;
          const nextIdx = prevIdx + 1;
          setAutoAdvanceNotice(`Question ${prevIdx + 1} timer expired. Focus moved to Question ${nextIdx + 1}.`);
          setTimeout(() => setAutoAdvanceNotice(null), 5000);
          setFurthestQuestionIndex(nextIdx);
          furthestQuestionIndexRef.current = nextIdx;
          setCurrentQuestionIndex(nextIdx);
          if (lenis) lenis.scrollTo(0, { immediate: true });
        } else {
          // Final question timer finished -> proceed to review
          setAutoSubmittedNotice(true);
          setViewMode("review");
          if (lenis) lenis.scrollTo(0, { immediate: true });
        }
      }
    };

    updateTimer();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [furthestQuestionIndex, viewMode, activeFrontierQuestion, frontierComplexityLimit, isOralMode, sonStatus.available, oral.isListeningPhase, lenis]);

  // Navigation handlers
  const handleNextQuestion = () => {
    if (!test) return;
    if (currentQuestionIndex < test.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      if (nextIdx > furthestQuestionIndexRef.current) {
        setFurthestQuestionIndex(nextIdx);
        furthestQuestionIndexRef.current = nextIdx;
      }
      if (lenis) lenis.scrollTo(0, { immediate: true });
    } else {
      setViewMode("review");
      if (lenis) lenis.scrollTo(0, { immediate: true });
    }
  };

  const handlePrevQuestion = () => {
    // In oral interview mode, questions proceed forward only
    if (isOralMode) return;
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      if (lenis) lenis.scrollTo(0, { immediate: true });
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    if (!test) return;
    // In oral interview mode, candidates cannot navigate back to past questions
    if (isOralMode && idx < furthestQuestionIndexRef.current) return;
    if (idx <= furthestQuestionIndexRef.current) {
      setCurrentQuestionIndex(idx);
      setViewMode("question");
      if (lenis) lenis.scrollTo(0, { immediate: true });
    }
  };

  const handleStartTest = () => {
    if (!test) return;
    clearStoredTestAnswers(test.slug);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setFurthestQuestionIndex(0);
    furthestQuestionIndexRef.current = 0;
    questionEndTimesRef.current = {};
    saveStoredSession(test.slug, { status: "in_progress" });
    setWasInterruptedNotice(false);
    setAutoSubmittedNotice(false);
    setViewMode("question");
  };

  const handleResetTest = () => {
    if (!test) return;
    if (window.confirm("Are you sure you want to reset your answers and evaluation?")) {
      clearStoredTest(test.slug);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setFurthestQuestionIndex(0);
      furthestQuestionIndexRef.current = 0;
      questionEndTimesRef.current = {};
      setEvaluationText("");
      setSavedEvaluation(null);
      setCurrentQuestionIndex(0);
      setViewMode("intro");
      setAutoSubmittedNotice(false);
      setWasInterruptedNotice(false);
    }
  };

  // Copy evaluation prompt
  const handleCopyPrompt = () => {
    if (!test) return;
    const { systemPrompt, userMessage } = buildEvaluationPrompts(test, answers, sourceLookup);
    const copiablePrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;
    navigator.clipboard.writeText(copiablePrompt).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    });
  };

  // Save custom Son URL
  const handleSaveSonUrl = () => {
    setSonBackendUrl(customSonUrlInput);
    refreshSonStatus(customSonUrlInput);
    setIsSonConfigOpen(false);
  };

  // Select voice handler : the overview prefetch effect re-runs on selectedVoice.id,
  // so the new voice's Question 1 audio (and the Start Test hold) is handled there.
  const handleSelectVoice = (voice: KokoroVoiceOption) => {
    setSelectedVoice(voice);
    setSelectedKokoroVoice(voice.id);
    setIsVoiceDropdownOpen(false);
  };

  // Memoized balanced evaluation HTML
  const renderedEvaluationHtml = useMemo(() => {
    if (!evaluationText) return "";
    const balanced = balanceMarkdownFences(evaluationText);
    return mdBlock(balanced);
  }, [evaluationText]);

  if (testLoading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Test Not Found</h1>
        <p className="text-on-surface-muted mb-xl">The requested test drill does not exist.</p>
        <Link to="/tests" className="text-primary hover:underline font-bold">
          &larr; Browse all tests
        </Link>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(
    (a) => (typeof a === "string" && a.trim().length > 0) || (Array.isArray(a) && a.length > 0),
  ).length;

  const deepseekModels = models.filter((m) => m.provider === "deepseek");
  const geminiModels = models.filter((m) => m.provider === "gemini");
  const groqModels = models.filter((m) => m.provider === "groq");
  const cerebrasModels = models.filter((m) => m.provider === "cerebras");
  const straitlyModels = models.filter((m) => m.provider === "straitly");
  const freeOR = models.filter((m) => m.provider === "openrouter" && m.free);
  const paidOR = models.filter((m) => m.provider === "openrouter" && !m.free);

  return (
    <div className="pb-giant min-h-screen text-on-surface">
      {/* ========================================================= */}
      {/* STICKY TOP HUD BAR */}
      {/* ========================================================= */}
      {viewMode === "question" && (
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border-default/60 shadow-lg">
          <div className="max-w-4xl mx-auto px-gutter md:px-margin-desktop py-sm flex items-center justify-between gap-md">
            {/* Question Counter & Jump Pills */}
            <div className="flex items-center gap-xs overflow-x-auto py-1">
              <span className="font-sora text-xs text-on-surface-muted mr-2 shrink-0">
                Q {currentQuestionIndex + 1}/{test.questions.length}
              </span>
              {test.questions.map((q, idx) => {
                const isAnswered =
                  typeof answers[q.id] === "string"
                    ? (answers[q.id] as string).trim().length > 0
                    : Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length > 0;
                const isCurrent = idx === currentQuestionIndex;
                const isFrontier = idx === furthestQuestionIndex;
                const isReached = idx <= furthestQuestionIndex;

                const isClickable = isReached && (!isOralMode || idx === furthestQuestionIndex);

                return (
                  <Tooltip
                    key={q.id}
                    label={
                      isOralMode && idx < furthestQuestionIndex
                        ? `Question ${idx + 1} (Oral mode is forward-only)`
                        : isCurrent
                        ? `Question ${idx + 1} (Viewing)`
                        : isFrontier
                        ? `Question ${idx + 1} (Timer running: ${timeLeft}s)`
                        : isAnswered
                        ? `Question ${idx + 1} (Answered)`
                        : isReached
                        ? `Question ${idx + 1}`
                        : `Question ${idx + 1} (Locked until reached)`
                    }
                  >
                    <button
                      type="button"
                      onClick={() => isClickable && handleJumpToQuestion(idx)}
                      disabled={!isClickable}
                      className={`w-6 h-6 rounded-md font-sora text-[11px] font-bold flex items-center justify-center transition-all shrink-0 ${
                        isCurrent
                          ? "bg-primary text-[#0e1319] ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : isFrontier
                          ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/80 animate-pulse ring-1 ring-accent-orange/60"
                          : isAnswered
                          ? "bg-brand-green/20 text-brand-green border border-brand-green/40"
                          : isReached && !isOralMode
                          ? "bg-surface-container border border-border-default/60 text-on-surface-muted hover:text-on-surface"
                          : "bg-surface-container/40 border border-border-default/30 text-on-surface-muted/40 cursor-not-allowed"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* Countdown Clock & Sources Button */}
            <div className="flex items-center gap-sm shrink-0">
              {/* Question Countdown Timer */}
              {isOralMode && sonStatus.available && oral.isListeningPhase ? (
                <div className="flex items-center gap-sm">
                  <Tooltip label="Examiner is reading prompt. Answering timer will start when reading finishes.">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold bg-primary/20 text-primary border border-primary/40 animate-pulse">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Examiner Speaking... (Listening)</span>
                    </div>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={oral.startAnswering}
                    className="text-[11px] font-sora text-primary hover:underline transition-colors shrink-0"
                  >
                    Start Answering &rarr;
                  </button>
                </div>
              ) : (
                <Tooltip
                  label={timeLeft <= 0 ? "Time expired for this question" : `Allotted response time: ${complexityLimit.formattedTime}`}
                >
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border transition-colors ${
                      timeLeft <= 0
                        ? "bg-surface-container border-border-default text-on-surface-muted"
                        : timeLeft <= 10
                        ? "bg-error/20 text-error border-error animate-pulse"
                        : timeLeft <= 20
                        ? "bg-accent-orange/20 text-accent-orange border-accent-orange"
                        : "bg-surface-container border-border-default text-on-surface"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeLeft <= 0 ? "0s (Expired)" : `${timeLeft}s`}</span>
                    {timeLeft > 0 && (
                      <span className="text-[10px] opacity-60 hidden sm:inline">
                        ({complexityLimit.formattedTime})
                      </span>
                    )}
                  </div>
                </Tooltip>
              )}

              {/* Source Materials Button */}
              {test.sources.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSourceDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-border-default/60 text-xs font-sora text-primary hover:bg-surface transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sources</span>
                  <span className="bg-primary/20 text-primary px-1.5 py-0.2 rounded-full text-[10px]">
                    {test.sources.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-gutter md:px-margin-desktop pt-24 md:pt-32">
        {/* Breadcrumb Header */}
        <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
          <Link
            to="/tests"
            className="inline-flex items-center gap-1 text-xs font-sora text-on-surface-muted hover:text-primary transition-colors"
          >
            &larr; All Tests
          </Link>

          <div className="flex items-center gap-sm">
            {test.format === "oral" || isOralMode ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sora font-semibold bg-accent-orange/15 text-accent-orange border border-accent-orange/30">
                <Mic className="w-3.5 h-3.5" />
                Oral ({selectedVoice.name})
              </span>
            ) : null}

            <Tag variant="primary">{test.category}</Tag>
            {test.subcategory && (
              <span className="text-xs font-sora text-on-surface-variant">// {test.subcategory}</span>
            )}
          </div>
        </div>

        {/* Title & Metadata */}
        <header className="mb-xl">
          <AccentBar variant="small" className="mb-sm" />
          <h1 className="font-sora text-headline-lg-mobile md:text-headline-lg text-on-surface leading-tight mb-md">
            {test.title}
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted leading-relaxed max-w-3xl">
            {test.description}
          </p>
        </header>

        {/* ========================================================= */}
        {/* MODE: INTRO / OVERVIEW */}
        {/* ========================================================= */}
        {viewMode === "intro" && (
          <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl">
            {/* Oral Mode & Exam Settings Selector */}
            <div className="mb-xl p-lg rounded-xl bg-[#0e1319] border border-border-default/60">
              <div className="flex flex-wrap items-center justify-between gap-md mb-md">
                <div>
                  <h3 className="font-sora text-sm font-bold text-on-surface flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    Examination Format
                  </h3>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-0.5">
                    Choose between verbal examination with Kokoro speech or standard typed responses.
                  </p>
                </div>

                <div className="flex items-center rounded-xl bg-surface border border-border-default/60 p-1 font-sora text-xs">
                  <button
                    type="button"
                    onClick={() => setIsOralMode(false)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      !isOralMode
                        ? "bg-surface-container text-on-surface font-semibold shadow-sm"
                        : "text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    Written Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOralMode(true);
                      refreshSonStatus();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      isOralMode
                        ? "bg-primary text-[#0e1319] font-bold shadow-sm"
                        : "text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Oral Exam ({selectedVoice.name})</span>
                  </button>
                </div>
              </div>

              {/* Son Backend Status Bar (when Oral Mode is active) */}
              {isOralMode && (
                <div
                  className={`p-md rounded-lg border text-xs font-sora flex flex-wrap items-center justify-between gap-sm transition-colors ${
                    sonStatus.available
                      ? "bg-brand-green/10 border-brand-green/30 text-brand-green"
                      : "bg-accent-orange/10 border-accent-orange/30 text-accent-orange"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        sonStatus.available ? "bg-brand-green animate-pulse" : "bg-accent-orange"
                      }`}
                    />
                    <span>
                      {sonStatus.available
                        ? `Son Voice Backend Online (Kokoro · ${selectedVoice.name} · ${sonStatus.url})`
                        : `Son Voice Backend Offline (${sonStatus.url})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refreshSonStatus()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border-default text-[11px] text-on-surface hover:text-primary transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSonConfigOpen((v) => !v)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border-default text-[11px] text-on-surface hover:text-primary transition-colors"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Config URL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Kokoro Voice Picker Dropdown (when Oral Mode is active) */}
              {isOralMode && (
                <div className="mt-md p-md rounded-xl bg-surface border border-border-default/60 flex flex-wrap items-center justify-between gap-sm">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sora text-xs font-semibold text-on-surface">Kokoro Voice:</span>
                        <span className="font-sora text-xs text-primary font-bold">{selectedVoice.name}</span>
                        <span className="text-[10px] font-mono text-on-surface-muted bg-surface-container px-1.5 py-0.5 rounded border border-border-default/40">
                          {selectedVoice.flag} {selectedVoice.accent} {selectedVoice.gender}
                        </span>
                      </div>
                      <p className="font-dm-sans text-[11px] text-on-surface-muted mt-0.5">
                        Select your preferred examiner voice before starting your oral exam (default: Michael).
                      </p>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  <div className="relative" ref={voiceDropdownRef}>
                    <button
                      ref={voiceBtnRef}
                      type="button"
                      onClick={() => setIsVoiceDropdownOpen((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-border-default hover:border-primary/50 text-xs font-sora text-on-surface transition-colors"
                    >
                      <span>{selectedVoice.flag}</span>
                      <span className="font-semibold">{selectedVoice.name}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-on-surface-muted transition-transform ${
                          isVoiceDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isVoiceDropdownOpen && (
                      <div className="absolute top-full mt-1 right-0 bg-surface border border-border-default rounded-xl shadow-2xl z-50 py-xs min-w-[280px] max-h-[340px] overflow-y-auto">
                        <div className="px-md py-1 border-b border-border-default/40 text-[10px] font-sora text-on-surface-muted uppercase tracking-wider">
                          Select Kokoro Voice
                        </div>

                        {/* American Male */}
                        <SectionHeader label="American Male" dotColor="#38bdf8" />
                        {KOKORO_VOICES.filter((v) => v.accent === "American" && v.gender === "Male").map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVoice(v)}
                            className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${
                              v.id === selectedVoice.id ? "text-primary font-bold" : "text-on-surface"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{v.flag}</span>
                              <span>{v.name}</span>
                              {v.id === DEFAULT_VOICE_ID && (
                                <span className="text-[10px] text-primary/80 font-mono font-normal">
                                  (Default)
                                </span>
                              )}
                            </span>
                            {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}

                        {/* American Female */}
                        <SectionHeader label="American Female" dotColor="#ec4899" />
                        {KOKORO_VOICES.filter((v) => v.accent === "American" && v.gender === "Female").map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVoice(v)}
                            className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${
                              v.id === selectedVoice.id ? "text-primary font-bold" : "text-on-surface"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{v.flag}</span>
                              <span>{v.name}</span>
                            </span>
                            {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}

                        {/* British Male */}
                        <SectionHeader label="British Male" dotColor="#a855f7" />
                        {KOKORO_VOICES.filter((v) => v.accent === "British" && v.gender === "Male").map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVoice(v)}
                            className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${
                              v.id === selectedVoice.id ? "text-primary font-bold" : "text-on-surface"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{v.flag}</span>
                              <span>{v.name}</span>
                            </span>
                            {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}

                        {/* British Female */}
                        <SectionHeader label="British Female" dotColor="#10b981" />
                        {KOKORO_VOICES.filter((v) => v.accent === "British" && v.gender === "Female").map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVoice(v)}
                            className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${
                              v.id === selectedVoice.id ? "text-primary font-bold" : "text-on-surface"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{v.flag}</span>
                              <span>{v.name}</span>
                            </span>
                            {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Son Offline Warning Card */}
              {isOralMode && !sonStatus.available && (
                <div className="mt-md p-md rounded-lg bg-error/10 border border-error/30 text-xs font-dm-sans text-on-surface leading-relaxed">
                  <strong className="font-sora text-error block mb-1">
                    ⚠️ Son Voice Backend is Required for Oral Examination
                  </strong>
                  The oral exam synthesizes questions via Kokoro TTS with the Michael voice on your Son backend.
                  Please ensure Son is running locally via:
                  <div className="mt-2 font-mono text-[11px] bg-background/80 p-2 rounded border border-border-default/60 text-primary">
                    python son.py
                  </div>
                  <p className="mt-2 text-on-surface-muted text-[11px]">
                    Default URL is <code className="text-primary font-mono">{sonStatus.url}</code> (or configured via <code className="text-primary font-mono">VITE_SON_BACKEND_URL</code>). You can also switch to <strong>Written Mode</strong> above.
                  </p>
                </div>
              )}

              {/* URL Config Form */}
              {isSonConfigOpen && (
                <div className="mt-md p-md rounded-lg bg-surface border border-border-default flex items-center gap-sm">
                  <input
                    type="text"
                    value={customSonUrlInput}
                    onChange={(e) => setCustomSonUrlInput(e.target.value)}
                    placeholder="http://localhost:7860"
                    className="flex-1 bg-background border border-border-default rounded-lg px-sm py-1 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <Button variant="primary" onClick={handleSaveSonUrl} className="text-xs py-1">
                    Save
                  </Button>
                </div>
              )}
            </div>

            {/* Test Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md py-lg border-y border-border-default/60 mb-xl">
              <div>
                <span className="block text-[11px] font-sora uppercase tracking-wider text-on-surface-muted mb-1">
                  Total Questions
                </span>
                <span className="font-sora text-sm font-bold text-on-surface">
                  {test.questions.length} questions
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-sora uppercase tracking-wider text-on-surface-muted mb-1">
                  Format
                </span>
                <span className="font-sora text-sm font-bold text-on-surface flex items-center gap-1">
                  {isOralMode ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-accent-orange" />
                      Oral ({selectedVoice.name})
                    </>
                  ) : (
                    "Written Examination"
                  )}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-sora uppercase tracking-wider text-on-surface-muted mb-1">
                  Total Drill Time
                </span>
                <span className="font-sora text-sm font-bold text-accent-orange">
                  {formattedTotalTime}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-sora uppercase tracking-wider text-on-surface-muted mb-1">
                  Passing Score
                </span>
                <span className="font-sora text-sm font-bold text-brand-green">
                  {test.passingScore ? `${test.passingScore}%` : "75%"}
                </span>
              </div>
            </div>

            {/* Interruption warning banner if previous session was left */}
            {wasInterruptedNotice && (
              <div className="mb-lg bg-accent-orange/15 border border-accent-orange/40 rounded-xl p-md flex items-center gap-sm text-xs font-sora text-accent-orange">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Tests cannot be resumed once you leave the page or the timer expires. You may start a fresh test attempt below.
                </span>
              </div>
            )}

            {/* Test Rules */}
            <div className="space-y-lg mb-xxl">
              <div className="bg-[#0e1319] border border-border-default/60 rounded-xl p-lg">
                <h3 className="font-sora text-sm font-bold text-on-surface mb-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-orange" />
                  Sensible Complexity Timing
                </h3>
                <p className="font-dm-sans text-sm text-on-surface-muted leading-relaxed">
                  {isOralMode
                    ? "In Oral Mode, the answer countdown waits while the examiner reads the prompt aloud. Once reading completes (or when you begin speaking), your full answering timer begins. You never lose time listening to the question."
                    : "Each question has a clean, complexity-aware time limit (30s, 45s, 1m, 1m 30s, 2m) calibrated to provide fair reading time and answer formulation. When the timer expires, the test automatically advances."}
                </p>
              </div>

              <div className="bg-[#0e1319] border border-border-default/60 rounded-xl p-lg">
                <h3 className="font-sora text-sm font-bold text-on-surface mb-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Diagnostic LLM Feedback &amp; Verbal Fluency
                </h3>
                <p className="font-dm-sans text-sm text-on-surface-muted leading-relaxed">
                  Upon completion, your responses are evaluated against the source materials by your chosen LLM.
                  The evaluator highlights exact quotes, identifies misunderstandings, and evaluates verbal delivery
                  (penalizing excessive 'uhs, ums, yeahs' that signal uncertainty, while permitting natural conversational cadence).
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-md pt-md border-t border-border-default/40">
              <div className="text-xs font-sora text-on-surface-muted">
                {isFirstAudioPreparing
                  ? `Synthesizing the Question 1 prompt. The exam starts the moment ${selectedVoice.name} is ready.`
                  : "Questions auto-advance on timer expiration."}
              </div>

              <div className="flex items-center gap-sm">
                {savedEvaluation && (
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("evaluation")}
                    className="text-xs"
                  >
                    View Previous Feedback
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleStartTest}
                  disabled={isFirstAudioPreparing}
                  className="gap-2"
                >
                  {isFirstAudioPreparing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Examiner Audio…</span>
                    </>
                  ) : (
                    <>
                      <span>{savedEvaluation ? "Retake Test" : "Start Test"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE: QUESTION (ONE AT A TIME, TIMED) */}
        {/* ========================================================= */}
        {viewMode === "question" && currentQuestion && (
          <div>
            {autoAdvanceNotice && (
              <div className="mb-md p-md rounded-xl bg-accent-orange/15 border border-accent-orange/40 text-accent-orange text-xs font-sora flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{autoAdvanceNotice}</span>
              </div>
            )}
            {/* Question Card */}
            <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl mb-xl">
              {/* Question Header */}
              <div className="mb-xl">
                <h2 className="font-sora text-lg md:text-xl font-bold text-on-surface leading-snug mb-sm">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.description && (
                  <p className="font-dm-sans text-sm text-on-surface-muted leading-relaxed">
                    {currentQuestion.description}
                  </p>
                )}
              </div>
              {/* Active frontier timer warning banner when reviewing earlier questions */}
              {currentQuestionIndex < furthestQuestionIndex && (
                <div className="mb-lg p-md rounded-xl bg-accent-orange/15 border border-accent-orange/40 text-accent-orange text-xs font-sora flex flex-wrap items-center justify-between gap-md">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>
                      Viewing Question {currentQuestionIndex + 1}. <strong>Question {furthestQuestionIndex + 1} timer ({timeLeft}s)</strong> is actively running in the background.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQuestionIndex(furthestQuestionIndex);
                      if (lenis) lenis.scrollTo(0, { immediate: true });
                    }}
                    className="text-xs font-bold text-accent-orange underline hover:text-white shrink-0"
                  >
                    Return to Question {furthestQuestionIndex + 1} &rarr;
                  </button>
                </div>
              )}

              {/* Oral Audio Examiner Component */}
              {isOralMode && (
                <OralQuestionAudio
                  examinerName={selectedVoice.name}
                  examinerTitle={test.oralConfig?.examinerTitle || "Lead Technical Examiner"}
                  isAudioPlaying={oral.isAudioPlaying}
                  isSynthesizing={oral.isSynthesizing}
                  playbackSpeed={oral.playbackSpeed}
                  onSetSpeed={oral.setPlaybackSpeed}
                  onTogglePlay={oral.togglePlayAudio}
                  onReplay={oral.replayPrompt}
                  error={oral.audioError}
                  isListeningPhase={oral.isListeningPhase}
                  onStartAnswering={oral.startAnswering}
                />
              )}

              {/* Question Answer Inputs */}
              {isOralMode ? (
                /* ORAL MODE INPUT: Speech Dictation + Multiple-Choice Integration */
                <OralAnswerInput
                  value={(answers[currentQuestion.id] as string) || ""}
                  onChange={(val) => {
                    if (oral.isListeningPhase) oral.startAnswering();
                    handleAnswerChange(currentQuestion.id, val);
                  }}
                  questionType={currentQuestion.type}
                  placeholder="Speak your answer aloud into your microphone or type here..."
                  isMicListening={oral.isMicListening}
                  soundActive={oral.soundActive}
                  interimText={oral.interimText}
                  speechError={oral.speechError}
                  onToggleMic={oral.toggleMic}
                  options={
                    currentQuestion.type === "multiple-choice"
                      ? (currentQuestion as MultipleChoiceTestQuestion).options
                      : []
                  }
                  selectedOptionIds={
                    Array.isArray(answers[currentQuestion.id])
                      ? (answers[currentQuestion.id] as string[])
                      : [answers[currentQuestion.id] as string]
                  }
                  onToggleOption={(optId) => {
                    if (oral.isListeningPhase) oral.startAnswering();
                    if (currentQuestion.type === "multiple-choice") {
                      const mcQ = currentQuestion as MultipleChoiceTestQuestion;
                      const currentSelected = answers[mcQ.id];
                      if (mcQ.allowMultiple) {
                        const prev = Array.isArray(currentSelected) ? currentSelected : [];
                        const next = prev.includes(optId)
                          ? prev.filter((id) => id !== optId)
                          : [...prev, optId];
                        handleAnswerChange(mcQ.id, next);
                      } else {
                        handleAnswerChange(mcQ.id, optId);
                      }
                    }
                  }}
                />
              ) : currentQuestion.type === "multiple-choice" ? (
                /* STANDARD MULTIPLE-CHOICE WRITTEN */
                <div className="space-y-sm">
                  {(currentQuestion as MultipleChoiceTestQuestion).options.map((option) => {
                    const mcQ = currentQuestion as MultipleChoiceTestQuestion;
                    const currentSelected = answers[mcQ.id];
                    const isSelected = mcQ.allowMultiple
                      ? Array.isArray(currentSelected) && currentSelected.includes(option.id)
                      : currentSelected === option.id;

                    const handleSelect = () => {
                      if (mcQ.allowMultiple) {
                        const prev = Array.isArray(currentSelected) ? currentSelected : [];
                        const next = isSelected
                          ? prev.filter((id) => id !== option.id)
                          : [...prev, option.id];
                        handleAnswerChange(mcQ.id, next);
                      } else {
                        handleAnswerChange(mcQ.id, option.id);
                      }
                    };

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={handleSelect}
                        className={`w-full text-left p-lg rounded-xl border transition-all flex items-start gap-md ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "bg-[#0e1319] border-border-default/60 hover:border-primary/40 hover:bg-[#121820]"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg font-sora text-xs font-bold flex items-center justify-center shrink-0 uppercase transition-colors ${
                            isSelected
                              ? "bg-primary text-background"
                              : "bg-surface border border-border-default text-on-surface-muted"
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : option.id}
                        </div>
                        <div className="font-dm-sans text-sm md:text-base text-on-surface leading-relaxed pt-0.5">
                          {option.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* STANDARD OPEN WRITTEN WITH MARKDOWN WRITE / PREVIEW TABS */
                <div>
                  <div className="flex items-center justify-between gap-sm mb-sm border-b border-border-default/40 pb-xs">
                    <div className="flex items-center gap-xs">
                      <button
                        type="button"
                        onClick={() => setAnswerTab("write")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sora font-semibold transition-colors ${
                          answerTab === "write"
                            ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                            : "text-on-surface-muted hover:text-on-surface"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Write</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswerTab("preview")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sora font-semibold transition-colors ${
                          answerTab === "preview"
                            ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                            : "text-on-surface-muted hover:text-on-surface"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-on-surface-variant hidden sm:inline">
                      Markdown supported
                    </span>
                  </div>

                  {answerTab === "write" ? (
                    <textarea
                      value={(answers[currentQuestion.id] as string) || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your structured answer here... (Markdown headings, lists, and code blocks supported)"
                      rows={8}
                      style={{ backgroundColor: "#0e1319", color: "#dfe2eb" }}
                      className="w-full rounded-xl border border-border-default p-lg font-dm-sans text-body-base leading-relaxed placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                    />
                  ) : (
                    <div className="w-full min-h-[200px] rounded-xl border border-border-default p-lg bg-[#0e1319] text-on-surface overflow-y-auto">
                      {(answers[currentQuestion.id] as string)?.trim() ? (
                        <MarkdownHtml
                          html={mdBlock((answers[currentQuestion.id] as string) || "")}
                          className="prose font-dm-sans text-sm text-on-surface leading-relaxed max-w-none prose-headings:font-sora prose-headings:text-on-surface prose-code:text-primary prose-pre:bg-surface-container prose-pre:border prose-pre:border-border-default"
                        />
                      ) : (
                        <p className="font-dm-sans text-sm text-on-surface-muted italic">
                          Nothing to preview yet. Switch to Write to enter your markdown response.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant mt-2 px-1">
                    <span>
                      Length:{" "}
                      {typeof answers[currentQuestion.id] === "string"
                        ? (answers[currentQuestion.id] as string).trim().split(/\s+/).filter(Boolean).length
                        : 0}{" "}
                      words
                    </span>
                    <span>Supports Markdown formatting</span>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-md pt-xl mt-xl border-t border-border-default/40">
                {!isOralMode ? (
                  <Button
                    variant="ghost"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                ) : (
                  <span className="text-xs font-sora text-on-surface-muted italic">
                    Oral Mode: questions proceed forward only
                  </span>
                )}

                <div className="flex items-center gap-sm">
                  {currentQuestionIndex < test.questions.length - 1 ? (
                    <Button
                      variant="primary"
                      onClick={handleNextQuestion}
                      disabled={isNextAudioPreparing}
                      className="gap-2"
                    >
                      {isNextAudioPreparing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing Next Question Audio…</span>
                        </>
                      ) : (
                        <>
                          <span>Next Question</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setViewMode("review");
                        if (lenis) lenis.scrollTo(0, { immediate: true });
                      }}
                      className="gap-2 bg-brand-green text-[#0a0e14] hover:bg-brand-green/90 font-bold shadow-lg"
                    >
                      <span>Review &amp; Submit</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE: REVIEW */}
        {/* ========================================================= */}
        {viewMode === "review" && (
          <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl">
            <h2 className="font-sora text-headline-sm text-on-surface mb-sm">
              Review Your Responses
            </h2>
            <p className="font-dm-sans text-body-base text-on-surface-muted mb-xl">
              Inspect your answers before sending them to the LLM for evaluation.
            </p>

            {/* Questions Summary Table */}
            <div className="space-y-md mb-xxl">
              {test.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered =
                  typeof ans === "string" ? ans.trim().length > 0 : Array.isArray(ans) && ans.length > 0;

                return (
                  <div
                    key={q.id}
                    className="p-lg rounded-xl bg-[#0e1319] border border-border-default/60 flex flex-wrap items-center justify-between gap-md hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-md max-w-2xl">
                      <span className="font-sora text-xs font-bold px-2 py-1 rounded bg-surface border border-border-default text-primary">
                        Q{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-sora text-sm font-semibold text-on-surface line-clamp-1">
                          {q.question}
                        </h4>
                        <p className="font-dm-sans text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                          {isAnswered
                            ? typeof ans === "string"
                              ? ans
                              : Array.isArray(ans)
                              ? ans.join(", ")
                              : ""
                            : "No response provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-sm">
                      <span
                        className={`text-xs font-sora px-2.5 py-0.5 rounded-full border ${
                          isAnswered
                            ? "bg-brand-green/15 text-brand-green border-brand-green/30"
                            : "bg-surface-container text-on-surface-muted border-border-default"
                        }`}
                      >
                        {isAnswered ? "Answered" : "Empty"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Model Selection for Evaluation */}
            <div className="p-lg rounded-xl bg-[#0e1319] border border-border-default mb-xl">
              <h3 className="font-sora text-sm font-bold text-on-surface mb-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Select Evaluation Model
              </h3>
              <p className="font-dm-sans text-xs text-on-surface-muted mb-md">
                Choose which model analyzes your responses and source materials.
              </p>

              <div className="flex flex-wrap items-center gap-md">
                {/* Model Dropdown */}
                <div className="relative flex-1 min-w-[220px]" ref={modelMenuRef}>
                  <Tooltip label={aiUnavailable ? "Add an AI provider key in Vercel project settings to enable" : "Choose evaluation model"} className="flex w-full">
                  <button
                    ref={modelBtnRef}
                    type="button"
                    onClick={() => setModelMenuOpen((v) => !v)}
                    disabled={aiUnavailable}
                    className="w-full flex items-center justify-between px-md py-sm bg-surface border border-border-default rounded-lg font-sora text-xs text-on-surface hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {aiUnavailable ? "No AI models available" : ((models.find((m) => m.id === selectedModel && m.provider === selectedProvider) || models.find((m) => m.id === selectedModel))?.label || selectedModel)}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-on-surface-muted ml-2 transition-transform ${
                        modelMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  </Tooltip>

                  {modelMenuOpen && (
                    <div className="absolute bottom-full mb-1 left-0 bg-surface border border-border-default rounded-lg shadow-2xl z-50 py-xs min-w-[260px] max-h-[380px] overflow-y-auto">
                      {(() => {
                        return (
                          <>
                            {deepseekModels.length > 0 && (
                              <>
                                <SectionHeader label="DeepSeek" dotColor="#b8c3ff" />
                                {deepseekModels.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}

                            {geminiModels.length > 0 && (
                              <>
                                <SectionHeader label="Gemini" dotColor="#47e175" />
                                {geminiModels.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}

                            {groqModels.length > 0 && (
                              <>
                                <SectionHeader label="Groq" dotColor="#fde047" />
                                {groqModels.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}

                            {cerebrasModels.length > 0 && (
                              <>
                                <SectionHeader label="Cerebras" dotColor="#a78bfa" />
                                {cerebrasModels.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}
                            {straitlyModels.length > 0 && (
                              <>
                                <SectionHeader label="Straightly" dotColor="#06B6D4" />
                                {straitlyModels.map((m) => (
                                  <button
                                    key={`${m.provider}-${m.id}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setSelectedProvider(m.provider);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel && m.provider === selectedProvider ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}

                            {freeOR.length > 0 && (
                              <>
                                <SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />
                                {freeOR.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    <span className="truncate mr-sm">{m.label}</span>
                                    <span className="text-[9px] text-accent-orange font-bold flex-shrink-0">
                                      FREE
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}

                            {paidOR.length > 0 && (
                              <>
                                <SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />
                                {paidOR.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      setModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${
                                      m.id === selectedModel ? "text-brand font-bold" : "text-on-surface"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {aiUnavailable && (
              <div className="bg-surface-container-low border border-border-default rounded-xl p-md flex items-start gap-sm text-xs font-dm-sans text-on-surface-muted">
                <span aria-hidden="true">🔌</span>
                <span>AI evaluation is off: no provider key is configured. Add one (e.g. <code>OPENROUTER_API_KEY</code>) in Vercel project settings and redeploy to enable grading. Your answers above are safe; copy the external prompt to grade them elsewhere in the meantime.</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-md pt-xl border-t border-border-default/40">
              <Button
                variant="outline"
                onClick={handleCopyPrompt}
                className="gap-2 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPrompt ? "Prompt Copied!" : "Copy External Prompt"}</span>
              </Button>

              <Tooltip label={aiUnavailable ? "Add an AI provider key in Vercel project settings to enable" : "Submit answers for AI grading"} align="end">
              <Button
                variant="primary"
                onClick={() => executeEvaluation(answers)}
                disabled={isEvaluating || aiUnavailable}
                className="gap-2 bg-brand-green text-[#0a0e14] hover:bg-brand-green/90 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Grading Responses...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit &amp; Evaluate</span>
                  </>
                )}
              </Button>
              </Tooltip>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE: EVALUATION (LIVE STREAMING OR STORED REPORT) */}
        {/* ========================================================= */}
        {viewMode === "evaluation" && (
          <div className="space-y-xl">
            {/* Auto Submitted Banner */}
            {autoSubmittedNotice && (
              <div className="bg-accent-orange/15 border border-accent-orange/40 rounded-xl p-md flex items-center gap-sm text-xs font-sora text-accent-orange">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Timer expired on the final question. Your test was automatically submitted for evaluation.</span>
              </div>
            )}

            {/* Header Card */}
            <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl shadow-xl flex flex-wrap items-center justify-between gap-md">
              <div>
                <div className="flex items-center gap-sm mb-1">
                  <Tag variant="primary">Diagnostic Evaluation</Tag>
                  <span className="font-sora text-xs text-on-surface-muted">
                    Evaluated by: <strong className="text-on-surface">{selectedModel}</strong>
                  </span>
                </div>
                <h2 className="font-sora text-headline-sm text-on-surface">
                  Assessment &amp; Feedback Report
                </h2>
              </div>

              <div className="flex items-center gap-sm">
                {/* Audio Debrief with Examiner Michael (if Son is online) */}
                {sonStatus.available && evaluationText && (
                  <button
                    type="button"
                    onClick={handlePlayEvalDebrief}
                    disabled={isEvalSynthesizing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-primary/40 font-sora text-xs text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {isEvalSynthesizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isEvalAudioPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isEvalAudioPlaying ? "Pause Audio Debrief" : `Listen to Examiner ${selectedVoice.name}`}</span>
                  </button>
                )}

                <Button variant="outline" onClick={handleResetTest} className="text-xs gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Test</span>
                </Button>
              </div>
            </div>

            {/* Evaluation Loading State */}
            {isEvaluating && !evaluationText && !evaluationError && (
              <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl text-center space-y-lg">
                <div className="inline-flex p-4 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="max-w-md mx-auto space-y-xs">
                  <h3 className="font-sora text-lg font-bold text-on-surface">
                    Grading In Progress...
                  </h3>
                  <p className="font-dm-sans text-sm text-on-surface-muted leading-relaxed">
                    Analyzing your responses with <strong className="text-on-surface">{selectedModel}</strong> against source rubrics and criteria.
                  </p>
                  {reasoningText && (
                    <div className="mt-md p-md rounded-xl bg-surface border border-border-default/60 text-left">
                      <div className="flex items-center gap-2 text-xs font-sora text-primary font-semibold mb-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        <span>Model Reasoning &amp; Analysis</span>
                      </div>
                      <p className="font-mono text-xs text-on-surface-muted line-clamp-3">
                        {reasoningText.slice(-300)}
                      </p>
                    </div>
                  )}
                </div>
                {/* Skeleton placeholders */}
                <div className="max-w-xl mx-auto space-y-sm pt-sm">
                  <div className="h-4 bg-surface rounded-md animate-pulse w-3/4 mx-auto" />
                  <div className="h-4 bg-surface rounded-md animate-pulse w-5/6 mx-auto" />
                  <div className="h-4 bg-surface rounded-md animate-pulse w-2/3 mx-auto" />
                </div>
              </div>
            )}

            {/* Evaluation Streaming State Indicator */}
            {isEvaluating && evaluationText && (
              <div className="p-sm px-md rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-sora flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Streaming diagnostic evaluation from <strong>{selectedModel}</strong>...</span>
                </div>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            )}

            {/* Evaluation Error Banner */}
            {evaluationError && (
              <div className="bg-error/15 border border-error/40 rounded-xl p-lg text-xs font-sora text-error">
                <div className="flex items-center gap-sm mb-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">Evaluation Request Failed</span>
                </div>
                <p className="font-dm-sans mb-md text-sm">{evaluationError}</p>
                <div className="flex flex-wrap items-center gap-sm">
                  <Button variant="primary" onClick={() => executeEvaluation(answers)} className="text-xs">
                    Retry Evaluation
                  </Button>
                  <Button variant="outline" onClick={handleCopyPrompt} className="text-xs border-error/50 text-error hover:bg-error/10">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy Prompt</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Empty Result Fallback */}
            {!isEvaluating && !evaluationText && !evaluationError && (
              <div className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl text-center space-y-md">
                <AlertCircle className="w-8 h-8 text-on-surface-muted mx-auto" />
                <h3 className="font-sora text-base font-bold text-on-surface">No Evaluation Feedback Recorded</h3>
                <p className="font-dm-sans text-xs text-on-surface-muted max-w-md mx-auto">
                  An evaluation report has not been generated for this attempt yet. Submit your responses below to begin grading.
                </p>
                <Button variant="primary" onClick={() => executeEvaluation(answers)} className="gap-2 mx-auto">
                  <Send className="w-4 h-4" />
                  <span>Start Evaluation</span>
                </Button>
              </div>
            )}

            {/* Evaluation Report Markdown Body */}
            {evaluationText && (
              <div
                className="bg-surface-container-low border border-border-default rounded-2xl p-xl md:p-xxl shadow-xl"
                style={{ overflowAnchor: "none" }}
              >
                <MarkdownHtml
                  html={renderedEvaluationHtml}
                  className="prose font-dm-sans text-body-base text-on-surface leading-relaxed max-w-none prose-headings:font-sora prose-h1:text-headline-md prose-h2:text-headline-sm prose-h3:text-lg prose-code:text-primary"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* SOURCE MATERIALS SLIDE-OVER DRAWER */}
      {/* ========================================================= */}
      {isSourceDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSourceDrawerOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-surface border-l border-border-default h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            <div className="p-xl border-b border-border-default flex items-center justify-between">
              <div>
                <span className="font-sora text-metadata-tag text-primary uppercase tracking-widest block mb-1">
                  // REFERENCE MATERIALS
                </span>
                <h3 className="font-sora text-headline-sm text-on-surface">Test Source Texts</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSourceDrawerOpen(false)}
                className="p-2 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Tabs */}
            {test.sources.length > 1 && (
              <div className="flex border-b border-border-default px-xl gap-md overflow-x-auto">
                {test.sources.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSourceIndex(idx)}
                    className={`py-md font-sora text-xs whitespace-nowrap border-b-2 transition-colors ${
                      activeSourceIndex === idx
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    {src.title}
                  </button>
                ))}
              </div>
            )}

            {/* Source Content */}
            <div className="flex-1 overflow-y-auto p-xl font-dm-sans text-body-base leading-relaxed">
              {(() => {
                const currentSource = test.sources[activeSourceIndex];
                if (!currentSource) return null;

                if (currentSource.type === "markdown") {
                  return (
                    <MarkdownHtml
                      html={mdBlock(currentSource.content)}
                      className="prose prose-invert max-w-none prose-headings:font-sora"
                    />
                  );
                }

                if (currentSource.type === "link") {
                  return (
                    <div className="space-y-lg">
                      <div className="p-lg rounded-xl bg-surface-container border border-border-default">
                        <h4 className="font-sora text-sm font-bold text-on-surface mb-xs">
                          {currentSource.title}
                        </h4>
                        {currentSource.description && (
                          <p className="font-dm-sans text-sm text-on-surface-muted mb-md">
                            {currentSource.description}
                          </p>
                        )}
                        <a
                          href={currentSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-sora text-primary hover:underline font-semibold"
                        >
                          <span>Open external link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
