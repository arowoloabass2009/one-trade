// ============================================================
// ONE-TRADE — TypeScript Application Core  v1.0
// World-Class Forex & Stock Investment Platform
// ============================================================

// ─────────────────── Service Declarations ──────────────────
declare const AdminAuth: {
  checkPasscode(input: string): Promise<boolean>;
  isAuthenticated(): boolean;
  authenticate(passcode: string): Promise<boolean>;
  signOut(): void;
  requireAuth(redirect?: string): boolean;
};

declare const BlogService: {
  getAll(opts?: { limit?: number; offset?: number; category?: string; adminMode?: boolean }): Promise<BlogPost[]>;
  getBySlug(slug: string): Promise<BlogPost | null>;
  getById(id: string): Promise<BlogPost | null>;
  create(payload: Partial<BlogPost>): Promise<BlogPost>;
  update(id: string, payload: Partial<BlogPost>): Promise<BlogPost>;
  delete(id: string): Promise<void>;
  uploadCover(file: File): Promise<string>;
  incrementViews(id: string): Promise<void>;
  _makeSlug(title: string): string;
};

declare const CommentsService: {
  getByPost(postId: string): Promise<BlogComment[]>;
  submit(data: { postId: string; name: string; email: string; content: string }): Promise<BlogComment>;
  approve(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  getAll(opts?: { limit?: number }): Promise<BlogComment[]>;
};

declare const TickerService: {
  get(): TickerItem[];
};

declare const NewsletterService: {
  subscribe(email: string): Promise<void>;
};

declare const ContactService: {
  submit(data: { name: string; email: string; subject: string; message: string }): Promise<void>;
};

declare const AdminStatsService: {
  get(): Promise<AdminStats>;
};

interface AppWindow extends Window {
  _sb: any;
  _toast: Toast;
  FormValidator: typeof FormValidator;
  debounce: typeof debounce;
  updateOrderStatus?: (id: string, status: string) => void;
  approveComment?: (id: string) => void;
  deleteComment?: (id: string) => void;
  deletePost?: (id: string) => void;
  editPost?: (id: string) => void;
  adminNavTo?: (panel: string) => void;
}

// ─────────────────── Types ─────────────────────────────────
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  author: string;
  tags: string[];
  published: boolean;
  published_at: string;
  views: number;
  created_at: string;
  updated_at: string;
}

interface BlogComment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  approved: boolean;
  created_at: string;
}

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
}

interface AdminStats {
  posts: number;
  comments: number;
  subscribers: number;
  messages: number;
}

interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

// ─────────────────── Utilities ─────────────────────────────
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const formatCurrency = (n: number, digits = 2): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay: number): T => {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
};

const qs = <T extends Element = Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

const qsa = <T extends Element = Element>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

// ─────────────────── Toast ──────────────────────────────────
class Toast {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message: string, type: ToastType = 'info', duration = 4500): void {
    const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML =
      `<span class="toast-icon">${icons[type]}</span>` +
      `<span class="toast-msg">${escapeHtml(message)}</span>` +
      `<button class="toast-close" aria-label="Close">✕</button>`;
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-enter'));
    const close = (): void => {
      toast.classList.add('toast-exit');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };
    toast.querySelector('.toast-close')?.addEventListener('click', close);
    setTimeout(close, duration);
  }
}

// ─────────────────── Form Validator ────────────────────────
class FormValidator {
  static validateEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  static validateRequired(v: string): boolean {
    return v.trim().length > 0;
  }
  static validate(form: HTMLFormElement): FormValidationResult {
    const errors: Record<string, string> = {};
    qsa<HTMLInputElement>('[data-validate]', form).forEach(el => {
      const rules = (el.dataset.validate || '').split('|');
      const label = el.dataset.label || el.placeholder || el.name || 'Field';
      const value = el.value;
      if (rules.includes('required') && !this.validateRequired(value))
        errors[el.name] = `${label} is required`;
      if (rules.includes('email') && value && !this.validateEmail(value))
        errors[el.name] = 'Enter a valid email address';
    });
    return { isValid: Object.keys(errors).length === 0, errors };
  }
  static showErrors(form: HTMLFormElement, errors: Record<string, string>): void {
    qsa('.field-error', form).forEach(el => el.remove());
    qsa<HTMLElement>('.form-control', form).forEach(el => el.classList.remove('error'));
    Object.entries(errors).forEach(([name, msg]) => {
      const inp = qs<HTMLInputElement>(`[name="${name}"]`, form);
      if (!inp) return;
      inp.classList.add('error');
      const span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = msg;
      inp.parentElement?.appendChild(span);
      inp.addEventListener('input', () => { inp.classList.remove('error'); span.remove(); }, { once: true });
    });
    qs<HTMLElement>('.form-control.error', form)?.focus();
  }
}

// ─────────────────── Navbar ────────────────────────────────
class Navbar {
  private nav: HTMLElement | null;
  private hamburger: HTMLElement | null;
  private navMenu: HTMLElement | null;
  private navActions: HTMLElement | null;

  constructor() {
    this.nav        = qs('#navbar');
    this.hamburger  = qs('#hamburger');
    this.navMenu    = qs('#navMenu');
    this.navActions = qs('#navActions');
    this.init();
  }

  private init(): void {
    window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    this.hamburger?.addEventListener('click', () => {
      this.navMenu?.classList.toggle('open');
      this.navActions?.classList.toggle('open');
      this.hamburger?.classList.toggle('open');
    });
    document.addEventListener('click', (e: MouseEvent) => {
      if (!(e.target as Element).closest('.navbar')) {
        this.navMenu?.classList.remove('open');
        this.navActions?.classList.remove('open');
        this.hamburger?.classList.remove('open');
      }
    });
    this.setActive();
  }

  private onScroll(): void {
    this.nav?.classList.toggle('scrolled', window.scrollY > 20);
  }

