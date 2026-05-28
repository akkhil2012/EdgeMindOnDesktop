import type { KbChunk } from '../../../src/types'

interface IndexedChunk extends KbChunk {
  embedding: number[]
}

export class VectorIndex {
  private chunks: IndexedChunk[] = []

  /** Seed with pre-embedded knowledge-base documents */
  load(chunks: IndexedChunk[]): void {
    this.chunks = chunks
    console.log(`[VectorIndex] Loaded ${chunks.length} chunks`)
  }

  /** Cosine-similarity brute-force search (hnswlib-node can replace this for large corpora) */
  search(queryEmbedding: number[], k = 5): Array<{ chunk: KbChunk; score: number }> {
    const start = Date.now()
    const scored = this.chunks.map((c) => ({
      chunk: c as KbChunk,
      score: cosine(queryEmbedding, c.embedding)
    }))
    scored.sort((a, b) => b.score - a.score)
    const results = scored.slice(0, k)
    console.log(`[VectorIndex] search k=${k} in ${Date.now() - start}ms`)
    return results
  }

  get size(): number {
    return this.chunks.length
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
