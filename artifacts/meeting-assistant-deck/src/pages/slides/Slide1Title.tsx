export default function Slide1Title() {
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
      {/* Background blobs */}
      <div style={{ position: "absolute", top: "-20vh", right: "-10vw", width: "50vw", height: "50vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.06, filter: "blur(8vw)" }} />
      <div style={{ position: "absolute", bottom: "-30vh", left: "-15vw", width: "60vw", height: "60vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.06, filter: "blur(10vw)" }} />

      {/* Grid overlay */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      {/* Center content */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "70vw" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6vw", padding: "0.6vh 1.4vw", backgroundColor: "rgba(124, 107, 240, 0.12)", border: "1px solid rgba(124, 107, 240, 0.3)", borderRadius: "2vw", color: "#9B8FF5", fontSize: "1vw", fontWeight: 500, marginBottom: "4vh", letterSpacing: "0.04em" }}>
          <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#7C6BF0" }} />
          Asistente de Reuniones con Inteligencia Artificial
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "7vw", fontWeight: 900, margin: "0 0 2.5vh 0", lineHeight: 1.05, letterSpacing: "-0.04em" }}>
          Meeting Assistant
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "rgba(255,255,255,0.65)", margin: "0 0 6vh 0", lineHeight: 1.55, maxWidth: "55vw", textWrap: "balance" }}>
          Gestiona reuniones con IA. Organiza proyectos, sube materiales y obtén resúmenes, action items y respuestas — todo en web y móvil.
        </p>

        {/* Tech pills */}
        <div style={{ display: "flex", gap: "1.2vw", opacity: 0.85 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5vw", padding: "0.9vh 1.6vw", backgroundColor: "rgba(79, 127, 255, 0.1)", border: "1px solid rgba(79, 127, 255, 0.25)", borderRadius: "0.5vw", fontSize: "1vw", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#4F7FFF" }} />
            Web App
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5vw", padding: "0.9vh 1.6vw", backgroundColor: "rgba(124, 107, 240, 0.1)", border: "1px solid rgba(124, 107, 240, 0.25)", borderRadius: "0.5vw", fontSize: "1vw", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#7C6BF0" }} />
            App Móvil
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5vw", padding: "0.9vh 1.6vw", backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5vw", fontSize: "1vw", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.6)" }} />
            Claude AI
          </div>
        </div>
      </div>

      {/* Decorative UI card — bottom right */}
      <div style={{ position: "absolute", bottom: "8vh", right: "-4vw", width: "22vw", height: "14vh", backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", padding: "1.5vw", boxShadow: "0 2vh 4vh rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: "1.2vh", transform: "rotate(-5deg)", opacity: 0.8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", backgroundColor: "#7C6BF0" }} />
          <div style={{ height: "0.8vw", width: "9vw", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "0.2vw" }} />
        </div>
        <div style={{ height: "0.8vw", width: "14vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.2vw" }} />
        <div style={{ height: "0.8vw", width: "11vw", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "0.2vw" }} />
        <div style={{ height: "0.8vw", width: "12.5vw", backgroundColor: "rgba(79, 127, 255, 0.15)", borderRadius: "0.2vw" }} />
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
    </div>
  );
}
