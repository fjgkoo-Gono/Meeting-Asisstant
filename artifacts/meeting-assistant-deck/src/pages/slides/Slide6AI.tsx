export default function Slide6AI() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#0C0F1A",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        color: "#FFFFFF",
      }}
    >
      <div style={{ position: "absolute", top: "-10vh", right: "-5vw", width: "50vw", height: "50vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.07, filter: "blur(10vw)" }} />
      <div style={{ position: "absolute", bottom: "-20vh", left: "-10vw", width: "55vw", height: "55vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(12vw)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", width: "88vw", alignItems: "center", gap: "5vw" }}>
        {/* Left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div style={{ display: "inline-block", padding: "0.5vh 1.2vw", backgroundColor: "rgba(124,107,240,0.12)", border: "1px solid rgba(124,107,240,0.3)", borderRadius: "0.4vw", color: "#9B8FF5", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start" }}>
            Anthropic Claude
          </div>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            IA integrada<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>de extremo a extremo.</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh", marginTop: "0.5vh" }}>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 600 }}>Genera resúmenes automáticos de reuniones</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 600 }}>Extrae action items del texto y documentos</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 600 }}>Responde preguntas sobre los materiales subidos</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 600 }}>Analiza imágenes adjuntas a la reunión</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 600 }}>Todo vía Anthropic Claude — sin configuración adicional</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Chat terminal mockup */}
        <div style={{ flex: "0 0 42vw", height: "62vh", backgroundColor: "#0E1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden", boxShadow: "0 2vh 5vh rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
          {/* Terminal header */}
          <div style={{ padding: "1.2vw 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.5vw", backgroundColor: "#131726" }}>
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FF5F56" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#27C93F" }} />
            <div style={{ marginLeft: "1vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)" }}>Chat IA · Reunión Q2 Planning</div>
          </div>
          {/* Chat messages */}
          <div style={{ flex: 1, padding: "2vw", display: "flex", flexDirection: "column", gap: "2vh", overflowY: "hidden" }}>
            {/* User message */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ backgroundColor: "rgba(79,127,255,0.15)", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.8vw 0.8vw 0 0.8vw", padding: "1.2vh 1.4vw", maxWidth: "75%", fontSize: "1vw", color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                ¿Cuáles fueron los action items de la reunión del martes?
              </div>
            </div>
            {/* AI response */}
            <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", backgroundColor: "rgba(124,107,240,0.2)", border: "1px solid rgba(124,107,240,0.3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#7C6BF0" }} />
              </div>
              <div style={{ backgroundColor: "#1A1F35", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.8vw 0.8vw 0.8vw 0", padding: "1.5vh 1.4vw", maxWidth: "80%", fontSize: "1vw", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                <div style={{ color: "#9B8FF5", fontWeight: 600, marginBottom: "0.8vh", fontSize: "0.95vw" }}>Claude</div>
                Basándome en el documento adjunto, los action items son:
                <div style={{ marginTop: "1vh", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
                  <div style={{ display: "flex", gap: "0.6vw" }}>
                    <span style={{ color: "#4F7FFF" }}>1.</span>
                    <span>Revisar propuesta de presupuesto Q3 — Juan</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6vw" }}>
                    <span style={{ color: "#4F7FFF" }}>2.</span>
                    <span>Enviar informe de avance al cliente — Maria</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6vw" }}>
                    <span style={{ color: "#4F7FFF" }}>3.</span>
                    <span>Programar demo para el viernes — Equipo</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Input area */}
            <div style={{ marginTop: "auto", padding: "1.2vh 1.4vw", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6vw", fontSize: "1vw", color: "rgba(255,255,255,0.25)" }}>
              Escribe una pregunta sobre esta reunión...
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>06 / 09</div>
    </div>
  );
}
