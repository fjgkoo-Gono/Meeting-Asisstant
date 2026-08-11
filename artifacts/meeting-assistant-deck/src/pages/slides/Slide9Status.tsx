export default function Slide9Status() {
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
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "60vw", height: "60vw", borderRadius: "50%", backgroundColor: "#4F7FFF", opacity: 0.05, filter: "blur(15vw)" }} />
      <div style={{ position: "absolute", bottom: "-20vh", right: "-10vw", width: "40vw", height: "40vw", borderRadius: "50%", backgroundColor: "#7C6BF0", opacity: 0.08, filter: "blur(8vw)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4vw 4vw", opacity: 0.5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "5vh", left: "5vw", display: "flex", alignItems: "center", gap: "0.8vw", zIndex: 10 }}>
        <div style={{ width: "2vw", height: "2vw", backgroundColor: "#4F7FFF", borderRadius: "0.4vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#FFFFFF", borderRadius: "0.1vw" }} />
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Assistant</div>
      </div>
      <div style={{ position: "absolute", top: "5vh", right: "5vw", fontSize: "1vw", color: "rgba(255,255,255,0.4)", zIndex: 10 }}>2026</div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "82vw" }}>
        <div style={{ textAlign: "center", marginBottom: "5vh" }}>
          <h2 style={{ fontSize: "3.6vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Estado actual y próximos pasos
          </h2>
        </div>

        {/* Two columns */}
        <div style={{ display: "flex", gap: "2vw", width: "100%" }}>
          {/* Construido */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(39,201,63,0.2)", borderRadius: "1vw", padding: "3vh 2.5vw", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: "#27C93F" }} />
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#4ADE80", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2.5vh" }}>Construido</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(39,201,63,0.15)", border: "1px solid rgba(39,201,63,0.3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8vw", color: "#27C93F", fontWeight: 700 }}>✓</div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Web app y API completas en producción</div>
              </div>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(39,201,63,0.15)", border: "1px solid rgba(39,201,63,0.3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8vw", color: "#27C93F", fontWeight: 700 }}>✓</div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>App móvil publicada (iOS & Android)</div>
              </div>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(39,201,63,0.15)", border: "1px solid rgba(39,201,63,0.3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8vw", color: "#27C93F", fontWeight: 700 }}>✓</div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Integración Claude + Supabase + Cloudinary</div>
              </div>
            </div>
            <div style={{ marginTop: "3vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(39,201,63,0.06)", borderRadius: "0.6vw", fontSize: "1.05vw", color: "rgba(39,201,63,0.7)", fontWeight: 400 }}>
              Plataforma completa en producción
            </div>
          </div>

          {/* Próximo */}
          <div style={{ flex: 1, backgroundColor: "#131726", border: "1px solid rgba(79,127,255,0.2)", borderRadius: "1vw", padding: "3vh 2.5vw", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #4F7FFF, #7C6BF0)" }} />
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#7BA7FF", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2.5vh" }}>Próximo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(79,127,255,0.12)", border: "1px solid rgba(79,127,255,0.25)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#4F7FFF" }} />
                </div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Eliminar proyectos desde móvil</div>
              </div>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(79,127,255,0.12)", border: "1px solid rgba(79,127,255,0.25)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#4F7FFF" }} />
                </div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Indicadores de progreso en subidas grandes</div>
              </div>
              <div style={{ display: "flex", gap: "1.2vw", alignItems: "center" }}>
                <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", backgroundColor: "rgba(79,127,255,0.12)", border: "1px solid rgba(79,127,255,0.25)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#4F7FFF" }} />
                </div>
                <div style={{ fontSize: "1.2vw", fontWeight: 500 }}>Swipe-to-delete nativo en listas</div>
              </div>
            </div>
            <div style={{ marginTop: "3vh", padding: "1.5vh 1.5vw", backgroundColor: "rgba(79,127,255,0.06)", borderRadius: "0.6vw", fontSize: "1.05vw", color: "rgba(79,127,255,0.7)", fontWeight: 400 }}>
              Roadmap de mejoras de UX
            </div>
          </div>
        </div>

        {/* Bottom closing line */}
        <div style={{ marginTop: "4vh", textAlign: "center" }}>
          <div style={{ fontSize: "1.5vw", fontWeight: 300, color: "rgba(255,255,255,0.4)" }}>
            Construido con <span style={{ color: "#4F7FFF", fontWeight: 600 }}>React</span> · <span style={{ color: "#7C6BF0", fontWeight: 600 }}>Expo</span> · <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Anthropic Claude</span>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>MEETING ASSISTANT</div>
      <div style={{ position: "absolute", bottom: "5vh", right: "5vw", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>09 / 09</div>
    </div>
  );
}
