import json
from typing import Dict, List, Optional

from fastapi import HTTPException
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

anthropic_available = False
client = None

if ANTHROPIC_API_KEY:
    try:
        import anthropic as _anthropic
        client = _anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        anthropic_available = True
        print("✅ Anthropic Claude listo")
    except Exception as e:
        print(f"⚠️ Error conectando a Anthropic: {e}")


def _parse_json_field(meeting_data: dict, field: str):
    val = meeting_data.get(field, [])
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return val or []


def build_meeting_context(meeting_data: dict) -> str:
    parts = []

    if meeting_data.get("transcript"):
        parts.append(f"=== TRANSCRIPCIÓN ===\n{meeting_data['transcript']}")

    notes = _parse_json_field(meeting_data, "notes")
    if notes:
        notes_text = "\n".join(n["text"] for n in notes)
        parts.append(f"=== NOTAS ===\n{notes_text}")

    images = _parse_json_field(meeting_data, "images")
    for i, img in enumerate(images):
        parts.append(f"=== IMAGEN {i + 1} ===\n{img.get('ocr_text', '')}")

    docs = _parse_json_field(meeting_data, "documents")
    for doc in docs:
        parts.append(f"=== DOCUMENTO ===\n{doc.get('content', '')}")

    return "\n\n".join(parts)


def _prepare_messages(meeting_data: dict, question: Optional[str] = None) -> list:
    context = build_meeting_context(meeting_data)
    content_blocks = []

    # Imágenes como bloques de visión
    images = _parse_json_field(meeting_data, "images")
    for img in images:
        if img.get("url"):
            content_blocks.append({
                "type": "image",
                "source": {"type": "url", "url": img["url"]}
            })

    # Contexto con prompt caching
    content_blocks.append({
        "type": "text",
        "text": f"CONTEXTO DE LA REUNIÓN:\n{context}",
        "cache_control": {"type": "ephemeral"}
    })

    messages = [{"role": "user", "content": content_blocks}]

    if question:
        messages.append({"role": "user", "content": question})

    return messages


def generate_summary(meeting_data: dict) -> str:
    if not anthropic_available:
        raise HTTPException(500, "Anthropic no configurado. Agrega ANTHROPIC_API_KEY en los Secrets.")

    system = (
        "Eres un asistente ejecutivo experto. Resume la reunión en 3 párrafos:\n"
        "1. Contexto y temas tratados\n"
        "2. Decisiones clave tomadas\n"
        "3. Próximos pasos y tareas pendientes"
    )
    messages = _prepare_messages(meeting_data)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1500,
        system=system,
        messages=messages,
    )
    return response.content[0].text


def extract_action_items(meeting_data: dict) -> List[Dict]:
    if not anthropic_available:
        raise HTTPException(500, "Anthropic no configurado. Agrega ANTHROPIC_API_KEY en los Secrets.")

    system = (
        "Eres un asistente de reuniones. Extrae las tareas pendientes (action items) "
        "y devuélvelas ÚNICAMENTE como un array JSON válido con esta estructura exacta:\n"
        '[{"description": "...", "assignee": "...", "due_date": "YYYY-MM-DD o null"}]\n'
        'Si no sabes el responsable, usa "Por definir". Si no hay fecha, usa null.\n'
        "NO añadas texto explicativo, SOLO el JSON."
    )
    messages = _prepare_messages(meeting_data)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        system=system,
        messages=messages,
    )
    try:
        text = response.content[0].text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception:
        return [{"description": "Error al parsear action items", "assignee": "Por definir", "due_date": None}]


def answer_question(meeting_data: dict, question: str) -> str:
    if not anthropic_available:
        raise HTTPException(500, "Anthropic no configurado. Agrega ANTHROPIC_API_KEY en los Secrets.")

    system = (
        "Eres un asistente de reuniones. Responde basándote ÚNICAMENTE en la información "
        "proporcionada. Si no tienes la información, di claramente "
        '"No se mencionó en la reunión". Cita la fuente cuando sea posible.'
    )
    messages = _prepare_messages(meeting_data, question=question)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        system=system,
        messages=messages,
    )
    return response.content[0].text


def analyze_image(image_url: str) -> str:
    if not anthropic_available:
        raise HTTPException(500, "Anthropic no configurado. Agrega ANTHROPIC_API_KEY en los Secrets.")

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "url", "url": image_url}},
                {
                    "type": "text",
                    "text": (
                        "Describe detalladamente todo lo que ves en esta imagen. "
                        "Si es una pizarra o presentación, transcribe TODO el texto visible "
                        "y describe diagramas, flechas, colores y estructura visual."
                    )
                }
            ]
        }]
    )
    return response.content[0].text