  private setActive(): void {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    qsa<HTMLAnchorElement>('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      const page = href.split('#')[0] || '';
      if (page === current || (current === '' && page === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
}

// ─────────────────── Scroll Animator ───────────────────────
class ScrollAnimator {
  private observer: IntersectionObserver;

  constructor() {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    this.observe();
  }

  observe(): void {
    qsa('.reveal, .reveal-left, .reveal-right').forEach(el => {
      if (!el.classList.contains('visible')) this.observer.observe(el);
    });
  }
}

// ─────────────────── Counter Animation ─────────────────────
const animateCounter = (el: HTMLElement, target: number, duration = 2000): void => {
  const t0 = performance.now();
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const tick = (now: number): void => {
    const p = Math.min((now - t0) / duration, 1);
    const v = Math.floor((1 - Math.pow(1 - p, 3)) * target);
    el.textContent = prefix + v.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = prefix + target.toLocaleString() + suffix;
  };
  requestAnimationFrame(tick);
};

// ─────────────────── Page Loader ───────────────────────────
const hideLoader = (): void => {
  const loader = qs('#page-loader');
  if (loader) setTimeout(() => loader.classList.add('hidden'), 400);
};

// ─────────────────── Particles ─────────────────────────────
const initParticles = (container: HTMLElement, count = 18): void => {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`,
      `bottom:${Math.random() * -20}%`,
      `animation-duration:${Math.random() * 15 + 10}s`,
      `animation-delay:${Math.random() * 10}s`,
    ].join(';');
    container.appendChild(p);
  }
};

// ─────────────────── Live Ticker ───────────────────────────
const initTicker = (): void => {
  const inner = qs('#tickerInner');
  if (!inner) return;

  const renderTicker = (): void => {
    const items = TickerService.get();
    const html = items.map(item => {
      const up = item.change >= 0;
      const chStr = (up ? '+' : '') + item.change.toFixed(item.price > 100 ? 2 : 4);
      return `<span class="ticker-item">
        <span class="ticker-symbol">${escapeHtml(item.symbol)}</span>
        <span class="ticker-price">${item.price > 1000 ? formatCurrency(item.price, 2) : item.price.toFixed(item.price > 100 ? 2 : 4)}</span>
        <span class="ticker-change ${up ? 'up' : 'down'}">${chStr}</span>
      </span>`;
    }).join('');
    // Duplicate for seamless scroll
    inner.innerHTML = `<span class="ticker-label">LIVE</span>${html}${html}`;
  };

  renderTicker();
  setInterval(renderTicker, 8000);

  // Update nav ticker pill
  const navPill = qs('#navLivePair');
  if (navPill) {
    setInterval(() => {
      const items = TickerService.get();
      const eu = items.find(i => i.symbol === 'EUR/USD');
      if (eu) navPill.textContent = `EUR/USD ${eu.price.toFixed(4)}`;
    }, 5000);
  }
};

// ─────────────────── Hero Chart ────────────────────────────
const initHeroChart = (): void => {
  const chartLine = qs<SVGPathElement>('#chartLine');
  const chartFill = qs<SVGPathElement>('#chartFill');
  const priceEl   = qs('#heroChartPrice');
  const changeEl  = qs('#heroChartChange');
  if (!chartLine || !chartFill) return;

  let prices: number[] = [];
  const basePrice = 1.0842;

  const generatePoint = (last: number): number => last + (Math.random() - 0.48) * 0.0008;

  // Initial data
  for (let i = 0; i < 40; i++) {
    prices.push(i === 0 ? basePrice : generatePoint(prices[i - 1]));
  }

  const drawChart = (): void => {
    const W = 300, H = 100;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.001;
    const toY = (v: number): number => H - ((v - min) / range) * (H - 10) - 5;
    const toX = (i: number): number => (i / (prices.length - 1)) * W;

    let d = `M${toX(0)},${toY(prices[0])}`;
    prices.forEach((p, i) => { if (i > 0) d += ` L${toX(i)},${toY(p)}`; });
    chartLine.setAttribute('d', d);
    chartFill.setAttribute('d', `${d} L${W},${H} L0,${H} Z`);

    const last = prices[prices.length - 1];
    const change = last - basePrice;
    if (priceEl) priceEl.textContent = last.toFixed(4);
    if (changeEl) {
      const pct = ((change / basePrice) * 100).toFixed(2);
      changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(4)} (${pct}%)`;
      changeEl.className = `chart-price-change ${change >= 0 ? '' : 'down'}`;
    }
  };

  drawChart();
  setInterval(() => {
    prices.push(generatePoint(prices[prices.length - 1]));
    if (prices.length > 60) prices.shift();
    drawChart();
  }, 2000);
};

// ─────────────────── Markets Table ─────────────────────────
const MARKET_DATA: Record<string, TickerItem[]> = {
  forex: [
    { symbol: 'EUR/USD', price: 1.0842, change: 0.0023 },
    { symbol: 'GBP/USD', price: 1.2714, change: -0.0041 },
    { symbol: 'USD/JPY', price: 149.87, change: 0.34 },
    { symbol: 'USD/CHF', price: 0.9012, change: -0.0018 },
    { symbol: 'AUD/USD', price: 0.6523, change: 0.0012 },
    { symbol: 'USD/CAD', price: 1.3621, change: -0.0027 },
    { symbol: 'NZD/USD', price: 0.5987, change: 0.0008 },
    { symbol: 'EUR/GBP', price: 0.8530, change: -0.0015 },
  ],
  stocks: [
    { symbol: 'AAPL',  price: 189.30, change: 2.14 },
    { symbol: 'TSLA',  price: 248.50, change: -3.72 },
    { symbol: 'MSFT',  price: 415.80, change: 4.20 },
    { symbol: 'GOOGL', price: 175.60, change: 1.85 },
    { symbol: 'AMZN',  price: 186.40, change: -1.30 },
    { symbol: 'NVDA',  price: 875.20, change: 15.40 },
    { symbol: 'SPX500',price: 5248.30, change: 22.40 },
    { symbol: 'META',  price: 498.70, change: 6.20 },
  ],
  crypto: [
    { symbol: 'BTC/USD', price: 67842.50, change: 842.3 },
    { symbol: 'ETH/USD', price: 3218.40,  change: -42.1 },
    { symbol: 'BNB/USD', price: 412.80,   change: 8.4 },
    { symbol: 'SOL/USD', price: 168.20,   change: 12.6 },
    { symbol: 'XRP/USD', price: 0.5824,   change: 0.012 },
    { symbol: 'ADA/USD', price: 0.4512,   change: -0.008 },
  ],
  commodities: [
    { symbol: 'GOLD',   price: 2342.80, change: 8.60 },
    { symbol: 'SILVER', price: 29.14,   change: 0.32 },
    { symbol: 'OIL',    price: 78.42,   change: -0.85 },
    { symbol: 'NATGAS', price: 2.148,   change: 0.042 },
    { symbol: 'WHEAT',  price: 548.30,  change: -4.20 },
    { symbol: 'COPPER', price: 4.512,   change: 0.028 },
  ],
};

const MARKET_NAMES: Record<string, string> = {
  'EUR/USD':'Euro / US Dollar', 'GBP/USD':'British Pound / USD', 'USD/JPY':'USD / Japanese Yen',
  'USD/CHF':'USD / Swiss Franc', 'AUD/USD':'Australian Dollar / USD', 'USD/CAD':'USD / Canadian Dollar',
  'NZD/USD':'NZ Dollar / USD', 'EUR/GBP':'Euro / British Pound',
  'AAPL':'Apple Inc.', 'TSLA':'Tesla Inc.', 'MSFT':'Microsoft Corp.', 'GOOGL':'Alphabet Inc.',
  'AMZN':'Amazon.com Inc.', 'NVDA':'NVIDIA Corp.', 'SPX500':'S&P 500 Index', 'META':'Meta Platforms',
  'BTC/USD':'Bitcoin / USD', 'ETH/USD':'Ethereum / USD', 'BNB/USD':'Binance Coin', 'SOL/USD':'Solana',
  'XRP/USD':'Ripple / USD', 'ADA/USD':'Cardano / USD',
  'GOLD':'Gold Spot', 'SILVER':'Silver Spot', 'OIL':'Crude Oil WTI', 'NATGAS':'Natural Gas',
  'WHEAT':'Wheat Futures', 'COPPER':'Copper Futures',
};

const renderMarketsTable = (market: string): void => {
  const tbody = qs('#marketsTableBody');
  if (!tbody) return;
  const items = MARKET_DATA[market] || [];
  tbody.innerHTML = items.map(item => {
    const up = item.change >= 0;
    const chStr = (up ? '+' : '') + item.change.toFixed(item.price > 100 ? 2 : 4);
    const pct = ((item.change / item.price) * 100).toFixed(2);
    const priceFmt = item.price > 1000
      ? formatCurrency(item.price, 2)
      : item.price.toFixed(item.price > 10 ? 2 : 4);
    const sparkPath = (() => {
      const pts: number[] = [item.price];
      for (let i = 1; i < 12; i++) pts.push(pts[i-1] + (Math.random()-0.47)*item.price*0.003);
      const min = Math.min(...pts), max = Math.max(...pts);
      const r = max - min || 1;
      return pts.map((p,i) => `${(i/11)*80},${30-((p-min)/r)*28}`).join(' L');
    })();
    return `<tr class="market-row">
      <td><div class="market-symbol">${escapeHtml(item.symbol)}</div></td>
      <td><div class="market-name">${escapeHtml(MARKET_NAMES[item.symbol] || item.symbol)}</div></td>
      <td><div class="market-price">${priceFmt}</div></td>
      <td><span class="market-change ${up ? 'up' : 'down'}">${chStr}</span></td>
      <td><span class="badge ${up ? 'badge-green' : 'badge-red'}">${up ? '+' : ''}${pct}%</span></td>
      <td><svg class="market-sparkline" viewBox="0 0 80 30"><path d="M${sparkPath}" fill="none" stroke="${up ? '#4ade80' : '#f87171'}" stroke-width="1.5"/></svg></td>
    </tr>`;
  }).join('');
};

const initMarketsSection = (): void => {
  const tabs = qsa<HTMLButtonElement>('.market-tab');
  renderMarketsTable('forex');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMarketsTable(tab.dataset.market || 'forex');
    });
  });
  // Refresh data every 6 seconds
  setInterval(() => {
    const active = qs<HTMLButtonElement>('.market-tab.active');
    if (active) renderMarketsTable(active.dataset.market || 'forex');
  }, 6000);
};

