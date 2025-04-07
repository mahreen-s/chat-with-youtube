-- Update the match_video_chunks function with a lower default threshold
CREATE OR REPLACE FUNCTION match_video_chunks(
  query_embedding VECTOR(1536),
  input_video_id UUID,
  match_threshold FLOAT DEFAULT 0.3,  -- Lower threshold (was 0.5)
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.video_id,
    vc.content,
    1 - (vc.embedding <=> query_embedding) AS similarity
  FROM video_chunks vc
  WHERE vc.video_id = input_video_id
  AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$; 