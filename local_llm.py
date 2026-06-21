"""
Free local LLM layer for Thread — no paid API keys required.

Priority:
  1. Ollama (free, runs on your machine) — best quality
  2. Extractive NLP fallback (always works offline)
"""

from dataclasses import dataclass
import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("thread.llm")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))

# ---------------------------------------------------------------------------
# Ollama (free local LLM — install from https://ollama.com)
# ---------------------------------------------------------------------------


def ollama_is_available() -> bool:
    """Check whether Ollama is running locally."""
    try:
        req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def ollama_chat(system_prompt: str, user_prompt: str) -> str | None:
    """
    Call a local Ollama model. Returns None if Ollama is unavailable or fails.
    """
    if not ollama_is_available():
        return None

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.4},
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{OLLAMA_HOST}/api/chat",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            body: dict[str, Any] = json.loads(resp.read().decode("utf-8"))

        message = body.get("message", {})
        content = message.get("content", "") if isinstance(message, dict) else ""
        if content and content.strip():
            logger.info("Ollama response via model %s", OLLAMA_MODEL)
            return content.strip()
    except Exception as exc:
        logger.warning("Ollama chat failed: %s", exc)

    return None


def active_llm_provider() -> str:
    """Return which LLM backend is active."""
    return "ollama" if ollama_is_available() else "extractive"


# ---------------------------------------------------------------------------
# Extractive fallback (100% offline, no installs beyond Python deps)
# ---------------------------------------------------------------------------

ARCHITECTURE_KEYWORDS = (
    "architecture", "model", "network", "encoder", "decoder", "framework",
    "transformer", "mixture", "moe", "layer", "module", "backbone",
)
METHODOLOGY_KEYWORDS = (
    "method", "methodology", "approach", "train", "algorithm", "pipeline",
    "propose", "experiment", "optimization", "loss", "objective",
)
DATASET_KEYWORDS = (
    "dataset", "benchmark", "corpus", "evaluation", "marco", "beir",
    "imagenet", "cifar", "split", "training data", "test set",
)
RESULT_KEYWORDS = (
    "result", "achieve", "outperform", "accuracy", "performance", "improve",
    "state-of-the-art", "sota", "gain", "metric", "calibration",
)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _repair_pdf_spacing(text: str) -> str:
    """Fix common PDF extraction glues like 'subsetsofinputs,MoEsalso'."""
    repaired = text
    repaired = re.sub(r",(?=\S)", ", ", repaired)
    repaired = re.sub(r";(?=\S)", "; ", repaired)
    repaired = re.sub(r"\.(?=[A-Za-z])", ". ", repaired)
    repaired = re.sub(r"([a-z]{2,})([A-Z][a-z])", r"\1 \2", repaired)
    return re.sub(r"\s+", " ", repaired).strip()


def _display_paper_title(filename: str) -> str:
    title = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)
    title = re.sub(r"[_\-]+", " ", title).strip()
    return title or "Research Paper"


def _format_markdown_section(title: str, sentences: list[str]) -> str:
    if not sentences:
        return ""
    cleaned = [_repair_pdf_spacing(_normalize_text(s)) for s in sentences]
    bullets = "\n".join(f"- {sentence}" for sentence in cleaned)
    return f"## {title}\n\n{bullets}\n"


def _format_markdown_paragraph(title: str, text: str) -> str:
    if not text.strip():
        return ""
    cleaned = _repair_pdf_spacing(_normalize_text(text))
    return f"## {title}\n\n{cleaned}\n"


def _split_sentences(text: str) -> list[str]:
    normalized = _repair_pdf_spacing(_normalize_text(text))
    parts = re.split(r"(?<=[.!?])\s+", normalized)
    return [part.strip() for part in parts if len(part.strip()) > 35]


def _score_sentence(sentence: str, keywords: tuple[str, ...]) -> int:
    lower = sentence.lower()
    return sum(1 for keyword in keywords if keyword in lower)


def _top_sentences(text: str, keywords: tuple[str, ...], limit: int = 3) -> list[str]:
    ranked: list[tuple[int, str]] = []
    for sentence in _split_sentences(text):
        score = _score_sentence(sentence, keywords)
        if score > 0:
            ranked.append((score, sentence))

    ranked.sort(key=lambda item: item[0], reverse=True)

    chosen: list[str] = []
    seen: set[str] = set()
    for _, sentence in ranked:
        fingerprint = sentence[:100].lower()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        chosen.append(sentence)
        if len(chosen) >= limit:
            break
    return chosen


