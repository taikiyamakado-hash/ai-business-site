import { sectors, jobs, sectorExample, taskQuestions, tailored } from './data.js';
import { BASIS, REGULAR, UNKNOWN, newTask, parseNumber, calculateTask, aggregate, duplicates, rankTasks } from './model.js';

const app = document.querySelector('#app');
const companyDefaults = () => ({ company:'', sector:'', size:'', days:'20', ready:UNKNOWN, goal:'作業時間を減らしたい', commonOps:'' });
let state = { company:companyDefaults(), tasks:[], mode:'simple', screen:'wizard', step:0, date:'' };
const quickCache = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (value, decimals=1) => value === null || value === undefined ? '未算出' : new Intl.NumberFormat('ja-JP',{maximumFractionDigits:decimals}).format(Object.is(value,-0)?0:value);
function duration(value, onlyMinutes=false) {
  if (value === null || value === undefined) return '未算出';
  const sign = value < -0.0000001 ? '−' : '', v=Math.round(Math.abs(value)*10)/10;
  if (onlyMinutes || v<60) return `${sign}${num(v)}分`;
  const h=Math.floor(v/60), m=Math.round((v-h*60)*10)/10;
  return `${sign}${num(h,0)}時間${m?num(m)+'分':''}`;
}
function range(values, minutes=false) {
  if (!values) return '未算出';
  return Math.abs(values[1]-values[0])<1e-8 ? duration(values[0],minutes) : `${duration(values[0],minutes)}〜${duration(values[1],minutes)}`;
}
const percent = values => !values ? '未算出' : Math.abs(values[0]-values[1])<1e-8 ? `${num(values[0])}%` : `${num(values[0])}〜${num(values[1])}%`;
const titleFor = t => t.name.trim() || jobs.find(j=>j.id===t.category).name;
const button = (action,text,style='secondary',extra='') => `<button type="button" class="button ${style}" data-action="${action}" ${extra}>${text}</button>`;
const scope = () => state.mode==='simple'?'選択した業務の改善効果':'登録した対象業務の合計';
const crumb = text => `<p class="breadcrumb no-print">AI_PARTNER <i></i> しごとAI診断 <i></i> ${text}</p>`;
const options = (values,current) => values.map(v=>{const pair=Array.isArray(v)?v:[v,v];return `<option value="${esc(pair[0])}" ${current===pair[0]?'selected':''}>${esc(pair[1])}</option>`;}).join('');
function field(key,label,value,{uid='',hint='',placeholder='',optional=false,integer=false,maxLength='',text=false}={}) {
  const id=uid?`${uid}-${key}`:`company-${key}`;
  return `<div class="field"><label for="${id}">${label}${optional?'<span class="optional">任意</span>':''}</label><input id="${id}" ${uid?`data-task="${uid}"`:'data-company="true"'} data-key="${key}" type="text" ${text?'':`inputmode="${integer?'numeric':'decimal'}" autocomplete="off"`} ${maxLength?`maxlength="${maxLength}"`:''} value="${esc(value)}" placeholder="${esc(placeholder)}" aria-describedby="${id}-hint ${id}-error" aria-invalid="false"><p class="hint" id="${id}-hint">${hint}</p><p class="field-error" id="${id}-error" aria-live="polite"></p></div>`;
}
function selectField(key,label,value,values,uid='',hint='') {
  const id=uid?`${uid}-${key}`:`company-${key}`;
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}" ${uid?`data-task="${uid}"`:'data-company="true"'} data-key="${key}" aria-describedby="${id}-hint">${options(values,value)}</select><p class="hint" id="${id}-hint">${hint}</p></div>`;
}
function choices(key,label,values) {
  return `<fieldset><legend>${label}</legend><div class="choices">${values.map(v=>`<label class="choice"><input type="radio" name="${key}" data-company="true" data-key="${key}" value="${esc(v)}" ${state.company[key]===v?'checked':''}><span>${esc(v)}</span></label>`).join('')}</div></fieldset>`;
}
function companyFields(detailed=false) {
  const c=state.company;
  return `${field('company','会社名・屋号',c.company,{text:true,optional:true,maxLength:80,placeholder:'例）〇〇製作所',hint:'会社名を入れずに診断することもできます。'})}
    ${detailed?selectField('sector','業種',c.sector,[['','選ばない・わからない'],...sectors]):choices('sector','業種',sectors)}
    <div class="field-grid">${field('size','従業員数（人）',c.size,{optional:true,integer:true,placeholder:'例）10',hint:'参考情報です。作業時間に人数を掛けません。'})}${field('days','月間営業日数（日）',c.days,{integer:true,placeholder:'20',hint:'初期設定は20日です。実際の営業日数（1〜31日）に変更できます。'})}</div>`;
}
function directionFields() {
  return `${selectField('ready','資料や記録の状態',state.company.ready,['パソコンの文書・表計算','紙・手書きが中心','紙とデータが混在',UNKNOWN])}
    ${selectField('goal','いちばん優先したいこと',state.company.goal,['作業時間を減らしたい','ミス・確認漏れを減らしたい','担当者しかわからない状態を減らしたい','発信・集客に手を回したい',UNKNOWN])}`;
}
function commonOpsField() {
  return field('commonOps','共通の運用・管理時間（分／月）',state.company.commonOps,{optional:true,placeholder:'不明なら空欄・発生しない場合は0',hint:'複数業務に共通の設定保守など。各業務に入力した時間は、ここに重ねて入れないでください。'});
}
function progress() {
  return `<ol class="steps no-print" aria-label="診断の進行">${['会社のこと','困っている業務','作業のくわしさ','改善の方向'].map((s,i)=>`<li class="${i===state.step?'current':i<state.step?'done':''}" ${i===state.step?'aria-current="step"':''}><b>${i<state.step?'✓':String(i+1).padStart(2,'0')}</b>${s}</li>`).join('')}</ol>`;
}
function renderWizard() {
  const step=state.step;
  let body='';
  if(step===0) body=`<p class="eyebrow">STEP 01 / 04</p><h2 id="page-title" tabindex="-1">まずは、会社のことを。</h2><p class="lead">業種と営業日数をもとに、<br>いつもの仕事の改善余地を整理します。</p>${companyFields()}`;
  if(step===1) body=`<p class="eyebrow">STEP 02 / 04</p><h2 id="page-title" tabindex="-1">時間がかかっているのは？</h2><p class="lead">まずは1つ。気になる業務を3つまで選べます。<br>${esc(sectorExample[state.company.sector]||'日々の報告、返信、転記や資料づくりなど')}。</p><div class="job-list">${jobs.map(j=>`<label class="job-choice"><span class="job-icon" aria-hidden="true">${j.icon}</span><span><strong>${j.name}</strong><small>${j.desc}</small></span><input type="checkbox" data-category="${j.id}" aria-label="${j.name}" ${state.tasks.some(t=>t.category===j.id)?'checked':''}></label>`).join('')}</div><p class="count" role="status">${state.tasks.length} / 3 業務を選択中</p>`;
  if(step===2) body=`<p class="eyebrow">STEP 03 / 04</p><h2 id="page-title" tabindex="-1">今の作業を、見える化。</h2><p class="lead">回数と時間は、わかる範囲で大丈夫。<br>空欄の業務も、改善提案は確認できます。</p><div class="callout">時間は<strong>担当者全員の延べ時間</strong>で入力します。2人が10分ずつなら20分／回。回数は会社全体の対象業務の回数です。</div>${state.tasks.map((t,i)=>taskCard(t,i,false)).join('')}`;
  if(step===3) body=`<p class="eyebrow">STEP 04 / 04</p><h2 id="page-title" tabindex="-1">どんな改善から始めますか？</h2><p class="lead">今の資料の状態と、目指す変化を教えてください。</p>${directionFields()}<hr>${commonOpsField()}<div class="callout">運用時間が不明でも先に進めます。その場合は「運用工数を除く試算」として表示します。初期設定や一度きりの導入教育は含めません。</div>`;
  app.innerHTML=`${crumb('簡易診断')}<div class="wizard-layout ${step>0?'continued':''}"><aside class="intro"><p class="eyebrow">WORK BETTER, START SMALL.</p><h1>仕事の「手間」を、<br><em>見える時間</em>に。</h1><p>いつもの業務を振り返って、<br>AIで助けられるところを、一緒に探しましょう。</p><div class="intro-note"><span aria-hidden="true">✓</span><div><b>わかることから、少しずつ。</b><p>不明な項目はスキップできます。<br>最後に、自分の仕事に合う改善の一歩が見つかります。</p></div></div><div class="intro-benefits"><div><span>01</span>1日・月・年間の削減時間を試算</div><div><span>02</span>今日から試せる活用方法とAI指示文</div><div><span>03</span>診断結果をPDFで持ち帰り</div></div></aside><div>${progress()}<section class="panel wizard-panel" aria-labelledby="page-title">${body}<p class="field-error" id="form-error" role="alert"></p><div class="actions">${step?button('back','← 戻る'): '<p class="hint">回答は送信されません。<br>あとから見直せます。</p>'}${button('next',step===3?'診断結果を見る →':'次へ →','primary')}</div></section></div></div>`;
  refreshValidation();
}
function taskDataQuestions(t) {
  return taskQuestions[t.category].map(([key,label,values])=>selectField(key,label,t[key]||UNKNOWN,[UNKNOWN,...values],t.uid)).join('');
}
function autoReading(t) {
  const dp=parseNumber(state.company.days,{integer:true,min:1,max:31});
  const r=calculateTask(t,dp.value);
  return `<div class="auto-top"><b>${BASIS[t.basis]}${t.basis==='auto'?'（参考値）':''}</b>${t.basis==='auto'?button('manual','修正する','secondary',`data-uid="${t.uid}"`):''}</div>
    <p class="auto-value">${range(r.after,true)}<small> ／回</small></p>
    <p class="hint">${t.basis==='auto'?`仮削減率 ${num(r.job.rate[0]*100)}〜${num(r.job.rate[1]*100)}% × 定型性係数 ${r.factor}。${r.lowConfidence?'定型性が不明のため、信頼度の低い推定です。':'実証された業界平均値ではありません。'}`:t.basis==='measured'?'利用者の自己申告による試行実測です。システムが計測や実測を保証するものではありません。':'利用者が想定した改善後時間を優先しています。自動試算は合算しません。'}</p>
    ${r.valid?`<p class="hint"><b>月間総削減 ${range(r.gross)}</b>${r.gross[0]<0?' ・時間増加を含みます':''}（追加運用時間の差引前）</p>`:''}`;
}
function taskCard(t,i,detailed) {
  return `<details class="task-card" id="card-${t.uid}" data-card="${t.uid}" ${t.open?'open':''}><summary><span class="task-number">${String(i+1).padStart(2,'0')}</span><span class="task-heading"><span data-name="${t.uid}">${esc(titleFor(t))}</span><small data-card-summary="${t.uid}">時間と回数を入力</small></span></summary><div class="task-body">
    ${detailed?selectField('category','業務カテゴリー',t.category,jobs.map(j=>[j.id,j.name]),t.uid):''}
    ${field('name','業務名',t.name,{uid:t.uid,text:true,maxLength:100,placeholder:'例）現場の日報作成',hint:'会社・顧客の個人名や機密情報は含めないでください。'})}
    <div class="field-grid">${selectField('period','発生頻度',t.period,[['day','営業日ごと'],['week','週ごと'],['month','月ごと']],t.uid)}${field('count','期間あたりの回数（回）',t.count,{uid:t.uid,placeholder:'不明なら空欄',hint:'会社全体の回数。少数の頻度は小数で入力できます。'})}</div>
    ${field('before','現在の作業時間（分／回）',t.before,{uid:t.uid,placeholder:'例）60',hint:'担当者全員の延べ時間。2人 × 10分なら20分。'})}
    ${selectField('pattern','作業の定型性',t.pattern,[UNKNOWN,REGULAR,'毎回、判断や例外が多い'],t.uid)}
    ${selectField('sensitive','情報の機密性',t.sensitive,[UNKNOWN,'公開してよい情報が中心','顧客・社員情報や社外秘を含む'],t.uid)}
    <div class="auto-box"><div id="auto-reading-${t.uid}">${autoReading(t)}</div>${t.basis!=='auto'?`<hr><div class="field-grid">${field('after','改善後の時間（分／回）',t.after,{uid:t.uid,placeholder:'例）40',hint:'AI出力の確認・修正・承認を含む時間。'})}${selectField('basis','時間の根拠',t.basis,[['expected','利用者予想'],['measured','試行実測']],t.uid)}</div><button type="button" data-action="auto" data-uid="${t.uid}" class="text-button">自動試算に戻す</button>`:''}</div>
    ${detailed?`<div style="margin-top:20px">${opsField(t)}</div>`:''}
    <details class="sub-details"><summary>改善提案に使う状況を追加する（任意）</summary>${taskDataQuestions(t)}${!detailed?opsField(t):''}</details>
    <div id="warnings-${t.uid}"></div>${detailed?`<div class="inline-actions"><p class="hint">業務ごとに異なる条件を設定できます。</p><button class="text-button danger" type="button" data-action="delete" data-uid="${t.uid}">この業務を削除</button></div>`:''}</div></details>`;
}
function opsField(t) {
  return field('ops','この業務の追加運用時間（分／月）',t.ops,{uid:t.uid,optional:true,placeholder:'不明なら空欄・発生しない場合は0',hint:'通常の改善後作業とは別の、設定見直しや保守だけ。確認・修正時間を二重に含めないでください。'});
}
function renderDetail(focusUid='') {
  state.screen='detail';
  app.innerHTML=`${crumb('詳細診断')}<div class="detail-head"><div><span class="tagline">簡易診断の回答を引き継いでいます</span><h1 id="page-title" tabindex="-1">仕事をひとつずつ、詳しく。</h1><p>業務を追加・編集して、あなたの条件で試算できます。更新はその場で反映されます。</p></div>${button('result','診断レポートを見る →','primary')}</div><div class="detail-layout"><div class="detail-main"><section class="panel"><h2>会社の情報と計算条件</h2>${companyFields(true)}${directionFields()}${commonOpsField()}<div id="common-warnings"></div></section><div class="detail-toolbar"><h2>登録した業務 <span id="task-count">${state.tasks.length}</span>件</h2><div class="toolbar-right"><button class="text-button" data-action="collapse">すべて閉じる</button><button class="text-button" data-action="expand">すべて開く</button></div></div><div class="callout">回数は会社全体、時間は担当者全員の延べ時間。従業員数は別途掛けません。確認・修正・承認を含めて、改善後の時間を入力してください。</div><div id="task-list">${state.tasks.length?state.tasks.map((t,i)=>taskCard(t,i,true)).join(''):'<p class="empty">まだ業務がありません。下のボタンから追加できます。</p>'}</div><button class="add-task" type="button" data-action="add">＋ 業務を追加する</button></div><aside class="detail-sidebar" aria-label="現在の試算"><div id="live-summary" aria-live="polite" aria-atomic="true"></div></aside></div>`;
  refreshDerived();
  if(focusUid) document.getElementById(`${focusUid}-name`)?.focus();
}
function opsMessage(a) {
  if(!a.canCalculate)return '計算できる業務の回数と時間を入力してください。';
  return a.completeOps?'業務別の追加運用時間と共通管理分を差し引いた正味の値です。':`運用工数を除く試算：未入力の ${a.missingOps.length}項目は未反映です。入力済みの運用時間は差し引いています。`;
}
function liveSummary(a) {
  return `<section class="panel"><h2 class="summary-title">登録した対象業務の合計</h2><div class="mini-kpi"><span>1か月あたりの${a.completeOps?'正味':''}削減時間</span><strong>${range(a.net)}</strong></div><div class="mini-kpi"><span>1営業日あたりの平均</span><strong>${range(a.daily,true)}</strong></div><div class="mini-kpi"><span>年間換算 ／ 削減率</span><strong>${range(a.annual)}</strong><p class="hint">${percent(a.percent)}</p></div><p class="summary-footer">${a.total} / ${a.registered} 業務を集計<br>${opsMessage(a)}</p>${a.net&&a.net[0]<0?'<p class="field-error">時間増加を含む試算です。</p>':''}${a.daysError?`<p class="field-error">${a.daysError}</p>`:''}${a.commonOpsError?`<p class="field-error">${a.commonOpsError}</p>`:''}${button('result','診断レポートを見る →','primary','style="width:100%"')}<p class="hint">月の作業量が12か月続く場合の年換算です。会社の全業務を表すものではありません。</p></section>`;
}
function setError(id,message) {
  const error=document.getElementById(`${id}-error`),input=document.getElementById(id);
  if(error)error.textContent=message;
  if(input)input.setAttribute('aria-invalid',message?'true':'false');
}
function refreshValidation() {
  const a=aggregate(state.tasks,state.company);
  setError('company-days',a.daysError);
  setError('company-commonOps',a.commonOpsError);
  const size=parseNumber(state.company.size,{integer:true});setError('company-size',size.error);
  for(const r of a.rows) for(const key of ['before','count','after','ops'])setError(`${r.task.uid}-${key}`,r.errors[key]||'');
  return a;
}
function refreshDerived() {
  const a=refreshValidation(),dupes=duplicates(state.tasks);
  for(const r of a.rows) {
    const t=r.task;
    const summary=document.querySelector(`[data-card-summary="${t.uid}"]`);
    if(summary)summary.textContent=r.valid?`${num(r.count,2)}回／月 · ${BASIS[t.basis]} · 総削減 ${range(r.gross)}`:`${BASIS[t.basis]} · 時間集計は未算出`;
    const name=document.querySelector(`[data-name="${t.uid}"]`);if(name)name.textContent=titleFor(t);
    const reading=document.getElementById(`auto-reading-${t.uid}`);if(reading)reading.innerHTML=autoReading(t);
    const warnings=document.getElementById(`warnings-${t.uid}`);
    if(warnings)warnings.innerHTML=[...(dupes.has(t.uid)?['同じカテゴリー・業務名が登録されています。同じ作業を二重計上していないか確認してください。']:[]),...r.warnings].map(w=>`<p class="callout warn">${esc(w)}</p>`).join('');
  }
  const summary=document.getElementById('live-summary');if(summary)summary.innerHTML=liveSummary(a);
  const common=document.getElementById('common-warnings');
  if(common)common.innerHTML=Number(state.company.commonOps)>10000?'<p class="callout warn">共通管理時間が大きいため、単位と業務別入力との重複を確認してください。</p>':'';
}
function kpis(a) {
  return `<section class="kpi-section" aria-label="削減時間の試算"><div class="kpi-top"><span>${scope()} · ${a.total} / ${a.registered} 業務を集計</span><span class="pill">${a.canCalculate?(a.completeOps?'運用時間を差引済み':'運用工数を除く試算'):'時間は未算出'}</span></div><div class="kpi-grid"><div class="kpi"><div class="kpi-label">1営業日あたり<span>平均</span></div><strong id="kpi-daily">${range(a.daily,true)}</strong><small>月間の削減時間 ÷ ${a.days??'未入力'}営業日</small></div><div class="kpi"><div class="kpi-label">1か月あたり</div><strong id="kpi-month">${range(a.net)}</strong><small>${a.completeOps?'追加運用・共通管理分を差引済み':'未入力の運用時間は含みません'}</small></div><div class="kpi"><div class="kpi-label">年間換算</div><strong id="kpi-year">${range(a.annual)}</strong><small>同じ月間作業量が12か月続く場合</small></div></div><div class="kpi-bottom"><div class="rate"><small>${a.completeOps?'正味削減率':'削減率（未入力の運用工数を除く）'}</small><span id="kpi-rate">${percent(a.percent)}</span></div><span>仮係数を含む試算は、効果を保証するものではありません。</span></div></section>
  ${a.net&&a.net[0]<0?`<div class="callout warn"><b>${a.net[1]<0?'時間増加の試算です。':'削減にも時間増加にもなる可能性があります。'}</b> マイナスは作業時間の増加を示します。改善後の確認時間と、運用・管理の負担を見直してください。</div>`:''}
  ${!a.canCalculate?'<div class="callout">時間は未算出です。回数・時間が不明でも、下の改善提案とAI指示文は利用できます。</div>':!a.completeOps?`<div class="callout warn">${opsMessage(a)}<br>未入力：${a.missingOps.map(esc).join('、')}。発生しないと確認できた項目だけ0を入力してください。</div>`:''}
  ${a.before===0&&a.canCalculate?'<p class="hint">現在の月間作業時間が0のため、削減率は未算出です。削減時間は計算できます。</p>':''}`;
}
function graph(a) {
  if(!a.canCalculate)return '<section class="graph-panel"><p class="lead">改善前後の比較は未算出です。時間を入力した業務から表示します。</p></section>';
  const max=Math.max(a.before,a.after[1],1),w=n=>Math.max(0,Math.min(100,n/max*100));
  return `<section class="graph-panel" aria-label="月間作業時間の比較"><div class="graph-row"><span>改善前</span><div><div class="bar-line" aria-hidden="true"><div class="bar" style="width:${w(a.before)}%"></div></div><div class="bar-number">${duration(a.before)}／月</div></div></div><div class="graph-row"><span>改善後</span><div><div class="bar-line" aria-hidden="true"><div class="bar range" style="width:${w(a.after[1])}%"></div><div class="bar after" style="width:${w(a.after[0])}%"></div></div><div class="bar-number">${range(a.after)}／月</div></div></div><p class="graph-caption">改善後は確認・修正・承認を含む通常作業の時間です。斜線部分は自動試算による範囲。追加運用時間はグラフと分けて下に示します。</p><div class="metrics-strip"><div>月間総削減（運用の差引前）<b>${range(a.gross)}</b></div><div>入力済みの追加運用・管理<b>${duration(a.knownOps)}／月${a.completeOps?'':' ＋ 未入力分あり'}</b></div><div>${a.completeOps?'月間正味削減':'月間削減（未入力の運用工数を除く）'}<b>${range(a.net)}</b></div></div></section>`;
}
function resultTask(r) {
  const t=r.task, afterText=r.after?range(r.after,true):'未算出';
  return `<article class="result-task"><div class="result-task-top"><div><h3>${esc(titleFor(t))}</h3><span class="pill ${t.basis==='auto'?'':t.basis==='measured'?'blue':'amber'}">${BASIS[t.basis]}</span> ${r.lowConfidence?'<span class="pill amber">定型性不明・低信頼</span>':''}</div><div class="saving ${r.gross&&r.gross[0]<0?'negative':''}">${range(r.gross)}<small>${r.valid?'月間総削減・追加運用差引前':'時間集計の対象外'}${r.gross&&r.gross[0]<0?' ／時間増加を含む':''}</small></div></div><div class="task-stats"><div>現在 → 改善後／回<b>${parseNumber(t.before).value===null?'未入力':duration(parseNumber(t.before).value,true)} → ${afterText}</b></div><div>月間の回数<b>${r.count===null?'未算出':`${num(r.count,2)}回`}</b></div><div>業務別の追加運用<b>${r.ops===null?'未入力':duration(r.ops)}${r.ops===null?'':'／月'}</b></div></div><p class="task-foot">${t.basis==='auto'?`仮削減率 ${num(r.job.rate[0]*100)}〜${num(r.job.rate[1]*100)}% × 定型性係数 ${r.factor}。設計上の仮定です。`:t.basis==='measured'?'試行実測は利用者の自己申告です。システムが計測・保証した値ではありません。':'利用者が予想した改善後時間を優先。自動試算は加算していません。'} ${!r.valid?`集計対象外：${esc([...r.missing,...Object.values(r.errors)].join('、'))}。`:''}</p></article>`;
}
function recommendation(row,i) {
  const t=row.task,j={...row.job,...t,id:t.category,name:titleFor(t)},p=tailored(j,state.company);
  return `<article class="recommendation"><div class="recommendation-header"><div><p class="eyebrow">ACTION ${String(i+1).padStart(2,'0')}</p><h3>${esc(titleFor(t))}</h3><p class="hint">${esc(p.route)}</p></div><span class="pill ${row.easy?'':'amber'}">${row.easy?'小さく試しやすい':'準備・確認から始める'}</span></div><p class="lead">${esc(p.action)}</p><div class="roles"><div><b>AIに任せる部分</b><p>${esc(row.job.auto)}</p></div><div><b>人が担当する部分</b><p>${esc(row.job.human)}</p></div></div><div class="callout"><b>まず用意するもの</b><br>${esc(p.prep)}</div><p class="hint"><b>完成形：</b>${esc(p.fields)}<br><b>確認：</b>${esc(p.check)}。</p>${t.sensitive!=='公開してよい情報が中心'?'<p class="hint">情報の取り扱い：利用を認められたAI環境と入力できる情報を確認し、最初は架空・匿名化した資料で試します。</p>':''}${state.company.sector==='介護・福祉'?'<p class="hint">ケアの判断や個人の状態評価は対象にせず、記録・文章の補助に限定します。</p>':''}<details class="prompt-details" data-print-expand><summary>この業務のAI指示文を見る</summary><div class="prompt-top"><p>資料欄を置き換え、会社で認められたAI環境で使ってください。</p><button class="button secondary no-print" data-action="copy" data-uid="${t.uid}">指示文をコピー</button></div><pre id="prompt-${t.uid}">${esc(p.prompt)}</pre><p class="hint no-print" role="status" id="copy-status-${t.uid}"></p></details></article>`;
}
function conditions(a) {
  const periodName={day:'営業日ごと',week:'週ごと',month:'月ごと'};
  return `<details class="conditions" data-print-expand><summary>計算条件・根拠・注意事項を確認</summary><div class="conditions-body"><h3>計算条件</h3><p>診断日：${esc(state.date)} ／ 月間営業日数：${a.days??'未入力'}日<br>資料：${esc(state.company.ready)} ／ 目的：${esc(state.company.goal)}<br>集計対象：${a.total} / ${a.registered} 業務。${a.excluded.length?`対象外：${a.excluded.map(r=>esc(titleFor(r.task))).join('、')}。対象外業務は通常作業・業務別運用時間とも合計に含めません。`:''}</p><ul><li>営業日ごと：回数 × 月間営業日数。週ごと：回数 × 52 ÷ 12。月ごと：入力回数。月間回数の小数は計算中に丸めません。</li><li>現在の月間時間 = 月間回数 × 現在の延べ時間。改善後の月間時間 = 月間回数 × 改善後の延べ時間。</li><li>月間総削減 = 現在 − 改善後。月間正味削減 = 総削減 − 追加運用・共通管理。1営業日平均 = 月間正味削減 ÷ 営業日数。年間 = 月間正味削減 × 12。</li><li>正味削減率 = 月間正味削減 ÷ 現在の月間時間 × 100。現在が0の場合は削減率を算出しません。従業員数は掛けません。</li><li>自動試算の上下限に、利用者入力の単一値をそれぞれ加えます。自動値と手動値は同時に合算しません。表示のみ丸めるため、表示値の足し算と小差が出る場合があります。</li><li>定型性係数：繰り返しが多い1.0、例外・判断が多い0.5。不明も暫定0.5ですが低信頼の推定です。</li><li>${opsMessage(a)}${a.missingOps.length?` 未入力：${a.missingOps.map(esc).join('、')}。`:''}</li><li>AI出力の確認・修正・承認は改善後の時間に含めます。運用欄はそれ以外の追加作業だけ。初期設定・一度きりの導入教育は月間値に含めません。</li><li>年間換算は同じ月間作業量が12か月続く仮定です。登録していない業務への効果は含みません。</li></ul><h3>試算に使った仮の削減率</h3><div class="coefficient-list">${jobs.map(j=>`<div><span>${j.name}</span><b>${num(j.rate[0]*100)}〜${num(j.rate[1]*100)}%</b></div>`).join('')}</div><p>設計上の仮定であり、実証された業界平均ではありません。生成AIによる個別企業の効果予測ではなく、ブラウザ内の固定係数による試算です。試行実測は利用者による自己申告です。</p><h3>業務別の入力と時間の根拠</h3>${a.rows.map(r=>`<p><b>${esc(titleFor(r.task))}</b>：${esc(r.job.name)} ／ ${periodName[r.task.period]} ${r.task.count===''?'不明':esc(r.task.count)}回 ／ 現在 ${r.task.before===''?'不明':esc(r.task.before)}分／回 → 改善後 ${range(r.after,true)}／回 ／ ${BASIS[r.task.basis]} ／ 業務別運用 ${r.ops===null?'不明':num(r.ops)+'分／月'}<br>定型性：${esc(r.task.pattern)} ／ 機密性：${esc(r.task.sensitive)}${r.lowConfidence?' ／ 低信頼の推定':''}</p>`).join('')}<p>共通管理時間：${a.commonOps===null?'未入力':duration(a.commonOps)+'／月'}。会社名は任意、回答はこのブラウザ内だけで扱います。PDFを共有する前に、記載内容をご確認ください。</p><h3>導入時の注意</h3><p>効果を保証する診断ではありません。入力可能な情報・ツールの利用条件・社内ルールを確認し、安全判断、価格決定、送信、公開、最終承認は人が行います。少数の試行で、準備・入力・確認・修正を含む時間と誤りの数を記録してから対象を広げてください。</p></div></details>`;
}
function renderResult() {
  state.screen='result';
  if(!state.date)state.date=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric'}).format(new Date());
  const a=aggregate(state.tasks,state.company),ranked=rankTasks(a.rows,state.company),first=ranked[0];
  app.innerHTML=`${crumb('診断レポート')}<div class="results"><div class="result-head"><div><p class="eyebrow">YOUR WORK, YOUR NEXT STEP.</p><h1 id="page-title" tabindex="-1">仕事の余白をつくる、最初の一歩。</h1><div class="result-meta"><span>${esc(state.company.company||'会社名未入力')}</span><span>${esc(state.company.sector||'業種未指定')}</span><span>${esc(state.date)}</span><span>月間 ${a.days??'未入力'}営業日</span></div></div><div class="result-actions no-print">${button('edit','回答を編集')}${button('print','PDF保存・印刷','primary')}</div></div><p class="print-only print-note">AI_Partner｜しごとAI診断 v1.0 ／ ${scope()}。推定と利用者申告を含む診断レポートです。</p>
    ${kpis(a)}
    <div class="section-title"><h2>改善前と、改善後。</h2><span>月間作業時間の比較</span></div>${graph(a)}
    <div class="section-title"><h2>業務ごとの改善効果</h2><span>${a.total} / ${a.registered} 業務を集計</span></div><div class="result-task-list">${a.rows.map(resultTask).join('')||'<p class="empty">業務を追加すると、改善効果を比較できます。</p>'}</div>
    ${state.mode==='simple'?`<section class="transition-card no-print"><div><h3>ほかの仕事も、まとめて見直す。</h3><p>回答を引き継いで、業務の追加・改善後時間の修正ができます。<br>同じカテゴリーに複数の業務も登録できます。</p></div>${button('detail','詳細診断へ進む →','primary')}</section>`:''}
    ${first?`<div class="section-title"><h2>優先して、試したい業務</h2><span>時間・準備・確認のしやすさから</span></div><section class="priority-panel"><div class="priority-title"><span class="priority-number">01</span><div><h3>${esc(titleFor(first.task))}</h3><p class="hint">${first.easy?'小さく試しやすい候補です。':'まず必要な資料・確認体制を整える候補です。'}</p></div></div><p class="lead">${esc(first.job.trial)}</p><div class="reasons">${first.reasons.map(s=>`<span>${esc(s)}</span>`).join('')}</div><p class="hint">月間削減の目安、定型性、資料、機密性、人の確認、準備の難しさと改善目的で候補を整理しています。時間が不明な業務の削減効果は順位計算に加えません。</p></section>
    <div class="section-title"><h2>具体的な使い方と、AI指示文</h2><span>確認しながら、1件ずつ</span></div><div class="recommendations">${ranked.map(recommendation).join('')}</div>
    <div class="section-title"><h2>導入・検証は、この3ステップ。</h2></div><section class="panel"><div class="week-grid"><div><span class="step-num">01 / 準備</span><b>対象を1件に絞る</b><p>${esc(tailored({...first.job,...first.task,id:first.task.category},state.company).prep)} 今の時間・確認箇所を記録します。</p></div><div><span class="step-num">02 / 試行</span><b>同じ型で3件、試す</b><p>会社で認められた環境で、資料の準備から確認・修正までを計測します。誤りや確認漏れの数も比べます。</p></div><div><span class="step-num">03 / 判断</span><b>時間と品質を見て続ける</b><p>誤りが増えず、作業時間が減れば対象を広げます。実際に測った時間は、詳細診断の「試行実測」に反映できます。</p></div></div></section>`:''}
    ${conditions(a)}
    <section class="consult"><div><h3>自分の仕事で、どう使えるか。</h3><p>御殿場・裾野の業務改善を、AI_Partnerに相談できます。<br>診断の回答や結果は、問い合わせ先へ自動転送されません。</p><p class="print-only">相談先：t.yamakado.ai.partner@gmail.com<br>https://aipartner-fuji.com/</p></div><a class="button lime no-print" href="https://aipartner-fuji.com/" target="_blank" rel="noopener noreferrer">AI_Partnerの相談案内へ ↗</a></section>
    <div class="bottom-actions no-print">${button('print','PDF保存・印刷','primary')}${button('edit','回答を編集')}${state.mode==='simple'?button('detail','詳細診断へ進む'):button('detail','業務を追加・編集')}<button class="text-button" type="button" data-action="reset">新しく診断する</button></div><p class="hint no-print">PDFは印刷画面で「PDFに保存」を選択してください。iPhoneでは共有・プリントの操作から保存できます。再読み込み・ページを閉じると回答は失われます。</p><div class="report-footer"><b>AI_Partner ／ AI業務改善アドバイザー・山門 大騎</b><span>御殿場・裾野 ／ t.yamakado.ai.partner@gmail.com</span></div></div>`;
}
function showToast(text) {
  document.getElementById('toast').textContent=text;
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>document.getElementById('toast').textContent='',4500);
}
function topFocus() {window.scrollTo({top:0,behavior:'instant'});document.getElementById('page-title')?.focus({preventScroll:true});}
function validateCurrent() {
  const a=refreshValidation();
  if(state.step===0&&(a.daysError||parseNumber(state.company.size,{integer:true}).error))return '入力の赤い説明を確認してください。';
  if(state.step===1&&!state.tasks.length)return '改善したい業務を1つ以上選んでください。';
  if(state.step===2&&a.rows.some(r=>Object.keys(r.errors).length))return '入力の赤い説明を確認してください。不明な数字は空欄で進めます。';
  if(state.step===3&&a.commonOpsError)return '共通の運用時間を0以上の数値で入力するか、空欄にしてください。';
  return '';
}
function handleValue(el) {
  const key=el.dataset.key;
  if(!key)return;
  if(el.dataset.company)state.company[key]=el.value;
  else if(el.dataset.task) {
    const t=state.tasks.find(x=>x.uid===el.dataset.task);if(!t)return;
    if(key==='category') {
      const old=jobs.find(j=>j.id===t.category);if(t.name===old.name)t.name=jobs.find(j=>j.id===el.value).name;
      ['source','output','pain','review'].forEach(k=>t[k]=UNKNOWN);
    }
    t[key]=el.value;
    if(key==='category') {renderDetail();return;}
  }
  if(state.screen==='detail'||state.step===2)refreshDerived();else refreshValidation();
}
app.addEventListener('input',e=>{if(e.target.matches('input[data-key]')&&e.target.type!=='radio')handleValue(e.target);});
app.addEventListener('change',e=>{
  const el=e.target;
  if(el.matches('select[data-key], input[type=radio][data-key]'))handleValue(el);
  if(el.dataset.category) {
    const category=el.dataset.category;
    if(el.checked&&state.tasks.length>=3) {el.checked=false;document.getElementById('form-error').textContent='簡易診断は3業務までです。結果から詳細診断へ進むと、さらに追加できます。';return;}
    if(el.checked)state.tasks.push(quickCache.get(category)||newTask(category));
    else {quickCache.set(category,state.tasks.find(t=>t.category===category));state.tasks=state.tasks.filter(t=>t.category!==category);}
    document.querySelector('.count').textContent=`${state.tasks.length} / 3 業務を選択中`;
    document.getElementById('form-error').textContent='';
  }
});
app.addEventListener('toggle',e=>{if(e.target.dataset.card){const t=state.tasks.find(x=>x.uid===e.target.dataset.card);if(t)t.open=e.target.open;}},true);
app.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action,t=state.tasks.find(x=>x.uid===el.dataset.uid);
  if(action!=='print')restorePrint();
  if(action==='next') {
    const error=validateCurrent();if(error){document.getElementById('form-error').textContent=error;app.querySelector('[aria-invalid=true]')?.focus();return;}
    if(state.step===3)renderResult();else{state.step++;renderWizard();if(state.step===2)refreshDerived();}topFocus();
  } else if(action==='back'){state.step--;renderWizard();if(state.step===2)refreshDerived();topFocus();}
  else if(action==='detail'){state.mode='detail';renderDetail();topFocus();}
  else if(action==='edit'){if(state.mode==='detail')renderDetail();else{state.screen='wizard';state.step=0;renderWizard();}topFocus();}
  else if(action==='result') {
    const a=refreshValidation();if(a.daysError||a.commonOpsError||a.rows.some(r=>Object.keys(r.errors).length)||parseNumber(state.company.size,{integer:true}).error){
      for(const r of a.rows)if(Object.keys(r.errors).length){r.task.open=true;document.getElementById(`card-${r.task.uid}`).open=true;}
      showToast('赤い入力説明を確認してください。不明な項目は空欄にできます。');app.querySelector('[aria-invalid=true]')?.focus();return;
    }renderResult();topFocus();
  } else if(action==='add'){state.tasks.forEach(t=>t.open=false);const added=newTask();state.tasks.push(added);renderDetail(added.uid);}
  else if(action==='delete'&&t){if(confirm(`「${titleFor(t)}」を削除しますか？`)){state.tasks=state.tasks.filter(x=>x.uid!==t.uid);renderDetail();showToast('業務を削除し、合計を更新しました。');}}
  else if(action==='collapse'||action==='expand'){state.tasks.forEach(t=>{t.open=action==='expand';document.getElementById(`card-${t.uid}`).open=t.open;});}
  else if(action==='manual'&&t){t.basis='expected';t.after='';if(state.mode==='detail')renderDetail();else{renderWizard();refreshDerived();}document.getElementById(`${t.uid}-after`)?.focus();}
  else if(action==='auto'&&t){t.basis='auto';t.after='';if(state.mode==='detail')renderDetail();else{renderWizard();refreshDerived();}document.querySelector(`#auto-reading-${t.uid} button`)?.focus();showToast('利用者入力を破棄し、自動試算に戻しました。');}
  else if(action==='copy'&&t){const text=document.getElementById(`prompt-${t.uid}`).textContent;const status=document.getElementById(`copy-status-${t.uid}`);try{await navigator.clipboard.writeText(text);status.textContent='コピーしました。資料欄を置き換えてお使いください。';}catch{status.textContent='指示文を選択してコピーしてください。';const selection=window.getSelection(),r=document.createRange();r.selectNodeContents(document.getElementById(`prompt-${t.uid}`));selection.removeAllRanges();selection.addRange(r);}}
  else if(action==='print'){preparePrint();window.print();}
  else if(action==='reset'){if(confirm('入力した回答を消去して、新しい診断を始めますか？')){state={company:companyDefaults(),tasks:[],mode:'simple',screen:'wizard',step:0,date:''};quickCache.clear();renderWizard();topFocus();}}
});
let printState=null;
function preparePrint(){
  if(printState)return;
  const details=[...document.querySelectorAll('[data-print-expand]')];
  printState={details,open:details.map(d=>d.open),title:document.title};
  details.forEach(d=>d.open=true);
  document.title=`しごとAI診断_${state.company.company||'診断レポート'}_${state.date.replace(/[^0-9]/g,'-')}`;
}
window.addEventListener('beforeprint',preparePrint);
function restorePrint(){if(!printState)return;printState.details.forEach((d,i)=>d.open=printState.open[i]);document.title=printState.title;printState=null;}
window.addEventListener('afterprint',restorePrint);
renderWizard();