// ─────────────────── Blog Card Renderer ────────────────────
const renderBlogCard = (post: BlogPost): string => {
  const cat = escapeHtml(post.category || 'Insights');
  const title = escapeHtml(post.title || '');
  const excerpt = escapeHtml(post.excerpt || '');
  const author = escapeHtml(post.author || 'ONE-TRADE Editorial');
  const date = post.published_at ? formatDate(post.published_at) : formatDate(post.created_at);
  const imgHTML = post.cover_image
    ? `<img src="${escapeHtml(post.cover_image)}" alt="${title}" loading="lazy">`
    : `<div class="blog-card-img-placeholder">📊</div>`;

  return `<article class="blog-card reveal" data-post-id="${escapeHtml(post.id)}">
    <div class="blog-card-img">
      ${imgHTML}
      <span class="blog-card-category tag">${cat}</span>
    </div>
    <div class="blog-card-body">
      <div class="blog-card-meta">
        <span>${author}</span>
        <span class="blog-card-meta-sep">·</span>
        <span>${date}</span>
        ${post.views ? `<span class="blog-card-meta-sep">·</span><span>${post.views} views</span>` : ''}
      </div>
      <h3 class="blog-card-title">${title}</h3>
      <p class="blog-card-excerpt">${excerpt}</p>
      <div class="blog-card-footer">
        <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="blog-card-read-link">
          Read More <span>→</span>
        </a>
      </div>
    </div>
  </article>`;
};

