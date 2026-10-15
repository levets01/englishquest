
import { useState } from "react";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!question.trim() || loading) return;

    setLoading(true);
    setError("");
    setSql("");

    try {
      const response = await fetch(
        "http://127.0.0.1:3000/api/generate-sql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question.trim(),
          }),
        }
      );

      let data: { error?: string; sql?: string } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo generar la consulta."
        );
      }

      if (typeof data.sql !== "string" || !data.sql.trim()) {
        throw new Error("El modelo no devolvió una consulta válida.");
      }

      setSql(data.sql.trim());
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "No se pudo conectar con el servidor. Comprueba que el backend esté activo en http://127.0.0.1:3000."
          : err instanceof Error
            ? err.message
            : "No se pudo conectar con el servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("No se pudo copiar. Selecciona el SQL y cópialo manualmente.");
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
              <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </svg>
          </span>
          <span>SQL Assistant</span>
        </a>

        <span className="database-label">MySQL</span>
      </header>

      <section className="workspace">
        <div className="intro">
          <span className="eyebrow">TU ASISTENTE SQL</span>

          <h1>
            Habla en español.
            <br />
            Obtén tu consulta SQL.
          </h1>

          <p>
            Describe los datos que necesitas y convierte tus ideas
            en consultas MySQL, sin tener que escribir código manualmente.
          </p>
        </div>

        <form className="query-form" onSubmit={handleSubmit}>
          <label htmlFor="question">
            ¿Qué datos necesitas consultar?
          </label>

          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ej. Muéstrame los clientes registrados este mes..."
            rows={4}
            maxLength={2000}
            disabled={loading}
          />

          <div className="form-footer">
            <span>Lenguaje de destino: MySQL</span>

            <button
              type="submit"
              disabled={!question.trim() || loading}
            >
              {loading ? "Generando..." : "Generar SQL"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>

        {loading && (
          <p className="notice" role="status">
            La IA está preparando tu consulta. La primera respuesta
            puede tardar un poco.
          </p>
        )}

        {error && (
          <div className="result-card" role="alert">
            <p className="error-message">{error}</p>
          </div>
        )}

        {sql && (
          <section className="result-card" aria-live="polite">
            <div className="result-header">
              <h2>Consulta MySQL generada</h2>

              <button
                className="copy-button"
                type="button"
                onClick={copySql}
              >
                {copied ? "Copiado" : "Copiar SQL"}
              </button>
            </div>

            <pre className="sql-output">
              <code>{sql}</code>
            </pre>

            <p className="notice">
              Consulta generada por IA. No se ha ejecutado en ninguna
              base de datos. Revisa el código antes de utilizarlo.
            </p>
          </section>
        )}

        {!sql && !loading && !error && (
          <section className="result-card result-empty" aria-live="polite">
            <h2>Resultado</h2>
            <p>La consulta generada aparecerá aquí en formato SQL listo para revisar.</p>
          </section>
        )}

        <div className="examples">
          <h2>Prueba con un ejemplo</h2>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setQuestion(
                "Muéstrame todos los clientes registrados. Usa la tabla clientes."
              )
            }
          >
            Consultar clientes
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setQuestion(
                "Muéstrame los productos con precio mayor a 50000. Usa la tabla productos y la columna precio."
              )
            }
          >
            Filtrar productos
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setQuestion(
                "Cuenta cuántos pedidos hay en total. Usa la tabla pedidos."
              )
            }
          >
            Contar pedidos
          </button>
        </div>

        <p className="notice">
          El agente genera texto SQL, pero nunca ejecuta consultas
          contra una base de datos.
        </p>
      </section>
    </main>
  );
}

export default App;
