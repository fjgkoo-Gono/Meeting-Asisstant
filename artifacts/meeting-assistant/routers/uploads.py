from fastapi import APIRouter, File, HTTPException, UploadFile
from datetime import datetime

from services.database import MeetingDB
from services.storage import upload_file
from services.claude import analyze_image

router = APIRouter(prefix="/upload", tags=["uploads"])


@router.post("/image/{meeting_id}")
async def upload_image(meeting_id: str, file: UploadFile = File(...)):
    if not MeetingDB.get(meeting_id):
        raise HTTPException(404, "Reunión no encontrada")

    contents = await file.read()
    url = upload_file(contents, folder=f"meetings/{meeting_id}")
    analysis = analyze_image(url)
    MeetingDB.add_image(meeting_id, url, analysis)

    return {"url": url, "analysis": analysis}


@router.post("/document/{meeting_id}")
async def upload_document(meeting_id: str, file: UploadFile = File(...)):
    meeting = MeetingDB.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Reunión no encontrada")

    contents = await file.read()
    url = upload_file(contents, folder=f"meetings/{meeting_id}/docs")

    docs = MeetingDB._get_json_field(meeting_id, "documents")
    docs.append({
        "url": url,
        "filename": file.filename,
        "content_type": file.content_type,
        "added_at": datetime.utcnow().isoformat(),
    })
    MeetingDB.update(meeting_id, {"documents": docs})

    return {"url": url, "filename": file.filename}
