export default function Slide7Web() {
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
      <div style={{ position: "absolute", top: "-20vh", right: "-10vw", width: "50vw", height: "50vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(8vw)" }} />
      <div style={{ position: "absolute", bottom: "-30vh", left: "-15vw", width: "60vw", height: "60vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.05, filter: "blur(10vw)" }} />
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
          <div style={{ display: "inline-block", padding: "0.5vh 1.2vw", backgroundColor: "rgba(79,127,255,0.12)", border: "1px solid rgba(79,127,255,0.3)", borderRadius: "0.4vw", color: "#7BA7FF", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start" }}>
            Web App
          </div>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Experiencia web<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>sin fricciones.</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh", marginTop: "0.5vh" }}>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Dashboard de proyectos con búsqueda en tiempo real</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Vista de reunión con lista de materiales procesados</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Chat integrado con historial de conversación</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Subida de archivos con progreso y validación</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Diseño responsivo y accesible</div>
            </div>
          </div>
          <div style={{ marginTop: "1vh", display: "flex", gap: "1vw" }}>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(79,127,255,0.1)", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#7BA7FF", fontWeight: 500 }}>React + Vite</div>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(79,127,255,0.1)", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#7BA7FF", fontWeight: 500 }}>TailwindCSS</div>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(79,127,255,0.1)", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#7BA7FF", fontWeight: 500 }}>PWA</div>
          </div>
        </div>

        {/* Right — browser mockup */}
        <div style={{ flex: "0 0 44vw", height: "62vh", backgroundColor: "#0E1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden", boxShadow: "0 2vh 5vh rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
          {/* Browser chrome */}
          <div style={{ padding: "1.2vw 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.5vw", backgroundColor: "#131726" }}>
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FF5F56" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#27C93F" }} />
            <div style={{ flex: 1, marginLeft: "1vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.3vw", padding: "0.4vh 1vw", fontSize: "0.85vw", color: "rgba(255,255,255,0.3)" }}>meeting-assistant.app / projects</div>
          </div>
          {/* App content */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Sidebar */}
            <div style={{ width: "12vw", borderRight: "1px solid rgba(255,255,255,0.05)", backgroundColor: "#0C0F1A", padding: "1.5vw 1vw", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.75vw", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Proyectos</div>
              <div style={{ padding: "0.8vh 0.8vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.3vw", fontSize: "0.85vw", color: "#7BA7FF", fontWeight: 500 }}>Q2 Planning</div>
              <div style={{ padding: "0.8vh 0.8vw", borderRadius: "0.3vw", fontSize: "0.85vw", color: "rgba(255,255,255,0.4)" }}>Design Sprint</div>
              <div style={{ padding: "0.8vh 0.8vw", borderRadius: "0.3vw", fontSize: "0.85vw", color: "rgba(255,255,255,0.4)" }}>Client Onboarding</div>
              <div style={{ padding: "0.8vh 0.8vw", borderRadius: "0.3vw", fontSize: "0.85vw", color: "rgba(255,255,255,0.4)" }}>Roadmap 2026</div>
            </div>
            {/* Main content */}
            <div style={{ flex: 1, padding: "1.5vw", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5vh" }}>
                <div style={{ fontSize: "1.1vw", fontWeight: 700 }}>Q2 Planning</div>
                <div style={{ padding: "0.4vh 1vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.3vw", fontSize: "0.8vw", color: "#7BA7FF" }}>+ Nueva reunión</div>
              </div>
              <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.05)" }} />
              <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.5vw", padding: "1.2vh 1.2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.95vw", fontWeight: 600 }}>Kickoff Semanal</div>
                  <div style={{ fontSize: "0.8vw", color: "rgba(255,255,255,0.4)", marginTop: "0.3vh" }}>Lun, 7 Ago 2026 · 3 materiales</div>
                </div>
                <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#27C93F" }} />
              </div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.5vw", padding: "1.2vh 1.2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.95vw", fontWeight: 600 }}>Review de Diseño</div>
                  <div style={{ fontSize: "0.8vw", color: "rgba(255,255,255,0.4)", marginTop: "0.3vh" }}>Jue, 3 Ago 2026 · 1 material</div>
                </div>
                <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#4F7FFF" }} />
              </div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.5vw", padding: "1.2vh 1.2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.95vw", fontWeight: 600 }}>Retrospectiva Q1</div>
                  <div style={{ fontSize: "0.8vw", color: "rgba(255,255,255,0.4)", marginTop: "0.3vh" }}>Mar, 1 Ago 2026 · 5 materiales</div>
                </div>
                <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#7C6BF0" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>07 / 09</div>
    </div>
  );
}