def _extract_abstract(text: str) -> str:
    match = re.search(r"\babstract\b[:\s-]*(.*?)(?=\bintroduction\b|\b1[\.\s]+introduction\b)", text, re.I | re.S)
    if match:
        abstract = _normalize_text(match.group(1))
        if len(abstract) > 80:
            return abstract[:1200]
    return ""


def extractive_summary(extracted_text: str, filename: str) -> str:
    """
    Build a structured research summary without any external API.
    Uses keyword-scored sentence extraction across key paper sections.
    """
    abstract = _extract_abstract(extracted_text)
    architecture = _top_sentences(extracted_text, ARCHITECTURE_KEYWORDS)
    methodology = _top_sentences(extracted_text, METHODOLOGY_KEYWORDS)
    datasets = _top_sentences(extracted_text, DATASET_KEYWORDS)
    results = _top_sentences(extracted_text, RESULT_KEYWORDS)

    title = _display_paper_title(filename)
    sections: list[str] = [f"# {title}\n"]

    if abstract:
        sections.append(_format_markdown_paragraph("Abstract", abstract))
    if architecture:
        sections.append(_format_markdown_section("Architectural Concepts", architecture))
    if methodology:
        sections.append(_format_markdown_section("Methodology", methodology))
    if datasets:
        sections.append(_format_markdown_section("Datasets & Evaluation", datasets))
    if results:
        sections.append(_format_markdown_section("Key Results", results))

    if len(sections) == 1:
        preview = _repair_pdf_spacing(_normalize_text(extracted_text)[:1500])
        sections.append(f"## Overview\n\n{preview}\n")

    sections.append(_fallback_mermaid_diagram(filename, methodology, architecture))
    return "\n".join(sections)


def _sanitize_mermaid_label(text: str, max_len: int = 48) -> str:
    """Make PDF-derived text safe inside Mermaid node labels."""
    cleaned = re.sub(r"[^\w\s\-/,]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return (cleaned[:max_len] or "Core Step").replace('"', "'")


def _short_mermaid_label(text: str, max_words: int = 4, max_len: int = 32) -> str:
    """Short, readable node labels — flowcharts work best with 3–5 words per node."""
    cleaned = _sanitize_mermaid_label(text, max_len=120)
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 1].rsplit(" ", 1)[0] or cleaned[:max_len]
    return cleaned or "Step"


def _wrap_mermaid_label(text: str, line_len: int = 22) -> str:
    """Break long labels across two lines for taller, readable nodes."""
    short = _short_mermaid_label(text, max_words=8, max_len=80)
    if len(short) <= line_len:
        return short
    words = short.split()
    line_one: list[str] = []
    length = 0
    rest_start = 0
    for i, word in enumerate(words):
        extra = len(word) + (1 if line_one else 0)
        if length + extra > line_len and line_one:
            rest_start = i
            break
        line_one.append(word)
        length += extra
        rest_start = i + 1
    line_two = " ".join(words[rest_start:rest_start + 4])
    if line_two:
        return f"{' '.join(line_one)}<br/>{line_two}"
    return " ".join(line_one)


def _fallback_mermaid_diagram(
    filename: str,
    methodology: list[str],
    architecture: list[str],
) -> str:
    """Offline fallback: top-down flowchart with short labels and readable spacing."""
    display_name = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)
    display_name = re.sub(r"[_\-]+", " ", display_name).strip()[:40] or "Research Paper"
    safe_name = _short_mermaid_label(display_name, max_words=3, max_len=24)

    core_steps: list[str] = []
    for item in (architecture or [])[:2]:
        label = _wrap_mermaid_label(item)
        if label and label not in core_steps:
            core_steps.append(label)
    for item in (methodology or [])[:2]:
        label = _wrap_mermaid_label(item)
        if label and label not in core_steps:
            core_steps.append(label)

    if not core_steps:
        core_steps = ["Model design", "Training"]
    core_steps = core_steps[:3]

    method_lines: list[str] = []
    method_ids: list[str] = []
    for idx, step in enumerate(core_steps):
        node_id = f"M{idx + 1}"
        method_ids.append(node_id)
        method_lines.append(f'        {node_id}["{step}"]')
        if idx > 0:
            method_lines.append(f"        {method_ids[idx - 1]} --> {node_id}")

    eval_label = "Results"

    body = f"""```mermaid
%%{{init: {{'theme': 'base', 'themeVariables': {{'fontSize': '18px'}}, 'flowchart': {{'useMaxWidth': false, 'wrappingWidth': 240, 'nodeSpacing': 64, 'rankSpacing': 72}}}}}}%%
flowchart TB
    subgraph ingest["Ingestion"]
        direction TB
        A(["{safe_name}"])
        B["Extract text"]
        A --> B
    end

    subgraph method["Core method"]
        direction TB
{chr(10).join(method_lines)}
    end

    subgraph eval["Evaluation"]
        direction TB
        E1["Benchmarks"]
        E2(("{eval_label}"))
        E1 --> E2
    end

    B --> {method_ids[0]}
    {method_ids[-1]} --> E1

    classDef threadInput fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#18181b
    classDef threadCore fill:#f4f4f5,stroke:#52525b,stroke-width:1.5px,color:#18181b
    classDef threadEval fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#27272a
    classDef threadResult fill:#ffffff,stroke:#18181b,stroke-width:1.5px,color:#18181b

    class A,B threadInput
    class {",".join(method_ids)} threadCore
    class E1 threadEval
    class E2 threadResult

    linkStyle default stroke:#71717a,stroke-width:1.5px
```"""
    return body


