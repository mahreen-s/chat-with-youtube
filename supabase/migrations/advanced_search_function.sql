-- Create advanced version of match_video_chunks with better search capabilities
CREATE OR REPLACE FUNCTION match_video_chunks_advanced(
  query_embedding VECTOR(1536),
  input_video_id UUID,
  match_threshold FLOAT DEFAULT 0.05,  -- Very low threshold for maximum recall
  match_count INT DEFAULT 20,          -- Return more results for client-side reranking
  min_content_length INT DEFAULT 10    -- Minimum content length to consider
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  chunk_index INT,       -- Include chunk index for context sequence
  content TEXT,
  similarity FLOAT,
  content_length INT     -- Include content length as a relevance signal
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.video_id,
    vc.chunk_index,
    vc.content,
    1 - (vc.embedding <=> query_embedding) AS similarity,
    LENGTH(vc.content) AS content_length
  FROM video_chunks vc
  WHERE 
    vc.video_id = input_video_id
    AND LENGTH(vc.content) >= min_content_length
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    similarity DESC,     -- First by similarity score
    content_length DESC  -- Then prefer longer chunks which may contain more context
  LIMIT match_count;
END;
$$; 