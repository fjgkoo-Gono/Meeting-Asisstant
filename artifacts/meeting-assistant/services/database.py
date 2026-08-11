import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional

from config import SUPABASE_URL, SUPABASE_KEY

# ─── Inicializar Supabase (con fallback a SQLite) ───
use_supabase = bool(SUPABASE_URL and SUPABASE_KEY)
db = None

if use_supabase:
    try:
        from supabase import create_client
        db = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado a Supabase")
    except Exception as e:
        print(f"⚠️ Error conectando a Supabase: {e}")
        use_supabase = False

if not use_supabase:
    import sqlite3 as _sqlite3
    SQLITE_DB = "meetings.db"

    def _init_sqlite():
        conn = _sqlite3.connect(SQLITE_DB)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT,
                project_id TEXT DEFAULT 'default',
                created_at TEXT,
                status TEXT DEFAULT 'active',
                transcript TEXT DEFAULT '',
                images TEXT DEFAULT '[]',
                notes TEXT DEFAULT '[]',
                documents TEXT DEFAULT '[]',
                summary TEXT DEFAULT '',
                action_items TEXT DEFAULT '[]'
            )
        ''')
        conn.commit()
        conn.close()

    _init_sqlite()
    print("✅ Usando SQLite local como fallback")


class MeetingDB:
    @classmethod
    def create(cls, title: str, project_id: str = "default") -> str:
        meeting_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow().isoformat()

        if use_supabase:
            data = {
                "id": meeting_id, "title": title, "project_id": project_id,
                "created_at": now, "status": "active", "transcript": "",
                "images": [], "notes": [], "documents": [],
                "summary": "", "action_items": []
            }
            db.table("meetings").insert(data).execute()
        else:
            conn = sqlite3.connect(SQLITE_DB)
            c = conn.cursor()
            c.execute('''
                INSERT INTO meetings
                  (id, title, project_id, created_at, status,
                   transcript, images, notes, documents, summary, action_items)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (meeting_id, title, project_id, now, "active",
                  "", "[]", "[]", "[]", "", "[]"))
            conn.commit()
            conn.close()

        return meeting_id

    @classmethod
    def get(cls, meeting_id: str) -> Optional[dict]:
        if use_supabase:
            result = db.table("meetings").select("*").eq("id", meeting_id).execute()
            return result.data[0] if result.data else None
        else:
            conn = sqlite3.connect(SQLITE_DB)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,))
            row = c.fetchone()
            conn.close()
            return dict(row) if row else None

    @classmethod
    def update(cls, meeting_id: str, data: dict):
        if use_supabase:
            db.table("meetings").update(data).eq("id", meeting_id).execute()
        else:
            conn = sqlite3.connect(SQLITE_DB)
            c = conn.cursor()
            for key, value in data.items():
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                c.execute(f"UPDATE meetings SET {key} = ? WHERE id = ?", (value, meeting_id))
            conn.commit()
            conn.close()

    @classmethod
    def _get_json_field(cls, meeting_id: str, field: str) -> list:
        meeting = cls.get(meeting_id)
        if not meeting:
            return []
        val = meeting.get(field, "[]")
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return []
        return val if val else []

    @classmethod
    def add_note(cls, meeting_id: str, text: str):
        notes = cls._get_json_field(meeting_id, "notes")
        notes.append({"text": text, "added_at": datetime.utcnow().isoformat()})
        cls.update(meeting_id, {"notes": notes})

    @classmethod
    def add_image(cls, meeting_id: str, url: str, analysis: str):
        images = cls._get_json_field(meeting_id, "images")
        images.append({
            "url": url,
            "ocr_text": analysis,
            "added_at": datetime.utcnow().isoformat()
        })
        cls.update(meeting_id, {"images": images})

    @classmethod
    def set_transcript(cls, meeting_id: str, text: str):
        cls.update(meeting_id, {"transcript": text})

    @classmethod
    def set_summary(cls, meeting_id: str, summary: str):
        cls.update(meeting_id, {"summary": summary})

    @classmethod
    def set_action_items(cls, meeting_id: str, items: list):
        cls.update(meeting_id, {"action_items": items})

    @classmethod
    def list_by_project(cls, project_id: str) -> List[dict]:
        if use_supabase:
            result = db.table("meetings").select("*").eq("project_id", project_id).execute()
            return result.data or []
        else:
            conn = sqlite3.connect(SQLITE_DB)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM meetings WHERE project_id = ?", (project_id,))
            rows = c.fetchall()
            conn.close()
            return [dict(r) for r in rows]
