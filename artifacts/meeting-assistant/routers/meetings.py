import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.database import MeetingDB
from services.claude import generate_summary, extract_action_items, answer_question

router = APIRouter(prefix="/meetings", tags=["meetings"])


# ─── Modelos ───

class CreateMeetingRequest(BaseModel):
    title: str
    project_id: str = "default"

class SetTranscriptRequest(BaseModel):
    text: str

class AddNoteRequest(BaseModel):
    text: str

class AskQuestionRequest(BaseModel):
    question: str


# ─── Helpers ───

def _parse_meeting(meeting: dict) -> dict:
    """Parsea campos JSON almacenados como string."""
    for field in ["images", "notes", "documents", "action_items"]:
        val = meeting.get(field, "[]")
        if isinstance(val, str):
            try:
                meeting[field] = json.loads(val)
            except Exception:
                meeting[field] = []
    return meeting


# ─── Endpoints ───

@router.post("/create")
def create_meeting(data: CreateMeetingRequest):
    meeting_id = MeetingDB.create(data.title, data.project_id)
    return {"meeting_id": meeting_id, "status": "created"}


@router.get("/project/{project_id}")
def list_meetings(project_id: str):
    meetings = MeetingDB.list_by_project(project_id)
    return [_parse_meeting(m) for m in meetings]


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str):
    meeting = MeetingDB.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Reunión no encontrada")
    return _parse_meeting(meeting)


@router.post("/{meeting_id}/transcript")
def set_transcript(meeting_id: str, data: SetTranscriptRequest):
    if not MeetingDB.get(meeting_id):
        raise HTTPException(404, "Reunión no encontrada")
    MeetingDB.set_transcript(meeting_id, data.text)
    return {"status": "ok"}


@router.post("/{meeting_id}/note")
def add_note(meeting_id: str, data: AddNoteRequest):
    if not MeetingDB.get(meeting_id):
        raise HTTPException(404, "Reunión no encontrada")
    MeetingDB.add_note(meeting_id, data.text)
    return {"status": "ok"}


@router.post("/{meeting_id}/summary")
def get_summary(meeting_id: str):
    meeting = MeetingDB.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Reunión no encontrada")
    summary = generate_summary(meeting)
    MeetingDB.set_summary(meeting_id, summary)
    return {"summary": summary}


@router.post("/{meeting_id}/action-items")
def get_action_items(meeting_id: str):
    meeting = MeetingDB.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Reunión no encontrada")
    items = extract_action_items(meeting)
    MeetingDB.set_action_items(meeting_id, items)
    return {"action_items": items}


@router.post("/{meeting_id}/ask")
def ask_claude(meeting_id: str, data: AskQuestionRequest):
    meeting = MeetingDB.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Reunión no encontrada")
    answer = answer_question(meeting, data.question)
    return {"answer": answer}
