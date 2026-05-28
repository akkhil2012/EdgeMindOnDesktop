#!/usr/bin/env python3
"""
Build a FAISS / NumPy vector index from a clinical knowledge base JSONL file.

Usage:
    python scripts/build_kb_index.py \
        --corpus data/clinical_kb.jsonl \
        --output models/clinical_kb.index.npz \
        --model sentence-transformers/all-MiniLM-L6-v2

Output .npz contains:
    embeddings  — float32 [N, 384]
    ids         — str     [N]
    texts       — str     [N]
    metadata    — str     [N]  (JSON-encoded dicts)
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np


def embed_texts(texts: list[str], model_name: str) -> np.ndarray:
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        sys.exit("Install: pip install sentence-transformers")

    print(f"[build_kb] Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    print(f"[build_kb] Embedding {len(texts)} chunks…")
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=True, normalize_embeddings=True)
    return embeddings.astype(np.float32)


def load_corpus(path: Path) -> list[dict]:
    chunks = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    print(f"[build_kb] Loaded {len(chunks)} chunks from {path}")
    return chunks


def build_faiss_index(embeddings: np.ndarray, output: Path) -> None:
    try:
        import faiss  # type: ignore
        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)  # inner-product == cosine for L2-normalised vectors
        index.add(embeddings)
        faiss.write_index(index, str(output.with_suffix(".faiss")))
        print(f"[build_kb] FAISS index written: {output.with_suffix('.faiss')} ({index.ntotal} vectors)")
    except ImportError:
        print("[build_kb] faiss-cpu not installed — skipping .faiss file (NumPy index still written)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build knowledge-base vector index for EdgeMind Desktop")
    parser.add_argument("--corpus", type=Path, required=True, help="Input JSONL with {id, text, metadata?}")
    parser.add_argument("--output", type=Path, default=Path("models/clinical_kb.index.npz"))
    parser.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2")
    args = parser.parse_args()

    if not args.corpus.exists():
        sys.exit(f"Corpus not found: {args.corpus}")

    args.output.parent.mkdir(parents=True, exist_ok=True)

    chunks = load_corpus(args.corpus)
    texts = [c["text"] for c in chunks]
    ids = [c.get("id", str(i)) for i, c in enumerate(chunks)]
    metadata = [json.dumps(c.get("metadata", {})) for c in chunks]

    embeddings = embed_texts(texts, args.model)

    np.savez(
        args.output,
        embeddings=embeddings,
        ids=np.array(ids, dtype=object),
        texts=np.array(texts, dtype=object),
        metadata=np.array(metadata, dtype=object)
    )
    print(f"[build_kb] NumPy index written: {args.output}")

    build_faiss_index(embeddings, args.output)

    print("\n[build_kb] Done. Place the output file(s) in models/ and restart EdgeMind.")


if __name__ == "__main__":
    main()
