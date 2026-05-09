/* =============================================
   AI業務効率化アドバイザー — スクリプト
   ============================================= */

/* === ヘッダー: スクロールで影を追加 === */
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* === ハンバーガーメニュー === */
const hamburger = document.getElementById('hamburger');
const nav       = document.getElementById('nav');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('active');
  nav.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
});

// リンクをクリックしたらメニューを閉じる
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    nav.classList.remove('open');
    hamburger.setAttribute('aria-label', 'メニューを開く');
  });
});

/* === スムーススクロール (ヘッダー高さ分オフセット) === */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = header.offsetHeight + 8;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offset,
      behavior: 'smooth'
    });
  });
});

/* === スクロールアニメーション (Intersection Observer) === */
const fadeItems = document.querySelectorAll('.fade-in');

const appearObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    appearObserver.unobserve(entry.target);
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

// グリッド内カードはずらして出現させる
const staggerGroups = [
  '.problems-grid .problem-card',
  '.services-grid .service-card',
  '.portfolio-grid .portfolio-card'
];

staggerGroups.forEach(selector => {
  document.querySelectorAll(selector).forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`;
  });
});

fadeItems.forEach(el => appearObserver.observe(el));

/* === お問い合わせフォーム (mailto 連携) === */
const contactForm = document.getElementById('contactForm');
const formError   = document.getElementById('formError');

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  formError.classList.remove('show');

  const name    = document.getElementById('name').value.trim();
  const email   = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  // 簡易バリデーション
  if (!name) {
    showError('お名前を入力してください。');
    document.getElementById('name').focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('正しいメールアドレスを入力してください。');
    document.getElementById('email').focus();
    return;
  }
  if (!message) {
    showError('メッセージを入力してください。');
    document.getElementById('message').focus();
    return;
  }

  const company = document.getElementById('company').value.trim();
  const service = document.getElementById('service').value;

  const subject = '【ホームページからのお問い合わせ】';
  const body =
    `お名前: ${name}\n` +
    `会社名: ${company || '未入力'}\n` +
    `メールアドレス: ${email}\n` +
    `ご相談内容: ${service || '未選択'}\n\n` +
    `── メッセージ ──────────────\n${message}`;

  window.location.href =
    `mailto:t.yamakado.ai.partner@gmail.com` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
});

function showError(msg) {
  formError.textContent = msg;
  formError.classList.add('show');
}
