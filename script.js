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
document.querySelector('#inquiry-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);const body=Array.from(data,([key,value])=>`${key}: ${String(value).trim()}`).join('\r\n\r\n');const href='mailto:t.yamakado.ai.partner@gmail.com?subject='+encodeURIComponent('HPからの無料相談・お問い合わせ')+'&body='+encodeURIComponent(body);document.querySelector('#form-status').textContent='メールアプリで内容をご確認のうえ、送信してください。開かない場合は t.yamakado.ai.partner@gmail.com 宛に直接お送りください。';window.location.href=href;});

// Prefill the inquiry with the selected portfolio service, without submitting it.
const requestedService = new URLSearchParams(window.location.search).get('service');
const inquiryTemplates = {
  lp: '店舗・サービス紹介LPの制作について相談したいです。\n業種：\n目的：\nご希望の時期：',
  movie: '商品PR動画の制作について相談したいです。\n商品・サービス：\n掲載先：\nご希望の時期：',
  flyer: 'チラシ制作について相談したいです。\n掲載したい内容：\n配布する場所：\nご希望の時期：'
};
const inquiryMessage = document.querySelector('#inquiry-form textarea[name="ご相談内容"]');
if (inquiryMessage && !inquiryMessage.value && Object.hasOwn(inquiryTemplates, requestedService)) {
  inquiryMessage.value = inquiryTemplates[requestedService];
}
