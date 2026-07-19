-- ONE-TRADE Database Schema
-- Run in Supabase SQL Editor

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  excerpt       TEXT,
  content       TEXT,
  cover_image   TEXT,
  category      TEXT DEFAULT 'Market Insights',
  author        TEXT DEFAULT 'ONE-TRADE Editorial',
  tags          TEXT[],
  published     BOOLEAN DEFAULT false,
  published_at  TIMESTAMPTZ,
  views         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Comments
CREATE TABLE IF NOT EXISTS blog_comments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_name   TEXT NOT NULL,
  author_email  TEXT,
  content       TEXT NOT NULL,
  approved      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  subject       TEXT,
  message       TEXT NOT NULL,
  status        TEXT DEFAULT 'new',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id, approved);
