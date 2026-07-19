-- ============================================================
-- ONE-TRADE — RPC Functions
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Race-free view counter — called by BlogService.incrementViews()
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = post_id;
$$;

-- Grant anon role permission to call it
GRANT EXECUTE ON FUNCTION increment_post_views(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_post_views(UUID) TO authenticated;
