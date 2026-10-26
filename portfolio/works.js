'use strict';

// All demonstration data stays in memory. No AI endpoint, uploads or storage.
(() => {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('#site-nav');
  function closeMenu() {
    nav?.classList.remove('is-open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'メニューを開く');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('is-open', open);
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  matchMedia('(min-width:801px)').addEventListener('change', closeMenu);

  const $ = id => document.getElementById(id);
  const textElement = (tag, text) => {
    const el = document.createElement(tag); el.textContent = text; return el;
  };
  const format = (value, digits = 1) => new Intl.NumberFormat('ja-JP', {maximumFractionDigits: digits}).format(value);

  if ($('card-form')) {
    const initial = () => [
      {name: '佐藤 花子', company: '架空みどり商店', team: '代表', email: 'sato@example.com'},
      {name: '鈴木 健', company: 'デモ東部設備株式会社', team: '工務部', email: 'suzuki@example.com'}
    ];
    let records = initial();
    const form = $('card-form');
    const sample = {name: '山田 太郎', company: 'サンプル工業株式会社', team: '営業部', email: 'yamada@example.com'};
    function render(message) {
      const q = $('card-search').value.trim().toLocaleLowerCase('ja');
      const found = records.filter(r => `${r.name} ${r.company} ${r.team} ${r.email}`.toLocaleLowerCase('ja').includes(q));
      $('card-results').replaceChildren();
      found.forEach(r => {
        const li = document.createElement('li');
        li.append(textElement('strong', r.name), textElement('span', `${r.company}${r.team ? ' / '+r.team : ''}`), textElement('span', r.email));
        $('card-results').append(li);
      });
      if (!found.length) { const li = textElement('li', '該当する顧客はありません。検索条件を変えてください。'); li.className='w-empty'; $('card-results').append(li); }
      $('card-status').textContent = message || `${records.length}件中 ${found.length}件を表示しています。`;
    }
    function fillSample() {
      Object.entries(sample).forEach(([key, value]) => { form.elements.namedItem(key).value = value; });
      form.elements.namedItem('checked').checked = false;
      $('card-status').textContent = '固定の読取サンプルを表示しました。原本と照合し、確認欄をチェックしてください。';
    }
    $('card-sample').addEventListener('click', fillSample);
    $('card-search').addEventListener('input', () => render());
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      for (const k of ['name','company','team','email']) data[k] = data[k].trim();
      if (!data.name || !data.company || !data.email) { $('card-status').textContent='会社名・氏名・メールを入力してください。空白のみでは登録できません。'; return; }
      if (records.some(r => r.email.toLowerCase() === data.email.toLowerCase())) { $('card-status').textContent='同じメールアドレスが登録済みです。重複する登録は追加していません。'; return; }
      records.unshift(data);
      $('card-search').value='';
      form.elements.namedItem('checked').checked=false;
      render(`${data.name}さんを、このページ内のデモ一覧に追加しました。`);
    });
    $('card-reset').addEventListener('click', () => { records=initial(); $('card-search').value=''; fillSample(); render('架空の顧客2件を表示しています。デモを初期化しました。'); });
    render('架空の顧客2件を表示しています。');
  }

  const tabs = [...document.querySelectorAll('[role=tab]')];
  function activateTab(tab) {
    tabs.forEach(t => {
      const active=t===tab;
      t.setAttribute('aria-selected',String(active));
      t.tabIndex=active?0:-1;
      $(t.getAttribute('aria-controls')).hidden=!active;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if(e.key==='ArrowRight') next=(i+1)%tabs.length;
      if(e.key==='ArrowLeft') next=(i-1+tabs.length)%tabs.length;
      if(e.key==='Home') next=0;
      if(e.key==='End') next=tabs.length-1;
      if(next!==undefined){ e.preventDefault(); activateTab(tabs[next]); tabs[next].focus(); }
    });
  });

  if ($('expense-form')) {
    const initial = () => [
      {date:'2026-10-21',vendor:'架空交通',category:'交通費',amount:2000},
      {date:'2026-10-22',vendor:'デモ印刷店',category:'印刷費',amount:3000}
    ];
    let records=initial();
    const form=$('expense-form');
    function render(message) {
      $('expense-rows').replaceChildren();
      const grouped={};
      records.forEach(r=>{
        const tr=document.createElement('tr');
        [r.date,r.vendor,r.category,`¥${format(r.amount,0)}`].forEach(value=>tr.append(textElement('td',value)));
        $('expense-rows').append(tr);
        grouped[r.category]=(grouped[r.category]||0)+r.amount;
      });
      $('expense-total').textContent=`¥${format(records.reduce((sum,r)=>sum+r.amount,0),0)}`;
      $('expense-categories').replaceChildren();
      Object.entries(grouped).forEach(([key,value])=>$('expense-categories').append(textElement('span',`${key} ¥${format(value,0)}`)));
      $('expense-status').textContent=message||`${records.length}件の経費を表示しています。`;
    }
    function fillSample() { form.reset(); form.elements.namedItem('checked').checked=false; $('expense-status').textContent='固定の読取サンプルを表示しました。原本と照合し、確認欄をチェックしてください。'; }
    $('expense-sample').addEventListener('click',fillSample);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!form.reportValidity())return;
      const data=Object.fromEntries(new FormData(form));
      data.vendor=data.vendor.trim(); data.amount=Number(data.amount);
      if(!data.vendor || !Number.isSafeInteger(data.amount) || data.amount<1 || data.amount>99999999){$('expense-status').textContent='支払先と、1〜99,999,999円の整数を入力してください。';return;}
      if(records.some(r=>r.date===data.date&&r.vendor===data.vendor&&r.amount===data.amount)){ $('expense-status').textContent='同じ日付・支払先・金額の経費が登録済みです。重複候補のため追加していません。';return; }
      records.unshift(data);form.elements.namedItem('checked').checked=false;
      render(`${data.vendor}の経費を、このページ内のデモ一覧に追加しました。`);
    });
    $('expense-reset').addEventListener('click',()=>{records=initial();fillSample();render('架空の経費2件を表示しています。デモを初期化しました。');});
    $('expense-csv').addEventListener('click',()=>{
      // Protect spreadsheet readers from formula injection, and quote every field.
      const safe = value => { let s=String(value); if(/^[\s]*[=+@-]/.test(s))s="'"+s; return '"'+s.replaceAll('"','""')+'"'; };
      const rows=[['利用日','支払先','カテゴリ','金額（円）'],...records.map(r=>[r.date,r.vendor,r.category,r.amount])];
      const csv='\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')+'\r\n';
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='aipartner-expense-demo.csv';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      $('expense-status').textContent=`表示中の${records.length}件をCSVファイルにしました。端末のダウンロード先をご確認ください。`;
    });
    render('架空の経費2件を表示しています。');
  }

  const calc=document.querySelector('.w-calculator');
  if(calc){
    const fields=[$('calc-before'),$('calc-after'),$('calc-count')];
    let sampleMode=false;
    function clear(){['calc-saved','calc-rate','calc-month'].forEach(id=>$(id).textContent='—');}
    function update(){
      $('calc-error').textContent='';
      if(fields.some(f=>f.value.trim()==='')){clear();return;}
      const [before,after,count]=fields.map(f=>Number(f.value));
      if(!fields.every(f=>f.checkValidity())||!Number.isFinite(before)||!Number.isFinite(after)||!Number.isInteger(count)||before<=0||after<0||count<0){
        clear();$('calc-error').textContent='改善前は0より大きい数、改善後は0以上、件数は0以上の整数で入力してください。時間は10万分、件数は100万件までです。';return;
      }
      const saved=before-after;
      $('calc-saved').textContent=`${format(saved)} 分`;
      $('calc-rate').textContent=`${format(saved/before*100)} %`;
      $('calc-month').textContent=`${format(saved*count/60)} 時間`;
      if(saved<0)$('calc-error').textContent='入力条件では作業時間が増加します。マイナスの値は増加分を示します。';
      $('calc-context').textContent=sampleMode ? '仮の条件による計算例です。実測結果ではありません。数値は自由に変更できます。' : '入力条件による参考試算です。実測結果や効果の保証ではありません。';
    }
    fields.forEach(f=>f.addEventListener('input',()=>{sampleMode=false;update();}));
    calc.querySelector('[data-calc-sample]').addEventListener('click',()=>{
      const sample=JSON.parse(calc.dataset.sample);fields.forEach((f,i)=>f.value=sample[i]);sampleMode=true;update();
    });
  }
})();
