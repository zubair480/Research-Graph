"""
Thread — AI Research Tool REST API

Context-over-Amnesia backend: PDF ingestion writes structured memories,
and chat retrieves long-term context before generating free local responses
via Ollama (optional) or offline extractive NLP.
"""

import io
import json
import logging
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pdfplumber
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from local_llm import (
    active_llm_provider,
    generate_chat_response,
    ollama_is_available,
    split_summary_and_mermaid,
    summarize_document,
)

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("thread")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

HYDRA_DB_API_KEY = os.getenv("HYDRA_DB_API_KEY", "your-hydradb-api-key-here").strip()
HYDRA_TENANT_ID = os.getenv("HYDRA_TENANT_ID", "your-tenant-id-here").strip()
HYDRA_SUB_TENANT_ID = os.getenv("HYDRA_SUB_TENANT_ID", "demo-session-001").strip()
DEFAULT_SESSION_ID = os.getenv("THREAD_SESSION_ID", HYDRA_SUB_TENANT_ID)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

APP_VERSION = "2.2.0"

app = FastAPI(
    title="Thread API",
    description="AI research tool with HydraDB long-term memory and free local LLM",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_hydradb_client = None
MEMORY_FILE = Path(__file__).resolve().parent / "data" / "memory.json"
_local_memory_store: list[dict[str, str]] = []


def _load_local_memory() -> None:
    global _local_memory_store
    if not MEMORY_FILE.exists():
        return
    try:
        _local_memory_store = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        logger.info("Loaded %d memories from disk", len(_local_memory_store))
    except Exception:
        logger.exception("Failed to load local memory file")


def _save_local_memory() -> None:
    try:
        MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        MEMORY_FILE.write_text(json.dumps(_local_memory_store, indent=2), encoding="utf-8")
    except Exception:
        logger.exception("Failed to save local memory file")


def _append_local_memory(record: dict[str, str]) -> None:
    _local_memory_store.append(record)
    _save_local_memory()


_load_local_memory()


def hydradb_is_configured() -> bool:
    placeholder_keys = {"", "your-hydradb-api-key-here", "your-tenant-id-here"}
    return (
        HYDRA_DB_API_KEY not in placeholder_keys
        and HYDRA_TENANT_ID not in placeholder_keys
    )


def get_hydradb_client():
    global _hydradb_client
    if not hydradb_is_configured():
        return None
    if _hydradb_client is None:
        try:
            from hydra_db import HydraDB

            _hydradb_client = HydraDB(token=HYDRA_DB_API_KEY)
        except ImportError as exc:
            logger.error("hydradb-sdk is not installed: %s", exc)
            return None
        except Exception as exc:
            logger.error("Failed to initialize HydraDB client: %s", exc)
            return None
    return _hydradb_client


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    mermaid_diagram: str = ""


class UploadResponse(BaseModel):
    filename: str
    status: str
    preview: str
    summary: str
    mermaid_diagram: str = ""


# ---------------------------------------------------------------------------
# PDF helpers
# ---------------------------------------------------------------------------


def extract_text_from_pdf(file_bytes: bytes) -> str:
    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text.strip())
    return "\n\n".join(pages)


def build_text_preview(text: str, max_length: int = 200) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        return "(no extractable text found)"
    if len(cleaned) <= max_length:
        return cleaned
    return cleaned[: max_length - 3] + "..."


# ---------------------------------------------------------------------------
# HydraDB memory write / read
# ---------------------------------------------------------------------------


def store_memory_in_hydradb(summary: str, filename: str, session_id: str) -> str:
    memory_id = f"paper-{uuid.uuid4().hex[:12]}"
    title = f"Research paper summary: {filename}"
    metadata = {
        "category": "research_paper",
        "filename": filename,
        "session_id": session_id,
        "ingested_at": datetime.now(UTC).isoformat(),
    }

    client = get_hydradb_client()
    if client is None:
        logger.info("Using local memory store for %s", filename)
        _append_local_memory(
            {"source_id": memory_id, "title": title, "text": summary, "metadata": json.dumps(metadata)}
        )
        return memory_id

    memories_payload = json.dumps(
        [{"source_id": memory_id, "title": title, "text": summary, "infer": True, "metadata": metadata}]
    )

    try:
        client.context.ingest(
            tenant_id=HYDRA_TENANT_ID,
            sub_tenant_id=session_id,
            type="memory",
            memories=memories_payload,
            upsert=True,
        )
        logger.info("Stored memory %s in HydraDB", memory_id)
        return memory_id
    except Exception:
        logger.exception("HydraDB write failed — using local store")
        _append_local_memory(
            {"source_id": memory_id, "title": title, "text": summary, "metadata": json.dumps(metadata)}
        )
        return memory_id


