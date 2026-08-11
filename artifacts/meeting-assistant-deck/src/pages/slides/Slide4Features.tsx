export default function Slide4Features() {
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
      <div style={{ position: "absolute", top: "-10vh", right: "0vw", width: "45vw", height: "45vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(10vw)" }} />
      <div style={{ position: "absolute", bottom: "-20vh", left: "-10vw", width: "50vw", height: "50vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.05, filter: "blur(10vw)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "86vw" }}>
        <div style={{ textAlign: "center", marginBottom: "4.5vh" }}>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Funcionalidades clave
          </h2>
        </div>

        {/* Row 1 — 3 cards */}
        <div style={{ display: "flex", gap: "1.5vw", width: "100%", marginBottom: "1.5vw" }}>
          {/* Proyectos */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "1vw", padding: "2.5vh 1.8vw" }}>
            <div style={{ display: "inline-block", padding: "0.3vh 0.8vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.3vw", color: "#7BA7FF", fontSize: "0.8vw", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Proyectos</div>
            <div style={{ fontSize: "1.25vw", fontWeight: 600, marginBottom: "0.8vh" }}>Agrupa reuniones por cliente, equipo o tema</div>
            <div style={{ fontSize: "1.05vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontWeight: 300 }}>Organización jerárquica con búsqueda en tiempo real</div>
          </div>
          {/* Reuniones */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "1vw", padding: "2.5vh 1.8vw" }}>
            <div style={{ display: "inline-block", padding: "0.3vh 0.8vw", backgroundColor: "rgba(124,107,240,0.12)", borderRadius: "0.3vw", color: "#9B8FF5", fontSize: "0.8vw", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Reuniones</div>
            <div style={{ fontSize: "1.25vw", fontWeight: 600, marginBottom: "0.8vh" }}>Crea, edita y archiva con fecha y descripción</div>
            <div style={{ fontSize: "1.05vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontWeight: 300 }}>Historial completo de todas las sesiones del proyecto</div>
          </div>
          {/* Materiales */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "1vw", padding: "2.5vh 1.8vw" }}>
            <div style={{ display: "inline-block", padding: "0.3vh 0.8vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.3vw", color: "#7BA7FF", fontSize: "0.8vw", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Materiales</div>
            <div style={{ fontSize: "1.25vw", fontWeight: 600, marginBottom: "0.8vh" }}>Sube PDFs e imágenes por reunión</div>
            <div style={{ fontSize: "1.05vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontWeight: 300 }}>Procesados por IA y almacenados en Cloudinary</div>
          </div>
        </div>

        {/* Row 2 — 2 cards centered */}
        <div style={{ display: "flex", gap: "1.5vw", width: "68%" }}>
          {/* Chat IA */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(124,107,240,0.2)", borderRadius: "1vw", padding: "2.5vh 1.8vw", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #7C6BF0, #4F7FFF)" }} />
            <div style={{ display: "inline-block", padding: "0.3vh 0.8vw", backgroundColor: "rgba(124,107,240,0.12)", borderRadius: "0.3vw", color: "#9B8FF5", fontSize: "0.8vw", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Chat IA</div>
            <div style={{ fontSize: "1.25vw", fontWeight: 600, marginBottom: "0.8vh" }}>Pregunta en lenguaje natural sobre los materiales</div>
            <div style={{ fontSize: "1.05vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontWeight: 300 }}>Respuestas contextuales vía Anthropic Claude</div>
          </div>
          {/* Búsqueda */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "1vw", padding: "2.5vh 1.8vw", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #4F7FFF, #7C6BF0)" }} />
            <div style={{ display: "inline-block", padding: "0.3vh 0.8vw", backgroundColor: "rgba(79,127,255,0.12)", borderRadius: "0.3vw", color: "#7BA7FF", fontSize: "0.8vw", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Búsqueda</div>
            <div style={{ fontSize: "1.25vw", fontWeight: 600, marginBottom: "0.8vh" }}>Encuentra proyectos y reuniones al instante</div>
            <div style={{ fontSize: "1.05vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontWeight: 300 }}>Filtrado en tiempo real en web y en móvil</div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>04 / 09</div>
    </div>
  );
}
