import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const MODEL = process.env.MODEL || "phi3:latest";
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origen no permitido por CORS"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "16kb" }));

function buildPrompt(question) {
  return [
    "Eres un asistente que convierte preguntas en español en consultas SQL para MySQL.",
    "Responde únicamente con la consulta SQL, sin explicaciones, sin markdown y sin texto adicional.",
    "No ejecutes ni simules la ejecución; solo genera texto.",
    "Usa nombres de tablas y columnas razonables cuando no se indiquen.",
    "",
    "Pregunta:",
    question,
  ].join("\n");
}

function sanitizeSql(raw) {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  const codeBlock = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (codeBlock) text = codeBlock[1].trim();
  text = text.replace(/^```(?:sql)?\s*/i, "").replace(/```$/i, "").trim();
  return text;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "sql-assistant", model: MODEL });
});

app.post("/api/generate-sql", async (req, res) => {
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";

  if (!question || question.length > 2000) {
    return res.status(400).json({
      error: "La pregunta es obligatoria y debe tener hasta 2000 caracteres.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildPrompt(question),
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama respondió con estado ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const sql = sanitizeSql(data?.response);

    if (!sql) {
      throw new Error("El modelo no devolvió una consulta válida.");
    }

    res.json({ sql });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({
        error: "La generación tardó demasiado. Inténtalo de nuevo.",
      });
    }

    console.error("Error al generar SQL:", err?.message || err);
    res.status(502).json({
      error:
        "No se pudo generar la consulta. Verifica que Ollama esté disponible con phi3:latest.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((err, req, res, next) => {
  if (err?.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: "Origen no permitido." });
  }
  console.error("Error no controlado:", err?.message || err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor SQL Assistant escuchando en http://${HOST}:${PORT}`);
});
