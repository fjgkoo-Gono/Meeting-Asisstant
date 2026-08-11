export default function Slide5Architecture() {
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
      <div style={{ position: "absolute", top: "10vh", left: "20vw", width: "40vw", height: "40vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.06, filter: "blur(12vw)" }} />
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", width: "35vw", height: "35vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(10vw)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "84vw" }}>
        <div style={{ textAlign: "center", marginBottom: "4.5vh" }}>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Arquitectura técnica
          </h2>
        </div>

        {/* Three-layer architecture */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.4vw", width: "100%" }}>
          {/* Layer 1 — Frontend */}
          <div style={{ backgroundColor: "rgba(79,127,255,0.06)", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.8vw", padding: "2vh 2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#7BA7FF", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0, width: "8vw" }}>Frontend</div>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(79,127,255,0.2)" }} />
            <div style={{ display: "flex", gap: "1.5vw" }}>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                React + Vite <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>PWA</span>
              </div>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Expo <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>iOS & Android</span>
              </div>
            </div>
          </div>

          {/* Layer 2 — API */}
          <div style={{ backgroundColor: "rgba(124,107,240,0.06)", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "0.8vw", padding: "2vh 2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#9B8FF5", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0, width: "8vw" }}>API Layer</div>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(124,107,240,0.2)" }} />
            <div style={{ display: "flex", gap: "1.5vw" }}>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(124,107,240,0.12)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Express + Drizzle ORM <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>PostgreSQL</span>
              </div>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(124,107,240,0.12)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Python FastAPI <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>procesamiento IA</span>
              </div>
            </div>
          </div>

          {/* Layer 3 — Services */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.8vw", padding: "2vh 2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0, width: "8vw" }}>Servicios</div>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
            <div style={{ display: "flex", gap: "1.5vw" }}>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Anthropic Claude <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>IA</span>
              </div>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Supabase <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>PostgreSQL</span>
              </div>
              <div style={{ padding: "0.8vh 1.4vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600 }}>
                Cloudinary <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.5)", fontSize: "0.95vw" }}>archivos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stat bar */}
        <div style={{ display: "flex", gap: "3vw", marginTop: "4vh", paddingTop: "3vh", borderTop: "1px solid rgba(255,255,255,0.07)", width: "100%", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#4F7FFF", lineHeight: 1 }}>7</div>
            <div style={{ fontSize: "1vw", color: "rgba(255,255,255,0.4)", marginTop: "0.5vh" }}>tecnologías integradas</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#7C6BF0", lineHeight: 1 }}>3</div>
            <div style={{ fontSize: "1vw", color: "rgba(255,255,255,0.4)", marginTop: "0.5vh" }}>plataformas</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#4F7FFF", lineHeight: 1 }}>1</div>
            <div style={{ fontSize: "1vw", color: "rgba(255,255,255,0.4)", marginTop: "0.5vh" }}>codebase monorepo</div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>05 / 09</div>
    </div>
  );
}
