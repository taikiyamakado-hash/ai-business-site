"use strict";
const menu = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');
function closeMenu(){ nav.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','メニューを開く'); }
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
window.matchMedia('(min-width:801px)').addEventListener('change',closeMenu);
document.querySelector('#year').textContent=new Date().getFullYear();
const contactForm = document.querySelector('#inquiry-form');
contactForm.addEventListener('submit',e=>{
 e.preventDefault(); const d=new FormData(contactForm);
 const body=['お名前：'+d.get('お名前'),'会社名・屋号：'+(d.get('会社名・屋号')||''),'メール：'+d.get('メールアドレス'),'希望サービス：'+(document.querySelector('#inquiry-service')?.selectedOptions[0]?.textContent||'未定'),'','ご相談内容：',d.get('ご相談内容')].join('\n');
 window.location.href='mailto:t.yamakado.ai.partner@gmail.com?subject='+encodeURIComponent('AI_Partnerへのお問い合わせ')+'&body='+encodeURIComponent(body);
 document.querySelector('#form-status').textContent='メールアプリで内容を確認し、送信してください。この操作だけでは送信されません。';
});
contactForm.querySelector('button[type="submit"]').disabled = false;

// Prefill the inquiry with the selected portfolio service, without submitting it.
const requestedService = new URLSearchParams(window.location.search).get('service');
const inquiryTemplates = {
  'business-cards': '名刺管理アプリについて相談したいです。\n現在の名刺管理方法：\n月間の処理件数：\n困っていること：',
  'minutes-safety': '議事録・安全書類作成の自動化について相談したいです。\n対象の会議・書類：\n使用している書式・ツール：\n困っていること：',
  'expenses': '経費管理アプリについて相談したいです。\n現在の経費管理方法：\n月間の領収書件数：\n困っていること：',
  lp: '店舗・サービス紹介LPの制作について相談したいです。\n業種：\n目的：\nご希望の時期：',
  movie: '商品PR動画の制作について相談したいです。\n商品・サービス：\n掲載先：\nご希望の時期：',
  flyer: 'チラシ制作について相談したいです。\n掲載したい内容：\n配布する場所：\nご希望の時期：'
};
const inquiryMessage = document.querySelector('#inquiry-form textarea[name="ご相談内容"]');
if (inquiryMessage && !inquiryMessage.value && Object.hasOwn(inquiryTemplates, requestedService)) {
  inquiryMessage.value = inquiryTemplates[requestedService];
}

// Load and play motion only while visible; honor reduced motion and data saving.
const motion = document.querySelector('.portfolio-motion');
const motionToggle = document.querySelector('.motion-toggle');
if (motion && motionToggle) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false, userStarted = false, visible = false;
  function syncMotionUI() {
    motionToggle.textContent = motion.paused ? '▶ 再生' : 'Ⅱ 一時停止';
    motionToggle.setAttribute('aria-label', motion.paused ? '動画プレビューを再生' : '動画プレビューを一時停止');
    motionToggle.setAttribute('aria-pressed', String(!motion.paused));
  }
  function startMotion() {
    if (!motion.getAttribute('src')) motion.src = motion.canPlayType('video/webm; codecs="vp9"') ? motion.dataset.src : motion.dataset.mp4;
    motion.muted = true;
    motion.play().catch(syncMotionUI);
  }
  function reconcileMotion() {
    const allowed = userStarted || (!reducedMotion.matches && !navigator.connection?.saveData);
    if (visible && !document.hidden && !userPaused && allowed) startMotion();
    else motion.pause();
  }
  motion.addEventListener('play', syncMotionUI);
  motion.addEventListener('pause', syncMotionUI);
  motionToggle.addEventListener('click', () => {
    if (motion.paused) { userPaused = false; userStarted = true; startMotion(); }
    else { userPaused = true; motion.pause(); }
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; reconcileMotion(); }, {threshold: .2}).observe(motion);
  document.addEventListener('visibilitychange', reconcileMotion);
  reducedMotion.addEventListener('change', () => { userStarted = false; reconcileMotion(); });
}

// Service tabs enhance the fully readable HTML; without JS all prices remain visible.
const pricingTabs = Array.from(document.querySelectorAll('.pricing-tab'));
const pricingPanels = Array.from(document.querySelectorAll('.pricing-panel'));
function selectPricingTab(index, focus = false) {
  pricingTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !selected;
  });
  if (focus) pricingTabs[index].focus();
}
if (pricingTabs.length) {
  document.querySelector('.pricing-tabs').hidden = false;
  pricingTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectPricingTab(index));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % pricingTabs.length;
      else if (event.key === 'ArrowLeft') next = (index + pricingTabs.length - 1) % pricingTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = pricingTabs.length - 1;
      else return;
      event.preventDefault();
      selectPricingTab(next, true);
    });
  });
  const initialPanel = pricingPanels.findIndex(panel => '#' + panel.id === window.location.hash);
  selectPricingTab(initialPanel >= 0 ? initialPanel : 0);
}
// Choosing a plan changes only the optional selector, never sends the inquiry or overwrites a draft.
const serviceSelect = document.querySelector('#inquiry-service');
document.querySelectorAll('[data-plan]').forEach(link => {
  link.addEventListener('click', () => {
    const key = link.dataset.plan;
    if (serviceSelect && Array.from(serviceSelect.options).some(option => option.value === key)) {
      serviceSelect.value = key;
      document.querySelector('#form-status').textContent = 'ご希望のサービスを選択しました。内容を入力後、メールアプリで送信してください。';
    }
  });
});
