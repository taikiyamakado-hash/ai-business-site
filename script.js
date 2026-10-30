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
let contactToken = '';
async function contactFetch(url, options={}){
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
 try{return await fetch(url,{...options,signal:controller.signal});} finally{clearTimeout(timer);}
}
async function prepareContact(){
 const r = await contactFetch('contact-api/', {credentials:'same-origin',cache:'no-store'});
 if(!r.ok) throw new Error('フォームの準備ができませんでした。メールでのご連絡もご利用ください。');
 const data=await r.json(); contactToken=data.token;
}
contactForm.addEventListener('focusin',()=>{ if(document.documentElement.dataset.preview!=='true'&&!contactToken) prepareContact().catch(()=>{}); },{once:true});
contactForm.addEventListener('submit', async e=>{
 e.preventDefault(); const status=document.querySelector('#form-status');
 if(document.documentElement.dataset.preview==='true'){status.textContent='確認用プレビューのため送信しません。本番の送信機能は到達確認後に有効化します。';return;}
 const button=contactForm.querySelector('button[type="submit"]'); button.disabled=true; status.textContent='送信しています…';
 try {
  if(!contactToken) await prepareContact();
  const d=new FormData(contactForm);
  const r=await contactFetch('contact-api/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:contactToken,name:d.get('お名前'),company:d.get('会社名・屋号'),email:d.get('メールアドレス'),message:d.get('ご相談内容'),website:d.get('website')||'',consent:d.get('consent')||''})});
  const data=await r.json(); if(!r.ok)throw new Error(data.error||'送信できませんでした。');
  status.textContent=data.message+' 受付番号：'+data.id; contactForm.reset(); contactToken='';
 } catch(err){status.textContent=err.name==='AbortError'?'通信がタイムアウトしました。送信済みの場合もあります。重複送信を避けるため、メールでお問い合わせください。':err instanceof SyntaxError?'現在送信できません。メールでご連絡ください。':err.message;} finally {button.disabled=false;}
});

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
