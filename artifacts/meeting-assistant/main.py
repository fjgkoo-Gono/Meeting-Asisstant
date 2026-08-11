from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from services.claude import anthropic_available
from services.database import use_supabase
from services.storage import cloudinary_available
from routers import meetings, uploads

# ─── App ───
app = FastAPI(title="Meeting Assistant - Claude Edition", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───
app.include_router(meetings.router)
app.include_router(uploads.router)

# ─── Static files ───
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─── Health check ───
@app.get("/health")
def health():
    return {
        "status": "ok",
        "services": {
            "anthropic": anthropic_available,
            "supabase": use_supabase,
            "cloudinary": cloudinary_available,
            "database": "supabase" if use_supabase else "sqlite",
        }
    }


# ─── Frontend ───
@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    with open("static/index.html", encoding="utf-8") as f:
        return f.read()


# ─── Run ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
