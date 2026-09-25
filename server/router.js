const HF_URL = "https://router.huggingface.co/v1/chat/completions";

const DEFAULT_MODELS = {
  instant: process.env.HF_MODEL_INSTANT || "openbmb/MiniCPM5-2B",
  easy: process.env.HF_MODEL_EASY || "google/gemma-3-4b-it",
  medium: process.env.HF_MODEL_MEDIUM || "Qwen/Qwen3.8-27B",
  high: process.env.HF_MODEL_HIGH || "Qwen/Qwen3.8-Flash-Next",
  research: process.env.HF_MODEL_RESEARCH || "deepseek-ai/DeepSeek-V4.1-Flash",
};

const FALLBACKS = {
  instant: ["instant"],
  easy: ["easy", "instant"],
  medium: ["medium", "easy", "instant"],
  high: ["high", "medium", "easy", "instant"],
  research: ["research", "high", "medium", "easy", "instant"],
};

const COMPLEXITY_PATTERNS = {
  research: /\b(research|sources?|papers?|literature|deep dive|investigate|compare studies|evidence|citations?)\b/i,
  high: /\b(architect|complex reasoning|analy[sz]e deeply|proof|optimi[sz]e|security review|system design|long context)\b/i,
  medium: /\b(code|coding|program|debug|python|javascript|typescript|react|sql|algorithm|math|equation|homework)\b/i,
};

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-24)
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 12000),
    }));
}

export function chooseAutoMode(messages) {
  const latest = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const allText = messages.map((m) => m.content).join("\n");

  if (COMPLEXITY_PATTERNS.research.test(latest) || allText.length > 18000) return "research";
  if (COMPLEXITY_PATTERNS.high.test(latest) || latest.length > 3500) return "high";
  if (COMPLEXITY_PATTERNS.medium.test(latest) || latest.length > 900) return "medium";
  if (latest.length < 140 && !/[?].*[?]/.test(latest)) return "instant";
  return "easy";
}

function systemPrompt(mode, model) {
  return [
    "You are DVILR, a capable AI assistant.",
    "Be accurate, helpful, natural, and concise unless the user asks for detail.",
    "Do not pretend to have performed actions you did not perform.",
    "If you are uncertain, say so instead of inventing facts.",
    "For coding, give practical working examples when useful.",
    `Current DVILR mode: ${mode}. Underlying open model: ${model}.`,
    "Only mention the underlying model when the user explicitly asks about it."
  ].join(" ");
}

async function callModel({ token, model, mode, messages }) {
  const response = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `${model}:fastest`,
      messages: [
        { role: "system", content: systemPrompt(mode, model) },
        ...messages,
      ],
      temperature: mode === "research" ? 0.35 : 0.65,
      max_tokens: mode === "instant" ? 600 : mode === "easy" ? 900 : 1400,
      stream: false,
    }),
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw || "Unknown provider response" };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      `Hugging Face returned HTTP ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    throw error;
  }

  const text =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.generated_text;

  if (!text || typeof text !== "string") {
    throw new Error("The inference provider returned no assistant text.");
  }

  return text.trim();
}

export async function runChat(payload = {}) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    const error = new Error("HF_TOKEN is not configured on the server.");
    error.status = 500;
    throw error;
  }

  const messages = normalizeMessages(payload.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    const error = new Error("A user message is required.");
    error.status = 400;
    throw error;
  }

  const requested = ["auto", "instant", "easy", "medium", "high", "research"].includes(payload.mode)
    ? payload.mode
    : "auto";

  const mode = requested === "auto" ? chooseAutoMode(messages) : requested;
  const attempts = FALLBACKS[mode] || FALLBACKS.easy;
  const errors = [];

  for (const candidateMode of attempts) {
    const model = DEFAULT_MODELS[candidateMode];
    try {
      const text = await callModel({
        token,
        model,
        mode: candidateMode,
        messages,
      });

      return {
        text,
        requestedMode: requested,
        mode: candidateMode,
        model,
        fallbackUsed: candidateMode !== mode,
      };
    } catch (error) {
      errors.push({
        mode: candidateMode,
        model,
        message: error?.message || "Unknown inference error",
      });
    }
  }

  const finalError = new Error(
    "No configured model was available through Hugging Face Inference Providers."
  );
  finalError.status = 502;
  finalError.details = errors;
  throw finalError;
}