def split_summary_and_mermaid(summary: str) -> tuple[str, str]:
    """Split prose summary from an embedded ```mermaid block."""
    match = re.search(r"```mermaid\s*([\s\S]*?)```", summary, re.IGNORECASE)
    if not match:
        return summary.strip(), ""
    diagram = match.group(1).strip()
    prose = (summary[: match.start()] + summary[match.end() :]).strip()
    return prose, diagram


def _extract_mermaid_block(text: str) -> str:
    match = re.search(r"```mermaid\s*[\s\S]*?```", text, re.IGNORECASE)
    return match.group(0) if match else ""


DIAGRAM_KEYWORDS = (
    "graph", "diagram", "flowchart", "pipeline", "visual", "chart",
    "mermaid", "draw", "map", "architecture", "methodology",
)


@dataclass
class ChatResult:
    response: str
    mermaid_diagram: str = ""


def _user_wants_diagram(user_message: str) -> bool:
    lower = user_message.lower()
    return any(keyword in lower for keyword in DIAGRAM_KEYWORDS)


def _resolve_diagram_from_memory(memory_context: str) -> str:
    """Extract or generate a Mermaid diagram from stored paper memory."""
    _, diagram = split_summary_and_mermaid(memory_context)
    if diagram:
        return diagram

    block = _extract_mermaid_block(memory_context)
    if block:
        inner = re.search(r"```mermaid\s*([\s\S]*?)```", block, re.IGNORECASE)
        if inner:
            return inner.group(1).strip()

    filename = "paper.pdf"
    fn_match = re.search(r"Research paper(?: summary)?:\s*(\S+\.pdf)", memory_context, re.IGNORECASE)
    if fn_match:
        filename = fn_match.group(1)

    generated = _fallback_mermaid_diagram(
        filename,
        _top_sentences(memory_context, METHODOLOGY_KEYWORDS),
        _top_sentences(memory_context, ARCHITECTURE_KEYWORDS),
    )
    inner = re.search(r"```mermaid\s*([\s\S]*?)```", generated, re.IGNORECASE)
    return inner.group(1).strip() if inner else ""


def extractive_chat_reply(user_message: str, memory_context: str) -> ChatResult:
    """
    Answer using retrieved memory only — picks the most relevant sentences
    from stored paper summaries (no external LLM).
    """
    if memory_context.strip() == "No long-term memory context is available yet.":
        return ChatResult(
            response=(
                "### No papers yet\n\n"
                "Upload a PDF first, then ask about its **methodology**, **datasets**, or **results**."
            ),
        )

    if _user_wants_diagram(user_message):
        diagram = _resolve_diagram_from_memory(memory_context)
        if diagram:
            return ChatResult(
                response=(
                    "### Methodology Pipeline\n\n"
                    "Here is a visual map of the paper's core stages — from **ingestion** "
                    "through **evaluation**.\n\n"
                    "The flowchart below traces how data and methods connect across the pipeline."
                ),
                mermaid_diagram=diagram,
            )

    prose_context, stored_diagram = split_summary_and_mermaid(memory_context)

    query_terms = {
        term.lower()
        for term in re.findall(r"[a-zA-Z]{4,}", user_message.lower())
    }

    context_blocks = [
        block.strip()
        for block in re.split(r"\n\s*-\s*", prose_context)
        if block.strip() and not block.strip().startswith("```")
    ]

    relevant_lines: list[tuple[int, str]] = []
    for block in context_blocks:
        for sentence in _split_sentences(block):
            lower = sentence.lower()
            if "```" in sentence or "flowchart" in lower:
                continue
            score = sum(1 for term in query_terms if term in lower)
            if score > 0:
                relevant_lines.append((score, sentence))

    relevant_lines.sort(key=lambda item: item[0], reverse=True)

    if relevant_lines:
        highlights = [_repair_pdf_spacing(s) for _, s in relevant_lines[:4]]
        bullets = "\n".join(f"- {sentence}" for sentence in highlights)
        body = f"#### Key points\n\n{bullets}"
    else:
        cleaned = _repair_pdf_spacing(_normalize_text(prose_context)[:1200])
        body = cleaned

    return ChatResult(
        response=(
            f"### Answer\n\n"
            f"Here's what your uploaded papers say about **\"{user_message}\"**:\n\n"
            f"{body}"
        ),
        mermaid_diagram=stored_diagram if _user_wants_diagram(user_message) else "",
    )


