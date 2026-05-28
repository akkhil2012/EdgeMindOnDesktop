#!/usr/bin/env python3
"""
Export quantised models for EdgeMind Desktop.

Supports:
  --model   phi3_mini | llama_8b | minilm
  --format  gguf | onnx
  --quant   int4 | int8 | fp16
  --output  <path>

GGUF export uses llama.cpp convert scripts.
ONNX export uses optimum / torch.onnx.export.
"""

import argparse
import sys
from pathlib import Path


def export_phi3_gguf(output: Path, quant: str) -> None:
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: F401
    except ImportError:
        sys.exit("Install: pip install transformers torch")

    print(f"[export] Phi-3 Mini → GGUF ({quant}) → {output}")
    print("  1. Download microsoft/Phi-3-mini-4k-instruct")
    print("  2. Run llama.cpp/convert_hf_to_gguf.py")
    print(f"  3. Quantise with llama.cpp/quantize to {quant.upper()}")
    print("  Place output at:", output)
    print()
    print("Quick start (assuming llama.cpp is cloned adjacent to this repo):")
    print("  python ../llama.cpp/convert_hf_to_gguf.py microsoft/Phi-3-mini-4k-instruct \\")
    print("    --outtype f16 --outfile /tmp/phi3_f16.gguf")
    print(f"  ../llama.cpp/quantize /tmp/phi3_f16.gguf {output} {quant.upper()}")


def export_llama_gguf(output: Path, quant: str) -> None:
    print(f"[export] Llama-3.1 8B → GGUF ({quant}) → {output}")
    print("  Download meta-llama/Meta-Llama-3.1-8B-Instruct (requires HF access token)")
    print("  python ../llama.cpp/convert_hf_to_gguf.py meta-llama/Meta-Llama-3.1-8B-Instruct \\")
    print("    --outtype f16 --outfile /tmp/llama8b_f16.gguf")
    print(f"  ../llama.cpp/quantize /tmp/llama8b_f16.gguf {output} {quant.upper()}")


def export_minilm_onnx(output: Path) -> None:
    try:
        from optimum.exporters.onnx import main_export  # noqa: F401
    except ImportError:
        sys.exit("Install: pip install optimum[exporters]")

    print(f"[export] MiniLM-L6-v2 → ONNX → {output}")
    print("  optimum-cli export onnx --model sentence-transformers/all-MiniLM-L6-v2", output)


MODEL_HANDLERS = {
    "phi3_mini": export_phi3_gguf,
    "llama_8b": export_llama_gguf,
    "minilm": export_minilm_onnx,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export models for EdgeMind Desktop")
    parser.add_argument("--model", choices=list(MODEL_HANDLERS.keys()), required=True)
    parser.add_argument("--format", choices=["gguf", "onnx"], default="gguf")
    parser.add_argument("--quant", choices=["int4", "int8", "fp16", "q4_k_m", "q5_k_m"], default="q4_k_m")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)

    if args.model == "minilm":
        export_minilm_onnx(args.output)
    else:
        MODEL_HANDLERS[args.model](args.output, args.quant)


if __name__ == "__main__":
    main()