// ─────────────────── Home Blog Grid ────────────────────────
const loadHomeBlogGrid = async (): Promise<void> => {
  const grid = qs('#homeBlogGrid');
  if (!grid) return;
  try {
    const posts = await BlogService.getAll({ limit: 3 });
    if (!posts.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:16px;">📝</div>
        <p>No articles published yet. Check back soon.</p>
      </div>`;
      return;
    }
    grid.innerHTML = posts.map(renderBlogCard).join('');
    new ScrollAnimator();
  } catch (err) {
    console.error('Blog load error:', err);
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">
      <p>Could not load articles at this time.</p>
    </div>`;
  }
};

// ─────────────────── Blog Listing Page ─────────────────────
let blogOffset = 0;
const BLOG_PAGE_SIZE = 9;
let currentBlogCategory = '';

const loadBlogGrid = async (reset = false): Promise<void> => {
  const grid = qs('#blogGrid');
  if (!grid) return;
  if (reset) { blogOffset = 0; grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px"><div class="spinner"></div></div>`; }
  try {
    const posts = await BlogService.getAll({
      limit: BLOG_PAGE_SIZE + 1,
      offset: blogOffset,
      category: currentBlogCategory || undefined,
    });
    const hasMore = posts.length > BLOG_PAGE_SIZE;
    const toShow = posts.slice(0, BLOG_PAGE_SIZE);
    if (reset) grid.innerHTML = '';
    if (!toShow.length && blogOffset === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px;color:var(--text-muted);">
        <div style="font-size:4rem;margin-bottom:24px;">📰</div>
        <h3 style="color:var(--white);margin-bottom:12px;">No Articles Yet</h3>
        <p>Our editors are preparing fresh market insights. Check back soon.</p>
      </div>`;
    } else {
      grid.insertAdjacentHTML('beforeend', toShow.map(renderBlogCard).join(''));
      new ScrollAnimator();
      blogOffset += BLOG_PAGE_SIZE;
    }
    const loadMoreBtn = qs<HTMLButtonElement>('#loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
  } catch (err) {
    console.error('Blog grid error:', err);
  }
};

const initBlogPage = (): void => {
  if (!qs('#blogGrid')) return;
  loadBlogGrid(true);

  // Filter buttons
  qsa<HTMLButtonElement>('.blog-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.blog-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBlogCategory = btn.dataset.cat || '';
      loadBlogGrid(true);
    });
  });

  // Search
  const searchInput = qs<HTMLInputElement>('#blogSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((...args: unknown[]) => {
      const q = ((args[0] as Event).target as HTMLInputElement).value.toLowerCase().trim();
      const grid = qs('#blogGrid');
      if (!grid) return;
      qsa<HTMLElement>('.blog-card', grid).forEach(card => {
        const titleEl = qs('.blog-card-title', card);
        const excerptEl = qs('.blog-card-excerpt', card);
        const text = ((titleEl?.textContent || '') + ' ' + (excerptEl?.textContent || '')).toLowerCase();
        (card as HTMLElement).style.display = !q || text.includes(q) ? '' : 'none';
      });
    }, 300) as EventListener);
  }

  // Load more
  qs('#loadMoreBtn')?.addEventListener('click', () => loadBlogGrid(false));
};

// ─────────────────── Blog Post Page ────────────────────────
const initPostPage = async (): Promise<void> => {
  const postHeroContent = qs('#postHeroContent');
  const postArticleWrap = qs('#postArticleWrap');
  if (!postHeroContent || !postArticleWrap) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id   = params.get('id');

  if (!slug && !id) {
    postHeroContent.innerHTML = `<p style="color:var(--text-muted);">Post not found. <a href="blog.html" style="color:var(--gold);">Return to blog →</a></p>`;
    postArticleWrap.innerHTML = '';
    return;
  }

  try {
    const post: BlogPost | null = slug
      ? await BlogService.getBySlug(slug)
      : await BlogService.getById(id!);

    if (!post) {
      postHeroContent.innerHTML = `<p style="color:var(--text-muted);">Post not found. <a href="blog.html" style="color:var(--gold);">Return to blog →</a></p>`;
      postArticleWrap.innerHTML = '';
      return;
    }

    // Meta
    document.title = `${post.title} — ONE-TRADE`;
    const metaDesc = document.getElementById('postMetaDesc') as HTMLMetaElement | null;
    if (metaDesc) metaDesc.content = post.excerpt || post.title;

    // Hero
    const date = post.published_at ? formatDate(post.published_at) : formatDate(post.created_at);
    postHeroContent.innerHTML = `
      <div class="blog-hero-meta">
        <a href="blog.html" style="color:var(--gold);font-size:0.85rem;font-weight:600;">← Back to Blog</a>
        <span class="tag">${escapeHtml(post.category || 'Insights')}</span>
        <span style="color:var(--text-muted);font-size:0.82rem;">${date}</span>
        ${post.views ? `<span style="color:var(--text-muted);font-size:0.82rem;">${post.views} views</span>` : ''}
      </div>
      <h1 class="blog-hero-title">${escapeHtml(post.title)}</h1>
      ${post.excerpt ? `<p class="blog-hero-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
      <div style="margin-top:20px;font-size:0.85rem;color:var(--text-muted);">
        <strong style="color:var(--white);">By ${escapeHtml(post.author || 'ONE-TRADE Editorial')}</strong>
      </div>
      ${post.cover_image ? `<img src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}" class="blog-hero-cover">` : ''}
    `;

    // Article body
    const tagsHTML = post.tags?.length
      ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    postArticleWrap.innerHTML = `
      <div class="blog-post-article" id="postBody">
        ${post.content || '<p style="color:var(--text-muted);">Full article content not available.</p>'}
      </div>
      ${tagsHTML}
      <div id="commentsSection"></div>
    `;

    // Load comments
    await loadComments(post.id);

    // Load sidebar
    await loadPostSidebar();

    // Increment views
    BlogService.incrementViews(post.id);

  } catch (err) {
    console.error('Post load error:', err);
    postHeroContent.innerHTML = `<p style="color:var(--text-muted);">Failed to load post. <a href="blog.html" style="color:var(--gold);">Return to blog →</a></p>`;
    postArticleWrap.innerHTML = '';
  }
};

const loadComments = async (postId: string): Promise<void> => {
  const section = qs('#commentsSection');
  if (!section) return;
  const toast: Toast = (window as any)._toast;

  try {
    const comments = await CommentsService.getByPost(postId);
    const listHTML = comments.length
      ? comments.map(c => `
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-avatar">${escapeHtml((c.author_name || '?').charAt(0).toUpperCase())}</div>
            <div>
              <div class="comment-name">${escapeHtml(c.author_name)}</div>
            </div>
            <div class="comment-date">${formatDate(c.created_at)}</div>
          </div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
        </div>`).join('')
      : `<p style="color:var(--text-muted);font-size:0.9rem;padding:16px 0;">No comments yet. Be the first to share your thoughts.</p>`;

    section.innerHTML = `
      <div class="comments-section">
        <div class="comments-title">
          Comments <span class="comments-count">${comments.length}</span>
        </div>
        <div class="comment-list">${listHTML}</div>
        <div class="comment-form-card">
          <div class="comment-form-title">Leave a Comment</div>
          <form id="commentForm" data-post-id="${escapeHtml(postId)}">
            <div class="comment-form-grid">
              <div class="form-group">
                <label class="form-label">Your Name *</label>
                <input type="text" name="name" class="form-control" placeholder="John Smith" data-validate="required" data-label="Name" />
              </div>
              <div class="form-group">
                <label class="form-label">Email (optional)</label>
                <input type="email" name="email" class="form-control" placeholder="your@email.com" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Comment *</label>
              <textarea name="content" class="form-control" rows="4" placeholder="Share your thoughts on this article..." data-validate="required" data-label="Comment"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" id="commentSubmitBtn">Post Comment →</button>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:12px;">Comments are reviewed before publishing.</p>
          </form>
        </div>
      </div>`;

    // Comment form handler
    const form = qs<HTMLFormElement>('#commentForm');
    form?.addEventListener('submit', async (e: Event) => {
      e.preventDefault();
      const result = FormValidator.validate(form);
      if (!result.isValid) { FormValidator.showErrors(form, result.errors); return; }
      const btn = qs<HTMLButtonElement>('#commentSubmitBtn');
      if (btn) { btn.disabled = true; btn.classList.add('loading'); }
      try {
        await CommentsService.submit({
          postId,
          name: (form.querySelector<HTMLInputElement>('[name="name"]'))?.value || '',
          email: (form.querySelector<HTMLInputElement>('[name="email"]'))?.value || '',
          content: (form.querySelector<HTMLTextAreaElement>('[name="content"]'))?.value || '',
        });
        toast?.show('Comment submitted! It will appear after review.', 'success', 6000);
        form.reset();
      } catch (err: unknown) {
        toast?.show(err instanceof Error ? err.message : 'Failed to submit comment.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
      }
    });

  } catch (err) {
    console.error('Comments error:', err);
    if (section) section.innerHTML = '';
  }
};

const loadPostSidebar = async (): Promise<void> => {
  const recentEl = qs('#sidebarRecentPosts');
  if (!recentEl) return;
  try {
    const posts = await BlogService.getAll({ limit: 5 });
    recentEl.innerHTML = posts.map((p, i) => `
      <div class="sidebar-post-item">
        <div class="sidebar-post-num">0${i + 1}</div>
        <a href="post.html?slug=${encodeURIComponent(p.slug)}" class="sidebar-post-title">${escapeHtml(p.title)}</a>
      </div>`).join('');
  } catch {
    if (recentEl) recentEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">Could not load recent posts.</p>';
  }

  // Newsletter sidebar
  const subBtn = qs<HTMLButtonElement>('#sidebarSubBtn');
  const toast: Toast = (window as any)._toast;
  subBtn?.addEventListener('click', async () => {
    const emailEl = qs<HTMLInputElement>('#sidebarEmail');
    const email = emailEl?.value || '';
    try {
      await NewsletterService.subscribe(email);
      toast?.show('Subscribed! Welcome to ONE-TRADE Insights.', 'success');
      if (emailEl) emailEl.value = '';
    } catch (err: unknown) {
      toast?.show(err instanceof Error ? err.message : 'Subscription failed.', 'error');
    }
  });
};

// ─────────────────── Admin Dashboard ───────────────────────
const initAdminDashboard = async (): Promise<void> => {
  if (!qs('#adminContent')) return;
  if (!AdminAuth.requireAuth('admin-login.html')) return;

  // ── Mobile sidebar toggle ──
  const sidebar  = qs<HTMLElement>('#adminSidebar');
  const menuBtn  = qs<HTMLButtonElement>('#adminMenuBtn');
  // Create overlay dynamically
  const overlay  = document.createElement('div');
  overlay.className = 'admin-mobile-overlay';
  document.body.appendChild(overlay);

  const openSidebar  = (): void => { sidebar?.classList.add('open'); overlay.classList.add('active'); };
  const closeSidebar = (): void => { sidebar?.classList.remove('open'); overlay.classList.remove('active'); };

  menuBtn?.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  const navLinks = qsa<HTMLElement>('.admin-nav-link');
  const pageTitle = qs('#adminPageTitle');
  let currentPanel = 'dashboard';

  const setPanel = async (panel: string): Promise<void> => {
    currentPanel = panel;
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.panel === panel));
    if (pageTitle) {
      const titles: Record<string, string> = {
        dashboard: 'Dashboard', 'new-post': 'New Post', posts: 'All Posts',
        comments: 'Comments', messages: 'Messages', subscribers: 'Subscribers',
      };
      pageTitle.textContent = titles[panel] || panel;
    }
    const content = qs('#adminContent');
    if (content) content.innerHTML = `<div class="spinner" style="margin:80px auto;"></div>`;
    switch (panel) {
      case 'dashboard':   await renderAdminDashboard(); break;
      case 'new-post':    renderNewPostForm(null); break;
      case 'posts':       await renderAdminPosts(); break;
      case 'comments':    await renderAdminComments(); break;
      case 'messages':    await renderAdminMessages(); break;
      case 'subscribers': await renderAdminSubscribers(); break;
    }
  };

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const panel = link.dataset.panel;
      if (panel) { setPanel(panel); closeSidebar(); }
    });
  });

  qs('#adminSignOutBtn')?.addEventListener('click', () => AdminAuth.signOut());

  // Expose for inline calls
  (window as any).adminNavTo = setPanel;
  (window as any).deletePost = async (id: string) => {
    if (!confirm('Delete this post permanently?')) return;
    try {
      await BlogService.delete(id);
      (window as any)._toast?.show('Post deleted.', 'success');
      setPanel('posts');
    } catch (err: unknown) {
      (window as any)._toast?.show(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  };
  (window as any).editPost = async (id: string) => {
    const post = await BlogService.getById(id);
    if (post) renderNewPostForm(post);
    if (pageTitle) pageTitle.textContent = 'Edit Post';
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.panel === 'new-post'));
  };
  (window as any).approveComment = async (id: string) => {
    try {
      await CommentsService.approve(id);
      (window as any)._toast?.show('Comment approved.', 'success');
      setPanel('comments');
    } catch (err: unknown) {
      (window as any)._toast?.show(err instanceof Error ? err.message : 'Failed.', 'error');
    }
  };
  (window as any).deleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await CommentsService.delete(id);
      (window as any)._toast?.show('Comment deleted.', 'success');
      setPanel('comments');
    } catch (err: unknown) {
      (window as any)._toast?.show(err instanceof Error ? err.message : 'Failed.', 'error');
    }
  };

  await setPanel('dashboard');
};

const renderAdminDashboard = async (): Promise<void> => {
  const content = qs('#adminContent');
  if (!content) return;
  try {
    const stats = await AdminStatsService.get();
    content.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-icon">📝</div>
          <div class="admin-stat-info">
            <div class="admin-stat-value" data-counter="${stats.posts}">${stats.posts}</div>
            <div class="admin-stat-label">Total Posts</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">💬</div>
          <div class="admin-stat-info">
            <div class="admin-stat-value" data-counter="${stats.comments}">${stats.comments}</div>
            <div class="admin-stat-label">Comments</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">📬</div>
          <div class="admin-stat-info">
            <div class="admin-stat-value" data-counter="${stats.subscribers}">${stats.subscribers}</div>
            <div class="admin-stat-label">Subscribers</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">📧</div>
          <div class="admin-stat-info">
            <div class="admin-stat-value" data-counter="${stats.messages}">${stats.messages}</div>
            <div class="admin-stat-label">Messages</div>
          </div>
        </div>
      </div>
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">🚀 Quick Actions</div>
        </div>
        <div class="admin-panel-body" style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="window.adminNavTo('new-post')">✍️ Write New Post</button>
          <button class="btn btn-outline" onclick="window.adminNavTo('posts')">📝 Manage Posts</button>
          <button class="btn btn-ghost" onclick="window.adminNavTo('comments')">💬 Review Comments</button>
          <button class="btn btn-ghost" onclick="window.adminNavTo('messages')">📧 View Messages</button>
        </div>
      </div>`;
  } catch (err) {
    console.error('Admin dashboard error:', err);
    if (content) content.innerHTML = `<p style="color:var(--text-muted);padding:40px">Failed to load dashboard stats.</p>`;
  }
};

// ─────────────────── Admin New/Edit Post ───────────────────
const renderNewPostForm = (post: BlogPost | null): void => {
  const content = qs('#adminContent');
  if (!content) return;
  const isEdit = !!post;

  content.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">${isEdit ? '✏️ Edit Post' : '✍️ New Blog Post'}</div>
      </div>
      <div class="admin-panel-body">
        <form id="adminPostForm">
          <div class="post-form-grid">
            <div>
              <div class="form-group">
                <label class="form-label">Post Title *</label>
                <input type="text" name="title" class="form-control" placeholder="e.g. EUR/USD Weekly Analysis: What to Expect" data-validate="required" data-label="Title" value="${post ? escapeHtml(post.title) : ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Excerpt / Summary *</label>
                <textarea name="excerpt" class="form-control" rows="2" placeholder="Brief summary shown on blog cards (2-3 sentences)..." data-validate="required" data-label="Excerpt">${post ? escapeHtml(post.excerpt || '') : ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Content *</label>
                <div class="editor-toolbar" id="editorToolbar">
                  <button type="button" class="toolbar-btn" data-cmd="bold"><b>B</b></button>
                  <button type="button" class="toolbar-btn" data-cmd="italic"><i>I</i></button>
                  <button type="button" class="toolbar-btn" data-cmd="underline"><u>U</u></button>
                  <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList">• List</button>
                  <button type="button" class="toolbar-btn" data-cmd="insertOrderedList">1. List</button>
                  <button type="button" class="toolbar-btn" data-cmd="formatBlock-h2">H2</button>
                  <button type="button" class="toolbar-btn" data-cmd="formatBlock-h3">H3</button>
                  <button type="button" class="toolbar-btn" data-cmd="formatBlock-blockquote">Quote</button>
                </div>
                <div class="rich-editor" id="richEditor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Post content">${post ? (post.content || '') : ''}</div>
              </div>
            </div>
            <div class="post-form-meta">
              <div class="admin-panel" style="padding:0;margin:0;">
                <div class="admin-panel-header"><div class="admin-panel-title">Cover Image</div></div>
                <div class="admin-panel-body">
                  <div class="image-upload-zone" id="coverUploadZone">
                    <span class="upload-icon">🖼️</span>
                    <p>Click or drag to upload cover image</p>
                  </div>
                  <input type="file" id="coverImageInput" accept="image/*" style="display:none;">
                  ${post?.cover_image ? `<img src="${escapeHtml(post.cover_image)}" style="margin-top:12px;width:100%;border-radius:8px;max-height:150px;object-fit:cover;" id="coverPreview">` : `<img id="coverPreview" style="display:none;margin-top:12px;width:100%;border-radius:8px;max-height:150px;object-fit:cover;">`}
                </div>
              </div>
              <div class="admin-panel" style="padding:0;margin:0;">
                <div class="admin-panel-header"><div class="admin-panel-title">Details</div></div>
                <div class="admin-panel-body" style="display:flex;flex-direction:column;gap:14px;">
                  <div class="form-group" style="margin:0">
                    <label class="form-label">Category</label>
                    <select name="category" class="form-control">
                      <option value="Market Insights" ${post?.category === 'Market Insights' ? 'selected' : ''}>Market Insights</option>
                      <option value="Forex" ${post?.category === 'Forex' ? 'selected' : ''}>Forex</option>
                      <option value="Stocks" ${post?.category === 'Stocks' ? 'selected' : ''}>Stocks</option>
                      <option value="Crypto" ${post?.category === 'Crypto' ? 'selected' : ''}>Crypto</option>
                      <option value="Commodities" ${post?.category === 'Commodities' ? 'selected' : ''}>Commodities</option>
                      <option value="Education" ${post?.category === 'Education' ? 'selected' : ''}>Education</option>
                      <option value="Investment" ${post?.category === 'Investment' ? 'selected' : ''}>Investment</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin:0">
                    <label class="form-label">Author</label>
                    <input type="text" name="author" class="form-control" value="${post ? escapeHtml(post.author || '') : 'ONE-TRADE Editorial'}" />
                  </div>
                  <div class="form-group" style="margin:0">
                    <label class="form-label">Tags (comma-separated)</label>
                    <input type="text" name="tags" class="form-control" placeholder="forex, analysis, EUR/USD" value="${post?.tags ? post.tags.join(', ') : ''}" />
                  </div>
                  <div class="toggle-row">
                    <span class="toggle-label">Publish Post</span>
                    <label class="toggle-switch">
                      <input type="checkbox" name="published" ${post?.published ? 'checked' : ''}>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:16px;" id="postSubmitBtn">
                ${isEdit ? '💾 Update Post' : '🚀 Publish Post'}
              </button>
              ${isEdit ? `<button type="button" class="btn btn-ghost" onclick="window.adminNavTo('posts')" style="width:100%;justify-content:center;margin-top:8px;">Cancel</button>` : ''}
            </div>
          </div>
          <input type="hidden" name="post_id" value="${post ? post.id : ''}" />
        </form>
      </div>
    </div>`;

  // Editor toolbar
  qsa<HTMLButtonElement>('.toolbar-btn', content).forEach(btn => {
    btn.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd || '';
      if (cmd.startsWith('formatBlock-')) {
        document.execCommand('formatBlock', false, cmd.split('-')[1]);
      } else {
        document.execCommand(cmd, false);
      }
      (qs('#richEditor') as HTMLElement)?.focus();
    });
  });

  // Image upload
  const zone    = qs('#coverUploadZone');
  const fileIn  = qs<HTMLInputElement>('#coverImageInput');
  const preview = qs<HTMLImageElement>('#coverPreview');
  let uploadedUrl = post?.cover_image || '';
  const toast: Toast = (window as any)._toast;

  zone?.addEventListener('click', () => fileIn?.click());
  zone?.addEventListener('dragover', (e: Event) => { e.preventDefault(); zone.classList.add('dragging'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone?.addEventListener('drop', (e: Event) => {
    e.preventDefault(); zone.classList.remove('dragging');
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleCoverUpload(file);
  });
  fileIn?.addEventListener('change', () => { if (fileIn.files?.[0]) handleCoverUpload(fileIn.files[0]); });

  const handleCoverUpload = async (file: File): Promise<void> => {
    if (!file.type.startsWith('image/')) { toast?.show('Please select an image file', 'error'); return; }
    if (zone) zone.innerHTML = '<div class="spinner"></div>';
    try {
      uploadedUrl = await BlogService.uploadCover(file);
      if (preview) { preview.src = uploadedUrl; preview.style.display = 'block'; }
      if (zone) zone.innerHTML = `<img src="${uploadedUrl}" style="max-height:80px;border-radius:6px;">`;
    } catch {
      toast?.show('Image upload failed', 'error');
      if (zone) zone.innerHTML = '<span class="upload-icon">🖼️</span><p>Click or drag to upload cover image</p>';
    }
  };

  // Form submit
  const form = qs<HTMLFormElement>('#adminPostForm');
  form?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const result = FormValidator.validate(form);
    if (!result.isValid) { FormValidator.showErrors(form, result.errors); return; }
    const btn = qs<HTMLButtonElement>('#postSubmitBtn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    const getData = (name: string): string =>
      (form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`))?.value || '';
    const tagsRaw = getData('tags');
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const editorEl = qs('#richEditor');
    const payload: Partial<BlogPost> = {
      title:       getData('title'),
      excerpt:     getData('excerpt'),
      content:     editorEl ? editorEl.innerHTML : '',
      category:    getData('category'),
      author:      getData('author') || 'ONE-TRADE Editorial',
      tags,
      cover_image: uploadedUrl || undefined,
      published:   (form.querySelector<HTMLInputElement>('[name="published"]'))?.checked || false,
    };
    try {
      const postId = getData('post_id');
      if (postId) {
        await BlogService.update(postId, payload);
        toast?.show('Post updated successfully!', 'success');
      } else {
        await BlogService.create(payload);
        toast?.show('Post published successfully!', 'success');
      }
      (window as any).adminNavTo?.('posts');
    } catch (err: unknown) {
      toast?.show(err instanceof Error ? err.message : 'Save failed.', 'error');
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  });
};

// ─────────────────── Admin Posts List ──────────────────────
const renderAdminPosts = async (): Promise<void> => {
  const content = qs('#adminContent');
  if (!content) return;
  try {
    const posts = await BlogService.getAll({ limit: 100, adminMode: true });
    if (!posts.length) {
      content.innerHTML = `<div class="admin-panel">
        <div class="admin-panel-body" style="text-align:center;padding:80px;">
          <div style="font-size:3rem;margin-bottom:20px;">📝</div>
          <h3 style="color:var(--white);margin-bottom:16px;">No posts yet</h3>
          <button class="btn btn-primary" onclick="window.adminNavTo('new-post')">Write First Post</button>
        </div></div>`;
      return;
    }
    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">📝 All Posts (${posts.length})</div>
          <button class="btn btn-primary btn-sm" onclick="window.adminNavTo('new-post')">+ New Post</button>
        </div>
        <div class="table-overflow">
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Views</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${posts.map(p => `<tr>
                <td style="max-width:280px;">
                  <a href="post.html?slug=${encodeURIComponent(p.slug)}" target="_blank" style="color:var(--white);font-weight:600;font-size:0.88rem;">${escapeHtml(p.title)}</a>
                </td>
                <td><span class="badge badge-gold">${escapeHtml(p.category || '')}</span></td>
                <td style="color:var(--text-muted);font-size:0.82rem;">${escapeHtml(p.author || '')}</td>
                <td><span class="badge ${p.published ? 'badge-green' : 'badge-red'}">${p.published ? 'Published' : 'Draft'}</span></td>
                <td style="color:var(--text-muted);">${p.views || 0}</td>
                <td style="color:var(--text-muted);font-size:0.82rem;">${formatDate(p.created_at)}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-ghost" onclick="window.editPost('${escapeHtml(p.id)}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deletePost('${escapeHtml(p.id)}')">🗑️</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    console.error('Admin posts error:', err);
    if (content) content.innerHTML = `<p style="color:var(--text-muted);padding:40px">Failed to load posts.</p>`;
  }
};

// ─────────────────── Admin Comments ────────────────────────
const renderAdminComments = async (): Promise<void> => {
  const content = qs('#adminContent');
  if (!content) return;
  try {
    const comments = await CommentsService.getAll({ limit: 100 });
    content.innerHTML = `<div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">💬 Comments (${comments.length})</div>
      </div>
      <div class="admin-panel-body">
        ${!comments.length
          ? '<p style="color:var(--text-muted);text-align:center;padding:40px;">No comments yet.</p>'
          : comments.map(c => `
          <div class="comment-mod-item">
            <div class="comment-mod-header">
              <div>
                <div class="comment-mod-info">
                  <span class="comment-mod-name">${escapeHtml(c.author_name)}</span>
                  ${c.author_email ? ` · <span>${escapeHtml(c.author_email)}</span>` : ''}
                  · <span>${formatDate(c.created_at)}</span>
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="badge ${c.approved ? 'badge-green' : 'badge-red'}">${c.approved ? 'Approved' : 'Pending'}</span>
                ${!c.approved ? `<button class="btn btn-sm btn-ghost" onclick="window.approveComment('${escapeHtml(c.id)}')">✓ Approve</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="window.deleteComment('${escapeHtml(c.id)}')">🗑️ Delete</button>
              </div>
            </div>
            <div class="comment-mod-text">${escapeHtml(c.content)}</div>
          </div>`).join('')}
      </div></div>`;
  } catch (err) {
    console.error('Admin comments error:', err);
    if (content) content.innerHTML = `<p style="color:var(--text-muted);padding:40px">Failed to load comments.</p>`;
  }
};

// ─────────────────── Admin Messages & Subscribers ──────────
const renderAdminMessages = async (): Promise<void> => {
  const content = qs('#adminContent');
  if (!content) return;
  try {
    const { data } = await (window as any)._sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
    const messages = data || [];
    content.innerHTML = `<div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">📧 Contact Messages (${messages.length})</div>
      </div>
      <div class="table-overflow">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Date</th></tr></thead>
          <tbody>
            ${!messages.length
              ? '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--text-muted);">No messages yet.</td></tr>'
              : messages.map((m: any) => `<tr>
                <td style="font-weight:600;color:var(--white);">${escapeHtml(m.name || '')}</td>
                <td style="color:var(--text-muted);">${escapeHtml(m.email || '')}</td>
                <td><span class="badge badge-gold">${escapeHtml(m.subject || 'General')}</span></td>
                <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);">${escapeHtml(m.message || '')}</td>
                <td style="color:var(--text-muted);font-size:0.82rem;">${formatDate(m.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (err) {
    console.error('Admin messages error:', err);
    if (content) content.innerHTML = `<p style="color:var(--text-muted);padding:40px">Failed to load messages.</p>`;
  }
};

const renderAdminSubscribers = async (): Promise<void> => {
  const content = qs('#adminContent');
  if (!content) return;
  try {
    const { data } = await (window as any)._sb.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }).limit(200);
    const subs = data || [];
    content.innerHTML = `<div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">📬 Newsletter Subscribers (${subs.length})</div>
      </div>
      <div class="table-overflow">
        <table>
          <thead><tr><th>#</th><th>Email</th><th>Subscribed</th></tr></thead>
          <tbody>
            ${!subs.length
              ? '<tr><td colspan="3" style="text-align:center;padding:48px;color:var(--text-muted);">No subscribers yet.</td></tr>'
              : subs.map((s: any, i: number) => `<tr>
                <td style="color:var(--text-muted);">${i + 1}</td>
                <td style="color:var(--white);font-weight:500;">${escapeHtml(s.email || '')}</td>
                <td style="color:var(--text-muted);font-size:0.82rem;">${formatDate(s.subscribed_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (err) {
    console.error('Admin subscribers error:', err);
    if (content) content.innerHTML = `<p style="color:var(--text-muted);padding:40px">Failed to load subscribers.</p>`;
  }
};

// ─────────────────── FAQ Accordion ─────────────────────────
const initFAQ = (): void => {
  qsa<HTMLElement>('[data-faq]').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      qsa('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
};

// ─────────────────── Contact Form ──────────────────────────
const initContactForm = (): void => {
  const form = qs<HTMLFormElement>('#contactForm');
  if (!form) return;
  const toast: Toast = (window as any)._toast;
  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const result = FormValidator.validate(form);
    if (!result.isValid) { FormValidator.showErrors(form, result.errors); return; }
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      await ContactService.submit({
        name:    (form.querySelector<HTMLInputElement>('[name="name"]'))?.value || '',
        email:   (form.querySelector<HTMLInputElement>('[name="email"]'))?.value || '',
        subject: (form.querySelector<HTMLSelectElement>('[name="subject"]'))?.value || 'General',
        message: (form.querySelector<HTMLTextAreaElement>('[name="message"]'))?.value || '',
      });
      toast?.show('Message sent! We\'ll respond within 2 business hours.', 'success', 6000);
      form.reset();
    } catch (err: unknown) {
      toast?.show(err instanceof Error ? err.message : 'Send failed. Please try again.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  });
};

// ─────────────────── Newsletter Forms ──────────────────────
const initNewsletterForms = (): void => {
  const toast: Toast = (window as any)._toast;
  const handleSub = async (emailEl: HTMLInputElement | null, btnEl: HTMLButtonElement | null): Promise<void> => {
    if (!emailEl) return;
    if (btnEl) { btnEl.disabled = true; btnEl.classList.add('loading'); }
    try {
      await NewsletterService.subscribe(emailEl.value);
      toast?.show('Subscribed! Welcome to ONE-TRADE Insights.', 'success');
      emailEl.value = '';
    } catch (err: unknown) {
      toast?.show(err instanceof Error ? err.message : 'Subscription failed.', 'error');
    } finally {
      if (btnEl) { btnEl.disabled = false; btnEl.classList.remove('loading'); }
    }
  };

  const mainForm = qs<HTMLFormElement>('#newsletterForm');
  mainForm?.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    handleSub(mainForm.querySelector<HTMLInputElement>('[name="email"]'), mainForm.querySelector<HTMLButtonElement>('[type="submit"]'));
  });

  qs('#footerSubBtn')?.addEventListener('click', () => {
    handleSub(qs<HTMLInputElement>('#footerEmailInput'), qs<HTMLButtonElement>('#footerSubBtn'));
  });
};

// ─────────────────── Admin Login Page ──────────────────────
const initAdminLoginPage = (): void => {
  const form = qs<HTMLFormElement>('#adminLoginForm');
  if (!form) return;
  const toast: Toast = (window as any)._toast;

  // If already authenticated, redirect
  if (AdminAuth.isAuthenticated()) {
    window.location.href = 'admin.html';
    return;
  }

  // Show/hide passcode
  const showPw = qs<HTMLInputElement>('#showPasscode');
  const passEl = qs<HTMLInputElement>('[name="passcode"]');
  showPw?.addEventListener('change', () => {
    if (passEl) passEl.type = showPw.checked ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const result = FormValidator.validate(form);
    if (!result.isValid) { FormValidator.showErrors(form, result.errors); return; }
    const passcode = passEl?.value || '';
    const btn = qs<HTMLButtonElement>('#loginBtn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      await AdminAuth.authenticate(passcode);
      toast?.show('Access granted. Welcome, Admin!', 'success');
      setTimeout(() => { window.location.href = 'admin.html'; }, 800);
    } catch (err: unknown) {
      toast?.show(err instanceof Error ? err.message : 'Invalid passcode.', 'error');
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
      if (passEl) { passEl.value = ''; passEl.focus(); }
    }
  });
};

// ─────────────────── Smooth Scroll ─────────────────────────
const initSmoothScroll = (): void => {
  qsa<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e: MouseEvent) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
};

// ─────────────────── DOM Ready ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Shared toast instance
  (window as any)._toast = new Toast();
  (window as any).FormValidator = FormValidator;
  (window as any).debounce = debounce;

  // Always init
  new Navbar();
  new ScrollAnimator();
  hideLoader();
  initSmoothScroll();

  // Counter animations
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const target = parseInt(el.dataset.counter || '0', 10);
        if (!isNaN(target)) animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  qsa<HTMLElement>('[data-counter]').forEach(el => counterObserver.observe(el));

  const page = window.location.pathname.split('/').pop() || 'index.html';

  // ── Index page ──
  if (page === 'index.html' || page === '') {
    initFAQ();
    initContactForm();
    initNewsletterForms();
    loadHomeBlogGrid();

    const particleContainer = qs<HTMLElement>('#heroParticles');
    if (particleContainer) initParticles(particleContainer, 20);
  }

  // ── Blog listing page ──
  if (page === 'blog.html') {
    initBlogPage();
  }

  // ── Blog post page ──
  if (page === 'post.html') {
    initPostPage();
  }

  // ── Admin login ──
  if (page === 'admin-login.html') {
    initAdminLoginPage();
  }

  // ── Admin dashboard ──
  if (page === 'admin.html') {
    initAdminDashboard();
  }
});