# ---------------------------------------------------------------------------
# Public API used by main.py
# ---------------------------------------------------------------------------

SUMMARY_SYSTEM_PROMPT = """You are a research analyst preparing structured memory for an AI assistant.

Analyze this paper and summarize the methodology. Given document text, extract and summarize:
1. Core architectural concepts and model design choices
2. Methodology and experimental setup
3. Datasets used for training and evaluation
4. Notable results, benchmarks, or claims

Format the prose summary as clean Markdown:
- Start with `# Paper Title`
- Use `##` section headers (Abstract, Architectural Concepts, Methodology, Datasets & Evaluation, Key Results)
- Use bullet lists for multi-point sections
- Use **bold** for key terms and model names
- Keep the prose summary under 400 words

Be specific about architectures, datasets, and metrics.

You MUST conclude your response with a Mermaid.js flowchart mapping out the methodology pipeline.
Wrap the flowchart in standard mermaid markdown code blocks.

Diagram readability rules (important):
- Use `flowchart TB` (top-down), NOT left-to-right
- Keep node labels SHORT: 3–5 words max per node
- Use three subgraphs: Ingestion, Core method, Evaluation
- Start with init directive for 18px font:
  %%{init: {'theme': 'base', 'themeVariables': {'fontSize': '18px'}, 'flowchart': {'useMaxWidth': false, 'wrappingWidth': 240}}}%%
- Use classDef threadInput, threadCore, threadEval, threadResult with stroke-width:1.5px
- Maximum 6–8 nodes total

Example:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'fontSize': '18px'}, 'flowchart': {'useMaxWidth': false, 'wrappingWidth': 240}}}%%
flowchart TB
    subgraph ingest["Ingestion"]
        A(["Paper"]) --> B["Extract text"]
    end
    subgraph method["Core method"]
        C["Routing"] --> D["Training"]
    end
    subgraph eval["Evaluation"]
        E["Benchmarks"] --> F(("Results"))
    end
    B --> C
    D --> E
    classDef threadInput fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#18181b
    classDef threadCore fill:#f4f4f5,stroke:#52525b,stroke-width:1.5px,color:#18181b
    classDef threadEval fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#27272a
    classDef threadResult fill:#ffffff,stroke:#18181b,stroke-width:1.5px,color:#18181b
    class A,B threadInput
    class C,D threadCore
    class E threadEval
    class F threadResult
```

The flowchart should reflect the paper's actual pipeline — not a generic placeholder."""


def summarize_document(extracted_text: str, filename: str, max_chars: int = 20_000) -> str:
    """Summarize a paper using Ollama if available, otherwise extractive NLP."""
    excerpt = extracted_text.strip()
    if len(excerpt) > max_chars:
        excerpt = excerpt[:max_chars] + "\n\n[Document truncated for analysis.]"

    ollama_summary = ollama_chat(
        SUMMARY_SYSTEM_PROMPT,
        f"Document filename: {filename}\n\nDocument text:\n{excerpt}",
    )
    if ollama_summary:
        return ollama_summary

    logger.info("Using offline extractive summary for %s", filename)
    return extractive_summary(excerpt, filename)


def generate_chat_response(user_message: str, memory_context: str) -> ChatResult:
    """Generate a chat reply using Ollama if available, otherwise extractive memory retrieval."""
    system_prompt = (
        "You are Thread, an advanced AI research assistant. "
        f"The user is asking: {user_message}. "
        "You MUST incorporate the following long-term memory context into your answer. "
        "Do not ignore this context.\n\n"
        "Format your reply as clean Markdown with `###` headers, bullet lists, and **bold** key terms.\n\n"
        f"MEMORY CONTEXT:\n{memory_context}"
    )

    ollama_reply = ollama_chat(system_prompt, user_message)
    if ollama_reply:
        _, diagram = split_summary_and_mermaid(ollama_reply)
        if not diagram:
            diagram = _resolve_diagram_from_memory(memory_context) if _user_wants_diagram(user_message) else ""
        return ChatResult(response=ollama_reply, mermaid_diagram=diagram)

    logger.info("Using offline extractive chat reply")
    return extractive_chat_reply(user_message, memory_context)
