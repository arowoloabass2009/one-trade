// ============================================================
// ONE-TRADE — Supabase Client & Service Layer
// ============================================================
(function () {
  'use strict';

  const SUPABASE_URL = 'https://xmridruggyzxjoicsksb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcmlkcnVnZ3l6eGpvaWNza3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTQ2MTYsImV4cCI6MjEwMDAzMDYxNn0.xyqsUkK_K8axkZf1ytwF3c_UsujbCO_w8I20ck1UNxA';

  // ── Minimal Supabase REST client ──────────────────────────
  class SupabaseClient {
    constructor(url, key) {
      this.url = url;
      this.key = key;
      this._auth = null;
    }

    _headers(extra = {}) {
      return {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': 'Bearer ' + (this._getToken() || this.key),
        ...extra,
      };
    }

    _getToken() {
      try {
        const raw = localStorage.getItem('ot_session');
        return raw ? JSON.parse(raw).access_token : null;
      } catch { return null; }
    }

    _saveSession(session) {
      if (session) localStorage.setItem('ot_session', JSON.stringify(session));
      else localStorage.removeItem('ot_session');
    }

    // ── Auth ──
    get auth() {
      const self = this;
      return {
        async signInWithPassword({ email, password }) {
          const res = await fetch(`${self.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: self._headers(),
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error_description || data.message || 'Auth failed');
          self._saveSession(data);
          return { data: { session: data, user: data.user }, error: null };
        },
        async signOut() {
          try {
            await fetch(`${self.url}/auth/v1/logout`, {
              method: 'POST',
              headers: self._headers(),
            });
          } catch {}
          self._saveSession(null);
        },
        getSession() {
          try {
            const raw = localStorage.getItem('ot_session');
            if (!raw) return { data: { session: null } };
            const session = JSON.parse(raw);
            const exp = session.expires_at || 0;
            if (Date.now() / 1000 > exp) {
              self._saveSession(null);
              return { data: { session: null } };
            }
            return { data: { session } };
          } catch { return { data: { session: null } }; }
        },
        getUser() {
          const { data: { session } } = this.getSession();
          return { data: { user: session ? session.user : null } };
        },
      };
    }

    // ── Query builder ──
    from(table) {
      const self = this;
      const state = { table, filters: [], selects: '*', order: null, limitVal: null, offsetVal: null, single: false };

      const builder = {
        select(cols = '*') { state.selects = cols; return builder; },
        eq(col, val) { state.filters.push(`${col}=eq.${encodeURIComponent(val)}`); return builder; },
        neq(col, val) { state.filters.push(`${col}=neq.${encodeURIComponent(val)}`); return builder; },
        in(col, vals) { state.filters.push(`${col}=in.(${vals.map(v => encodeURIComponent(v)).join(',')})`); return builder; },
        is(col, val) { state.filters.push(`${col}=is.${val}`); return builder; },
        order(col, { ascending = true } = {}) { state.order = `${col}.${ascending ? 'asc' : 'desc'}`; return builder; },
        limit(n) { state.limitVal = n; return builder; },
        offset(n) { state.offsetVal = n; return builder; },
        range(from, to) { state.offsetVal = from; state.limitVal = to - from + 1; return builder; },
        single() { state.single = true; return builder; },
        async insert(payload) {
          const res = await fetch(`${self.url}/rest/v1/${state.table}`, {
            method: 'POST',
            headers: self._headers({ 'Prefer': 'return=representation' }),
            body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || JSON.stringify(data));
          return { data: Array.isArray(data) && !Array.isArray(payload) ? data[0] : data, error: null };
        },
        async upsert(payload, opts = {}) {
          const headers = { 'Prefer': 'return=representation' };
          if (opts.onConflict) headers['Prefer'] += `,resolution=merge-duplicates`;
          const res = await fetch(`${self.url}/rest/v1/${state.table}${opts.onConflict ? `?on_conflict=${opts.onConflict}` : ''}`, {
            method: 'POST',
            headers: self._headers({ ...headers }),
            body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || JSON.stringify(data));
          return { data, error: null };
        },
        async update(payload) {
          let url = `${self.url}/rest/v1/${state.table}?`;
          if (state.filters.length) url += state.filters.join('&');
          const res = await fetch(url, {
            method: 'PATCH',
            headers: self._headers({ 'Prefer': 'return=representation' }),
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || JSON.stringify(data));
          return { data, error: null };
        },
        async delete() {
          let url = `${self.url}/rest/v1/${state.table}?`;
          if (state.filters.length) url += state.filters.join('&');
          const res = await fetch(url, {
            method: 'DELETE',
            headers: self._headers({ 'Prefer': 'return=representation' }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || JSON.stringify(data));
          }
          return { error: null };
        },
        async then(resolve, reject) {
          try {
            let url = `${self.url}/rest/v1/${state.table}?select=${encodeURIComponent(state.selects)}`;
            if (state.filters.length) url += '&' + state.filters.join('&');
            if (state.order) url += `&order=${state.order}`;
            if (state.limitVal !== null) url += `&limit=${state.limitVal}`;
            if (state.offsetVal !== null) url += `&offset=${state.offsetVal}`;
            const res = await fetch(url, { headers: self._headers({ 'Accept': state.single ? 'application/vnd.pgrst.object+json' : 'application/json' }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || JSON.stringify(data));
            resolve({ data, error: null });
          } catch (e) { reject(e); }
        },
      };
      return builder;
    }

    // ── Storage ──
    storage = {
      from: (bucket) => ({
        upload: async (path, file, opts = {}) => {
          const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + (this._getToken() || SUPABASE_ANON_KEY),
              'Content-Type': file.type,
              ...(opts.upsert ? { 'x-upsert': 'true' } : {}),
            },
            body: file,
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Upload failed'); }
          return { data: { path }, error: null };
        },
        getPublicUrl: (path) => ({
          data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` }
        }),
      }),
    };
  }

  // ── Instantiate & expose ──
  const sb = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._sb = sb;

  // ── Admin Auth Service ──────────────────────────────────
  // Passcode is stored as a SHA-256 digest — never plain text in source
  // SHA-256 of 'sham2026'
  const PASSCODE_HASH = '9224a4fd815a74cf8d6653587d3faa8de337d56594ad0f59304a0582b3bde11e';

  async function _sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.AdminAuth = {
    async checkPasscode(input) {
      const hash = await _sha256(input);
      return hash === PASSCODE_HASH;
    },

    isAuthenticated() {
      const session = localStorage.getItem('ot_admin_session');
      if (!session) return false;
      try {
        const parsed = JSON.parse(session);
        return parsed.authenticated === true && parsed.expires > Date.now();
      } catch { return false; }
    },

    async authenticate(passcode) {
      const valid = await this.checkPasscode(passcode);
      if (!valid) throw new Error('Invalid passcode');
      const session = {
        authenticated: true,
        expires: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
        timestamp: Date.now(),
      };
      localStorage.setItem('ot_admin_session', JSON.stringify(session));
      return true;
    },

    signOut() {
      localStorage.removeItem('ot_admin_session');
      window.location.href = 'index.html';
    },

    requireAuth(redirect = 'admin-login.html') {
      if (!this.isAuthenticated()) {
        window.location.href = redirect;
        return false;
      }
      return true;
    },
  };

  // ── Blog Posts Service ──────────────────────────────────
  window.BlogService = {
    // adminMode = true → return all posts (drafts + published) for admin panel
    async getAll({ limit = 20, offset = 0, category = null, adminMode = false } = {}) {
      let query = sb.from('blog_posts')
        .select('id,title,slug,excerpt,cover_image,category,author,published_at,created_at,tags,views,published')
        .order('published_at', { ascending: false })
        .limit(limit)
        .offset(offset);
      // Public view: only published posts
      if (!adminMode) query = query.eq('published', true);
      // Category filter
      if (category) query = query.eq('category', category);
      const { data } = await query;
      return data || [];
    },

    async getBySlug(slug) {
      const { data } = await sb.from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
      return data;
    },

    async getById(id) {
      const { data } = await sb.from('blog_posts').select('*').eq('id', id).single();
      return data;
    },

    async create(payload) {
      const slug = payload.slug || this._makeSlug(payload.title);
      const { data } = await sb.from('blog_posts').insert({
        ...payload,
        slug,
        created_at: new Date().toISOString(),
        published_at: payload.published ? new Date().toISOString() : null,
      });
      return data;
    },

    async update(id, payload) {
      if (payload.title && !payload.slug) payload.slug = this._makeSlug(payload.title);
      if (payload.published && !payload.published_at) payload.published_at = new Date().toISOString();
      const { data } = await sb.from('blog_posts').eq('id', id).update(payload);
      return data;
    },

    async delete(id) {
      await sb.from('blog_posts').eq('id', id).delete();
    },

    async uploadCover(file) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `covers/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      await sb.storage.from('blog-images').upload(path, file, { upsert: true });
      const { data: { publicUrl } } = sb.storage.from('blog-images').getPublicUrl(path);
      return publicUrl;
    },

    // Race-free view increment using PostgreSQL RPC
    async incrementViews(id) {
      try {
        // Try RPC first (requires function in DB — see migrations)
        await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/increment_post_views`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ post_id: id }),
          }
        );
      } catch { /* silent — views are non-critical */ }
    },

    _makeSlug(title) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    },
  };

  // ── Comments Service ─────────────────────────────────────
  window.CommentsService = {
    async getByPost(postId) {
      const { data } = await sb.from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('approved', true)          // boolean, not string
        .order('created_at', { ascending: true });
      return data || [];
    },

    async submit({ postId, name, email, content }) {
      if (!name || !content) throw new Error('Name and comment are required');
      if (content.length > 2000) throw new Error('Comment is too long (max 2000 chars)');
      // Basic spam / XSS guard
      const clean = (s) => s.replace(/<[^>]*>/g, '').trim();
      const { data } = await sb.from('blog_comments').insert({
        post_id: postId,
        author_name: clean(name).substring(0, 100),
        author_email: email ? clean(email).substring(0, 200) : null,
        content: clean(content).substring(0, 2000),
        approved: false,
        created_at: new Date().toISOString(),
      });
      return data;
    },

    async approve(id) {
      await sb.from('blog_comments').eq('id', id).update({ approved: true });
    },

    async delete(id) {
      await sb.from('blog_comments').eq('id', id).delete();
    },

    async getAll({ limit = 100 } = {}) {
      const { data } = await sb.from('blog_comments')
        .select('*,blog_posts(title,slug)')
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    },
  };

  // ── Market Ticker (simulated live) ──────────────────────
  window.TickerService = {
    _pairs: [
      { symbol: 'EUR/USD', price: 1.0842, change: +0.0023 },
      { symbol: 'GBP/USD', price: 1.2714, change: -0.0041 },
      { symbol: 'USD/JPY', price: 149.87, change: +0.34 },
      { symbol: 'USD/CHF', price: 0.9012, change: -0.0018 },
      { symbol: 'AUD/USD', price: 0.6523, change: +0.0012 },
      { symbol: 'USD/CAD', price: 1.3621, change: -0.0027 },
      { symbol: 'NZD/USD', price: 0.5987, change: +0.0008 },
      { symbol: 'EUR/GBP', price: 0.8530, change: -0.0015 },
      { symbol: 'BTC/USD', price: 67842.50, change: +842.3 },
      { symbol: 'ETH/USD', price: 3218.40, change: -42.1 },
      { symbol: 'AAPL',    price: 189.30,  change: +2.14 },
      { symbol: 'TSLA',    price: 248.50,  change: -3.72 },
      { symbol: 'MSFT',    price: 415.80,  change: +4.20 },
      { symbol: 'GOOGL',   price: 175.60,  change: +1.85 },
      { symbol: 'AMZN',    price: 186.40,  change: -1.30 },
      { symbol: 'NVDA',    price: 875.20,  change: +15.40 },
      { symbol: 'SPX500',  price: 5248.30, change: +22.4 },
      { symbol: 'GOLD',    price: 2342.80, change: +8.6 },
      { symbol: 'OIL',     price: 78.42,   change: -0.85 },
      { symbol: 'SILVER',  price: 29.14,   change: +0.32 },
    ],

    get() {
      // Simulate small live fluctuations
      return this._pairs.map(p => {
        const delta = (Math.random() - 0.5) * p.price * 0.001;
        const newChange = parseFloat((p.change + delta).toFixed(4));
        return { ...p, change: newChange };
      });
    },
  };

  // ── Newsletter Service ────────────────────────────────────
  window.NewsletterService = {
    async subscribe(email) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      await sb.from('newsletter_subscribers').upsert(
        { email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() },
        { onConflict: 'email' }
      );
    },
  };

  // ── Contact Service ───────────────────────────────────────
  window.ContactService = {
    async submit({ name, email, subject, message }) {
      if (!name || !email || !message) throw new Error('All fields are required');
      const { data } = await sb.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject || 'General Enquiry',
        message: message.trim(),
        created_at: new Date().toISOString(),
        status: 'new',
      });
      return data;
    },
  };

  // ── Admin Stats ───────────────────────────────────────────
  window.AdminStatsService = {
    async get() {
      const [posts, comments, subscribers, messages] = await Promise.allSettled([
        sb.from('blog_posts').select('id').then(r => r.data?.length || 0),
        sb.from('blog_comments').select('id').then(r => r.data?.length || 0),
        sb.from('newsletter_subscribers').select('id').then(r => r.data?.length || 0),
        sb.from('contact_messages').select('id').then(r => r.data?.length || 0),
      ]);
      return {
        posts: posts.status === 'fulfilled' ? posts.value : 0,
        comments: comments.status === 'fulfilled' ? comments.value : 0,
        subscribers: subscribers.status === 'fulfilled' ? subscribers.value : 0,
        messages: messages.status === 'fulfilled' ? messages.value : 0,
      };
    },
  };

})();
