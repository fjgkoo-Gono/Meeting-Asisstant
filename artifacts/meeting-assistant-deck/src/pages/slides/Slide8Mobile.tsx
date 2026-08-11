export default function Slide8Mobile() {
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
      <div style={{ position: "absolute", top: "-10vh", right: "-5vw", width: "50vw", height: "50vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.06, filter: "blur(10vw)" }} />
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
            App Móvil
          </div>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            App móvil nativa<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>iOS y Android.</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh", marginTop: "0.5vh" }}>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Mismas funcionalidades que web, optimizadas para táctil</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Swipe para eliminar, pull-to-refresh</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Teclado inteligente sin tapar campos de texto</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Confirmaciones antes de eliminar datos</div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.5vh", flexShrink: 0 }}>
                <svg width="1.2vw" height="1.2vw" viewBox="0 0 24 24" fill="none" stroke="#7C6BF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Soporte iOS y Android con Expo</div>
            </div>
          </div>
          <div style={{ marginTop: "1vh", display: "flex", gap: "1vw" }}>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(124,107,240,0.1)", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#9B8FF5", fontWeight: 500 }}>Expo</div>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(124,107,240,0.1)", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#9B8FF5", fontWeight: 500 }}>React Native</div>
            <div style={{ padding: "0.6vh 1.2vw", backgroundColor: "rgba(124,107,240,0.1)", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "0.4vw", fontSize: "0.95vw", color: "#9B8FF5", fontWeight: 500 }}>iOS & Android</div>
          </div>
        </div>

        {/* Right — Phone mockup */}
        <div style={{ flex: "0 0 22vw", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "18vw", height: "62vh", backgroundColor: "#0E1120", border: "2px solid rgba(255,255,255,0.12)", borderRadius: "3vw", overflow: "hidden", boxShadow: "0 3vh 6vh rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", position: "relative" }}>
            {/* Status bar */}
            <div style={{ padding: "1.5vh 1.5vw 0.8vh", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0C0F1A" }}>
              <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>9:41</div>
              <div style={{ display: "flex", gap: "0.4vw", alignItems: "center" }}>
                <div style={{ width: "1vw", height: "0.5vw", backgroundColor: "rgba(255,255,255,0.5)", borderRadius: "0.1vw" }} />
                <div style={{ width: "0.6vw", height: "0.6vw", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.5)" }} />
              </div>
            </div>
            {/* App header */}
            <div style={{ padding: "1vh 1.5vw", backgroundColor: "#0C0F1A", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 800, letterSpacing: "-0.02em" }}>Proyectos</div>
              <div style={{ width: "1.8vw", height: "1.8vw", backgroundColor: "#4F7FFF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "1vw", fontWeight: 700, color: "#FFF", lineHeight: 1 }}>+</div>
              </div>
            </div>
            {/* Search bar */}
            <div style={{ padding: "0.8vh 1.2vw", backgroundColor: "#0C0F1A" }}>
              <div style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6vw", padding: "0.7vh 1vw", fontSize: "0.85vw", color: "rgba(255,255,255,0.3)" }}>Buscar proyectos...</div>
            </div>
            {/* Project cards */}
            <div style={{ flex: 1, padding: "0.5vh 1.2vw", display: "flex", flexDirection: "column", gap: "0.8vh", backgroundColor: "#0C0F1A" }}>
              <div style={{ backgroundColor: "#131726", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "0.8vw", padding: "1.2vh 1vw" }}>
                <div style={{ fontSize: "0.95vw", fontWeight: 700, marginBottom: "0.4vh" }}>Q2 Planning</div>
                <div style={{ fontSize: "0.75vw", color: "rgba(255,255,255,0.4)" }}>4 reuniones · 12 materiales</div>
                <div style={{ marginTop: "0.8vh", height: "2px", backgroundColor: "#4F7FFF", borderRadius: "1px", width: "40%" }} />
              </div>
              <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.8vw", padding: "1.2vh 1vw" }}>
                <div style={{ fontSize: "0.95vw", fontWeight: 700, marginBottom: "0.4vh" }}>Design Sprint</div>
                <div style={{ fontSize: "0.75vw", color: "rgba(255,255,255,0.4)" }}>2 reuniones · 5 materiales</div>
                <div style={{ marginTop: "0.8vh", height: "2px", backgroundColor: "#7C6BF0", borderRadius: "1px", width: "25%" }} />
              </div>
              <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.8vw", padding: "1.2vh 1vw" }}>
                <div style={{ fontSize: "0.95vw", fontWeight: 700, marginBottom: "0.4vh" }}>Roadmap 2026</div>
                <div style={{ fontSize: "0.75vw", color: "rgba(255,255,255,0.4)" }}>6 reuniones · 8 materiales</div>
                <div style={{ marginTop: "0.8vh", height: "2px", backgroundColor: "#4F7FFF", borderRadius: "1px", width: "60%" }} />
              </div>
            </div>
            {/* Tab bar */}
            <div style={{ padding: "1vh 0", backgroundColor: "#0E1120", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3vh" }}>
                <div style={{ width: "1.2vw", height: "1.2vw", backgroundColor: "#4F7FFF", borderRadius: "0.2vw" }} />
                <div style={{ fontSize: "0.6vw", color: "#4F7FFF", fontWeight: 600 }}>Proyectos</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3vh" }}>
                <div style={{ width: "1.2vw", height: "1.2vw", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "0.2vw" }} />
                <div style={{ fontSize: "0.6vw", color: "rgba(255,255,255,0.3)" }}>Stats</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>08 / 09</div>
    </div>
  );
}
