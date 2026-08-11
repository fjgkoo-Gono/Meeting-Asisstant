export default function Slide3Solution() {
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
      <div style={{ position: "absolute", top: "10vh", left: "20vw", width: "40vw", height: "40vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.07, filter: "blur(12vw)" }} />
      <div style={{ position: "absolute", bottom: "5vh", right: "10vw", width: "45vw", height: "45vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(10vw)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "82vw" }}>
        {/* Title block */}
        <div style={{ textAlign: "center", marginBottom: "5vh" }}>
          <div style={{ display: "inline-block", padding: "0.5vh 1.2vw", backgroundColor: "rgba(79, 127, 255, 0.12)", border: "1px solid rgba(79, 127, 255, 0.3)", borderRadius: "0.4vw", color: "#7BA7FF", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2.5vh" }}>
            La Solución
          </div>
          <h2 style={{ fontSize: "3.8vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" }}>
            Todo centralizado en un solo lugar
          </h2>
          <p style={{ fontSize: "1.3vw", fontWeight: 300, color: "rgba(255,255,255,0.6)", margin: "2vh auto 0", lineHeight: 1.55, maxWidth: "48vw", textWrap: "balance" }}>
            Meeting Assistant centraliza todo en un solo lugar
          </p>
        </div>

        {/* Four cards 2×2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vw", width: "100%" }}>
          {/* Card 1 */}
          <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", padding: "2.5vh 2vw", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ width: "3vw", height: "3vw", backgroundColor: "rgba(79, 127, 255, 0.15)", borderRadius: "0.6vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "1.2vw", height: "1.2vw", backgroundColor: "#4F7FFF", borderRadius: "0.2vw" }} />
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, marginBottom: "0.8vh" }}>Proyectos</div>
              <div style={{ fontSize: "1.1vw", fontWeight: 300, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>Agrupa reuniones relacionadas por cliente, equipo o tema</div>
            </div>
          </div>
          {/* Card 2 */}
          <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", padding: "2.5vh 2vw", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ width: "3vw", height: "3vw", backgroundColor: "rgba(124, 107, 240, 0.15)", borderRadius: "0.6vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "1.4vw", height: "1vw", backgroundColor: "#7C6BF0", borderRadius: "0.2vw" }} />
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, marginBottom: "0.8vh" }}>Materiales adjuntos</div>
              <div style={{ fontSize: "1.1vw", fontWeight: 300, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>PDFs e imágenes por reunión, almacenados en Cloudinary</div>
            </div>
          </div>
          {/* Card 3 */}
          <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", padding: "2.5vh 2vw", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ width: "3vw", height: "3vw", backgroundColor: "rgba(79, 127, 255, 0.15)", borderRadius: "0.6vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "1.2vw", height: "1.4vw", backgroundColor: "#4F7FFF", borderRadius: "0.3vw 0.3vw 0 0" }} />
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, marginBottom: "0.8vh" }}>Chat con IA</div>
              <div style={{ fontSize: "1.1vw", fontWeight: 300, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>Pregunta en lenguaje natural sobre el contenido de tus reuniones</div>
            </div>
          </div>
          {/* Card 4 */}
          <div style={{ backgroundColor: "#131726", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1vw", padding: "2.5vh 2vw", display: "flex", gap: "1.5vw", alignItems: "flex-start", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #4F7FFF, #7C6BF0)" }} />
            <div style={{ width: "3vw", height: "3vw", backgroundColor: "rgba(124, 107, 240, 0.15)", borderRadius: "0.6vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "1.4vw", height: "0.9vw", borderRadius: "1vw", border: "2px solid #7C6BF0" }} />
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, marginBottom: "0.8vh" }}>Web y Móvil</div>
              <div style={{ fontSize: "1.1vw", fontWeight: 300, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>Disponible en iPhone, Android y cualquier navegador</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>03 / 09</div>
    </div>
  );
}
