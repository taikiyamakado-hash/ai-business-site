import { jobs } from './data.js';

export const BASIS = { auto: '自動試算', expected: '利用者予想', measured: '試行実測' };
export const REGULAR = '同じ型の繰り返しが多い';
export const UNKNOWN = 'わからない';
let serial = 0;
export function newTask(category = 'report') {
  return { uid: `task-${++serial}`, category, name: jobs.find(j => j.id === category)?.name || '',
    period: 'month', count: '', before: '', pattern: UNKNOWN, sensitive: UNKNOWN,
    basis: 'auto', after: '', ops: '', source: UNKNOWN, output: UNKNOWN, pain: UNKNOWN,
    review: UNKNOWN, open: true };
}
export function parseNumber(value, { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') return { value: null, error: '' };
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return { value: null, error: '0以上の半角数字で入力してください。' };
  const n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    return { value: null, error: integer && max === 31 ? '1〜31の整数で入力してください。' : '計算できる範囲の数値を入力してください。' };
  }
  return { value: n, error: '' };
}
export function monthlyCount(period, count, days) {
  if (count === null || days === null) return null;
  return period === 'day' ? count * days : period === 'week' ? count * 52 / 12 : period === 'month' ? count : null;
}
export function calculateTask(task, days) {
  const job = jobs.find(j => j.id === task.category);
  const errors = {}, warnings = [];
  const parsed = {};
  for (const key of ['count', 'before', 'ops', ...(task.basis === 'auto' ? [] : ['after'])]) {
    const p = parseNumber(task[key]); parsed[key] = p.value;
    if (p.error) errors[key] = p.error;
  }
  if (parsed.count > 1000) warnings.push('発生回数が大きいため、期間と会社全体の回数を再確認してください。');
  if (parsed.before > 1440 || parsed.after > 1440) warnings.push('1回の延べ時間が24時間を超えています。担当者全員の合計として正しいか確認してください。');
  if (parsed.ops > 10000) warnings.push('追加運用時間が大きいため、通常作業との重複がないか確認してください。');
  const factor = task.pattern === REGULAR ? 1 : 0.5;
  const rate = job ? job.rate.map(r => r * factor) : [0, 0];
  const count = monthlyCount(task.period, parsed.count, days);
  const autoAfter = parsed.before === null ? null : [parsed.before * (1 - rate[1]), parsed.before * (1 - rate[0])];
  let after = task.basis === 'auto' ? autoAfter : parsed.after === null ? null : [parsed.after, parsed.after];
  const missing = [];
  if (parsed.before === null) missing.push('現在の時間');
  if (parsed.count === null) missing.push('発生回数');
  if (days === null) missing.push('営業日数');
  if (after === null && task.basis !== 'auto') missing.push('改善後の時間');
  if (!job) errors.category = '業務カテゴリーを選んでください。';
  if (!['auto','expected','measured'].includes(task.basis)) errors.basis = '時間の根拠を選んでください。';
  if (!['day','week','month'].includes(task.period)) errors.period = '発生頻度を選んでください。';
  let valid = Object.keys(errors).length === 0 && missing.length === 0;
  const beforeMonth = valid ? count * parsed.before : null;
  const afterMonth = valid ? after.map(n => n * count) : null;
  if (valid && [beforeMonth, ...afterMonth].some(n => !Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER)) {
    errors.before = '回数と時間の積が計算可能な範囲を超えています。'; valid = false;
  }
  return { task, job, valid, errors, warnings, missing, factor, rate, count, autoAfter, after,
    beforeMonth: valid ? beforeMonth : null, afterMonth: valid ? afterMonth : null,
    gross: valid ? [beforeMonth - afterMonth[1], beforeMonth - afterMonth[0]] : null,
    ops: parsed.ops, lowConfidence: task.basis === 'auto' && (!task.pattern || task.pattern === UNKNOWN) };
}
export function aggregate(tasks, company) {
  const dp = parseNumber(company.days, {integer:true,min:1,max:31});
  const daysError = dp.error || (dp.value === null ? '月間営業日数を1〜31日で入力してください。' : '');
  const cp = parseNumber(company.commonOps);
  const rows = tasks.map(t => calculateTask(t, daysError ? null : dp.value));
  const included = rows.filter(r => r.valid), excluded = rows.filter(r => !r.valid);
  const total = included.length;
  const result = { rows, included, excluded, total, registered: tasks.length, days:dp.value, daysError,
    commonOpsError:cp.error, commonOps:cp.value, completeOps:false, canCalculate:false,
    before:null, after:null, gross:null, net:null, daily:null, annual:null, percent:null,
    knownOps:null, missingOps:[] };
  if (!total || daysError || cp.error) return result;
  const sum = fn => included.reduce((a, r) => a + fn(r), 0);
  const before = sum(r => r.beforeMonth), after = [sum(r => r.afterMonth[0]), sum(r => r.afterMonth[1])];
  const gross = [sum(r => r.gross[0]), sum(r => r.gross[1])];
  const knownOps = sum(r => r.ops === null ? 0 : r.ops) + (cp.value === null ? 0 : cp.value);
  const missingOps = included.filter(r => r.ops === null).map(r => r.task.name || r.job.name);
  if (cp.value === null) missingOps.push('共通管理分');
  const net = gross.map(n => n - knownOps), annual = net.map(n => n * 12);
  if ([before,...after,...net,...annual,knownOps].some(n => !Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER)) {
    return {...result, commonOpsError:'合計が計算可能な範囲を超えています。入力値をご確認ください。'};
  }
  return {...result,canCalculate:true,before,after,gross,net,knownOps,missingOps,completeOps:missingOps.length===0,
    daily:net.map(n=>n/dp.value),annual,percent:before>0?net.map(n=>n/before*100):null};
}
export function duplicates(tasks) {
  const key = t => `${t.category}:${t.name.normalize('NFKC').replace(/\s/g,'').toLowerCase()}`;
  const counts = new Map(); tasks.forEach(t => counts.set(key(t),(counts.get(key(t)) || 0)+1));
  return new Set(tasks.filter(t => counts.get(key(t)) > 1).map(t => t.uid));
}
export function rankTasks(rows, company) {
  return rows.map(row => {
    const t=row.task, regular=t.pattern===REGULAR;
    const publicInfo=t.sensitive==='公開してよい情報が中心';
    const ready=company.ready==='パソコンの文書・表計算';
    const reviewerKnown=t.review && t.review!==UNKNOWN && !/未定|決まっていない/.test(t.review);
    const saving=row.gross?((row.gross[0]+row.gross[1])/2)-(row.ops??0):0;
    let score=Math.log1p(Math.max(0,saving))*5+(regular?14:0)+(publicInfo?12:0)+(ready?10:0)+(reviewerKnown?6:0);
    if (saving<0) score-=40;
    if(company.goal==='発信・集客に手を回したい'&&t.category==='sns')score+=18;
    if(company.goal==='担当者しかわからない状態を減らしたい'&&t.category==='manual')score+=18;
    if(company.goal==='ミス・確認漏れを減らしたい'&&['entry','report'].includes(t.category))score+=12;
    const reasons=[regular?'定型作業が多い':'例外の少ない一部分から',ready?'資料がデータ化済み':'資料の整理から',publicInfo?'公開可能な情報で試せる':'情報の利用範囲を要確認',reviewerKnown?'確認担当・確認観点の回答あり':'確認担当・確認観点を要確認'];
    return {...row,score,reasons,easy:regular&&publicInfo&&ready&&reviewerKnown};
  }).sort((a,b)=>b.score-a.score);
}
