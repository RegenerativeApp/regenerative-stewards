import OpenAI from 'openai'
import { createClient } from '@/lib/supabase-server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface KnowledgeChunk {
  chunk_id: string
  source_document: string
  topic: string
  summary: string
  content: string
  similarity: number
}

export async function retrieveRelevantChunks(
  query: string,
  options?: {
    matchCount?: number
  }
): Promise<KnowledgeChunk[]> {
  const matchCount = options?.matchCount ?? 5

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query.slice(0, 8000),
  })
  const queryEmbedding = embeddingResponse.data[0].embedding

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('match_plant_knowledge', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })

  if (error) {
    console.error('RAG retrieval error:', error)
    return []
  }

  return (data ?? []) as KnowledgeChunk[]
}
