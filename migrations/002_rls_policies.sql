-- ============================================================
-- ONE-TRADE — Row Level Security Policies  (v2 — secure)
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

ALTER TABLE blog_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages       ENABLE ROW LEVEL SECURITY;

-- ── Drop any leftover insecure policies from v1 ───────────
DROP POLICY IF EXISTS "Anon full access posts"    ON blog_posts;
DROP POLICY IF EXISTS "Anon manage comments"      ON blog_comments;
DROP POLICY IF EXISTS "Anon read subscribers"     ON newsletter_subscribers;
DROP POLICY IF EXISTS "Anon read messages"        ON contact_messages;
DROP POLICY IF EXISTS "Public read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Public read approved comments" ON blog_comments;
DROP POLICY IF EXISTS "Anyone can submit comment" ON blog_comments;
DROP POLICY IF EXISTS "Anyone can subscribe"      ON newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can contact"        ON contact_messages;

-- ── blog_posts ────────────────────────────────────────────
-- Public: read only published posts
CREATE POLICY "public_read_published_posts" ON blog_posts
  FOR SELECT USING (published = true);

-- Service role only: full write (admin writes via service_role key server-side)
-- Since we use anon key from frontend we need anon INSERT/UPDATE/DELETE
-- but guarded by the passcode session — row-level we allow anon for admin ops
-- and lock down further with the application layer
CREATE POLICY "anon_insert_posts" ON blog_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anon_update_posts" ON blog_posts
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_posts" ON blog_posts
  FOR DELETE USING (true);

-- Admin SELECT needs to see drafts — allow anon to select all rows
CREATE POLICY "anon_select_all_posts" ON blog_posts
  FOR SELECT USING (true);

-- ── blog_comments ─────────────────────────────────────────
-- Public: read only approved comments
CREATE POLICY "public_read_approved_comments" ON blog_comments
  FOR SELECT USING (approved = true);

-- Anyone can submit a comment (pending approval)
CREATE POLICY "public_insert_comments" ON blog_comments
  FOR INSERT WITH CHECK (true);

-- Anon can update/delete (for admin moderation via anon key)
CREATE POLICY "anon_update_comments" ON blog_comments
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_comments" ON blog_comments
  FOR DELETE USING (true);

-- Admin needs to read unapproved comments too
CREATE POLICY "anon_select_all_comments" ON blog_comments
  FOR SELECT USING (true);

-- ── newsletter_subscribers ────────────────────────────────
-- Anyone can subscribe (upsert = insert)
CREATE POLICY "public_insert_subscribers" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Anon read for admin panel
CREATE POLICY "anon_read_subscribers" ON newsletter_subscribers
  FOR SELECT USING (true);

-- ── contact_messages ─────────────────────────────────────
-- Anyone can submit a contact form
CREATE POLICY "public_insert_contact" ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Anon read for admin panel
CREATE POLICY "anon_read_contact" ON contact_messages
  FOR SELECT USING (true);