def query_hydradb(user_query: str, session_id: str) -> str:
    client = get_hydradb_client()
    if client is None:
        return _query_local_memory(user_query)

    try:
        results = client.query(
            tenant_id=HYDRA_TENANT_ID,
            sub_tenant_id=session_id,
            query=user_query,
            type="all",
            max_results=8,
            mode="fast",
        )

        try:
            from hydra_db.helpers import build_string

            formatted = build_string(results)
            if formatted and formatted.strip() != "No relevant context found.":
                return formatted.strip()
        except ImportError:
            pass

        data = getattr(results, "data", results)
        chunks = getattr(data, "results", None) or getattr(data, "chunks", None) or []
        if chunks:
            lines = []
            for item in chunks[:8]:
                text = getattr(item, "text", None) or getattr(item, "content", None)
                title = getattr(item, "title", None) or "Context"
                if text:
                    lines.append(f"- {title}: {text}")
            if lines:
                return "\n".join(lines)

        return _query_local_memory(user_query)
    except Exception:
        logger.exception("HydraDB query failed — using local memory")
        return _query_local_memory(user_query)


def _query_local_memory(user_query: str) -> str:
    if not _local_memory_store:
        return "No long-term memory context is available yet."

    query_terms = {term.lower() for term in user_query.split() if len(term) > 3}
    matched: list[str] = []

    for record in reversed(_local_memory_store):
        haystack = f"{record['title']} {record['text']}".lower()
        if not query_terms or any(term in haystack for term in query_terms):
            matched.append(record["text"])

    if matched:
        return "\n\n---\n\n".join(matched[:3])

    return _local_memory_store[-1]["text"]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "thread-api",
        "version": APP_VERSION,
        "mermaid_chat": True,
        "llm_provider": active_llm_provider(),
        "ollama_available": ollama_is_available(),
        "ollama_model": OLLAMA_MODEL,
        "hydradb_configured": hydradb_is_configured(),
        "session_id": DEFAULT_SESSION_ID,
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), session_id: str | None = None) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    active_session = session_id or DEFAULT_SESSION_ID

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        extracted_text = extract_text_from_pdf(file_bytes)
        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract readable text from this PDF.")

        summary = summarize_document(extracted_text, file.filename)
        store_memory_in_hydradb(summary, file.filename, active_session)

        prose, mermaid_diagram = split_summary_and_mermaid(summary)

        return UploadResponse(
            filename=file.filename,
            status="success",
            preview=build_text_preview(prose or summary),
            summary=prose or summary,
            mermaid_diagram=mermaid_diagram,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected /upload failure")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {exc}") from exc


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    active_session = payload.session_id or DEFAULT_SESSION_ID

    try:
        memory_context = query_hydradb(user_message, active_session)
        result = generate_chat_response(user_message, memory_context)
        return ChatResponse(response=result.response, mermaid_diagram=result.mermaid_diagram)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected /chat failure")
        raise HTTPException(status_code=500, detail=f"Chat request failed: {exc}") from exc


if __name__ == "__main__":
    import json
    import socket
    import urllib.error
    import urllib.request

    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    preferred_port = int(os.getenv("PORT", "8070"))

    def _health_payload(port: int) -> dict | None:
        try:
            with urllib.request.urlopen(f"http://{host}:{port}/health", timeout=2) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
            return None

    def _is_current_thread_api(port: int) -> bool:
        payload = _health_payload(port)
        return bool(payload and payload.get("version") == APP_VERSION)

    def _find_port(start: int, attempts: int = 20) -> int:
        for candidate in range(start, start + attempts):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
                in_use = probe.connect_ex((host, candidate)) == 0
            if in_use and _is_current_thread_api(candidate):
                print(f"Thread API v{APP_VERSION} already running at http://{host}:{candidate}")
                raise SystemExit(0)
            if not in_use:
                return candidate
        raise SystemExit(f"No free port found in range {start}-{start + attempts - 1}")

    port = _find_port(preferred_port)

    provider = active_llm_provider()
    print(f"Thread API v{APP_VERSION} starting at http://{host}:{port}")
    print(f"LLM provider: {provider} ({OLLAMA_MODEL if provider == 'ollama' else 'offline NLP'})")
    if provider == "extractive":
        print("Tip: install Ollama (https://ollama.com) and run: ollama pull llama3.2")
    if not hydradb_is_configured():
        print("Note: using local disk-backed memory store (HydraDB optional).")
    print(f"Frontend proxy target: http://{host}:{port}")

    uvicorn.run(app, host=host, port=port)
