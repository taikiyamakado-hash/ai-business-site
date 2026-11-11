/* Isolated, non-blocking motion layer. No form, navigation or analytics overrides. */
(()=>{
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(!('IntersectionObserver' in window)||!Element.prototype.animate)return;
 const active=new Set();
 const targets=new Map();
 function add(selector,step=0){document.querySelectorAll(selector).forEach((el,i)=>targets.set(el,(i%5)*step));}
 add('.hero-copy > *',70);add('.editorial-hero');
 add('section:not(.hero) h2');add('.service-card',90);add('.plan-card',90);add('.w-card',90);
 add('.showcase-grid');add('.flow-grid article',110);add('.w-before-after > div',100);
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const el=entry.target;observer.unobserve(el);
   if(reduced.matches)continue;
   const a=el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:560,delay:targets.get(el)||0,easing:'cubic-bezier(.2,.65,.3,1)',fill:'backwards'});
   active.add(a);a.onfinish=()=>{active.delete(a);if(el.matches('.flow-grid article'))el.classList.add('motion-step-complete');};
  }
 },{threshold:.08});
 targets.forEach((delay,el)=>observer.observe(el));
 reduced.addEventListener('change',e=>{if(e.matches){active.forEach(a=>a.cancel());active.clear();}});
 document.addEventListener('focusin',e=>{for(const a of active){const el=a.effect?.target;if(el&&(el===e.target||el.contains(e.target))){a.cancel();active.delete(a);}}});
})();
