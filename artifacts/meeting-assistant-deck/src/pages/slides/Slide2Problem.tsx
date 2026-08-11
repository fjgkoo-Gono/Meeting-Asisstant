export default function Slide2Problem() {
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

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", width: "90vw", alignItems: "center", gap: "6vw" }}>
        {/* Left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3vh" }}>
          <div style={{ display: "inline-block", padding: "0.5vh 1.2vw", backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.4vw", color: "#F87171", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start" }}>
            El Problema
          </div>
          <h2 style={{ fontSize: "3.8vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Las reuniones<br />
            <span style={{ color: "rgba(255,255,255,0.45)" }}>se pierden en el caos.</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "2vh", marginTop: "1vh" }}>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.4vh", width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#F87171", flexShrink: 0, marginLeft: "0.2vw" }} />
              <div>
                <div style={{ fontSize: "1.3vw", fontWeight: 600, marginBottom: "0.3vh" }}>Las notas de reuniones se pierden o quedan desorganizadas</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.4vh", width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#F87171", flexShrink: 0, marginLeft: "0.2vw" }} />
              <div>
                <div style={{ fontSize: "1.3vw", fontWeight: 600, marginBottom: "0.3vh" }}>Los action items nunca tienen seguimiento claro</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.4vh", width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#F87171", flexShrink: 0, marginLeft: "0.2vw" }} />
              <div>
                <div style={{ fontSize: "1.3vw", fontWeight: 600, marginBottom: "0.3vh" }}>Los materiales (PDFs, imágenes) están dispersos en múltiples apps</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
              <div style={{ marginTop: "0.4vh", width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#F87171", flexShrink: 0, marginLeft: "0.2vw" }} />
              <div>
                <div style={{ fontSize: "1.3vw", fontWeight: 600, marginBottom: "0.3vh" }}>No hay forma rápida de consultar lo que se habló semanas atrás</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — UI mockup showing chaos */}
        <div style={{ flex: "0 0 38vw", height: "58vh", backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden", boxShadow: "0 2vh 5vh rgba(0,0,0,0.5)" }}>
          {/* Window chrome */}
          <div style={{ padding: "1.2vw 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.5vw", backgroundColor: "#0E1120" }}>
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FF5F56" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#27C93F" }} />
            <div style={{ marginLeft: "1vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)" }}>reuniones-notas-final-v3-FINAL.docx</div>
          </div>
          {/* Mock messy content */}
          <div style={{ padding: "2vw", display: "flex", flexDirection: "column", gap: "1.8vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "rgba(239,68,68,0.15)", borderRadius: "0.4vw", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4vh", flex: 1 }}>
                <div style={{ height: "0.8vw", width: "70%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "0.2vw" }} />
                <div style={{ height: "0.6vw", width: "50%", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "0.2vw" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "rgba(251,191,36,0.12)", borderRadius: "0.4vw", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4vh", flex: 1 }}>
                <div style={{ height: "0.8vw", width: "85%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "0.2vw" }} />
                <div style={{ height: "0.6vw", width: "40%", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "0.2vw" }} />
              </div>
            </div>
            <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.05)", margin: "0.5vh 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ height: "0.7vw", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.2vw" }} />
              <div style={{ height: "0.7vw", width: "88%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.2vw" }} />
              <div style={{ height: "0.7vw", width: "75%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.2vw" }} />
              <div style={{ height: "0.7vw", width: "92%", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "0.2vw" }} />
            </div>
            <div style={{ marginTop: "1vh", padding: "1.2vh 1vw", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "0.5vw", fontSize: "0.9vw", color: "rgba(239,68,68,0.8)" }}>
              Sin seguimiento · Sin contexto · Sin búsqueda
            </div>
            <div style={{ display: "flex", gap: "0.8vw", marginTop: "0.5vh" }}>
              <div style={{ height: "0.7vw", flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "0.2vw" }} />
              <div style={{ height: "0.7vw", flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "0.2vw" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>02 / 09</div>
    </div>
  );
}
