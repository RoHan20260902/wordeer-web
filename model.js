import {morphologyCandidates} from './morphology.js';
export const KEY='wordeer.web.words.v1';
export const categories=['名词','动词','形容词','副词','代词','介词','连词','限定词','感叹词','短语与固定表达','其他'];
export const normalize=s=>s.trim().toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,' ').replace(/^[.,!?;:" ]+|[.,!?;:" ]+$/g,'');
export function validate(data){
 if(!data||data.app!=='wordeer'||data.version!==1||!Array.isArray(data.words)||!Array.isArray(data.pending)||data.words.length>50000||data.pending.length>50000)throw Error('请选择 Wordeer 备份文件');
 for(const w of data.words){if(!w||['term','phonetic','meaning','category','example'].some(k=>typeof w[k]!=='string'||w[k].length>20000)||!w.term||!categories.includes(w.category)||![0,1].includes(w.favorite)||['reviews','level','due','created'].some(k=>!Number.isSafeInteger(w[k])||w[k]<0))throw Error('备份数据格式不正确');}
 if(data.words.some(w=>w.note!==undefined&&(typeof w.note!=='string'||w.note.length>2000)))throw Error('笔记格式不正确');
 for(const w of data.words){
  if(w.meaningLanguage!==undefined&&!['zh','en'].includes(w.meaningLanguage))throw Error('释义语言格式不正确');
  if(w.nuance!==undefined&&(typeof w.nuance!=='string'||w.nuance.length>20000))throw Error('语感格式不正确');
  for(const key of ['examples','sources'])if(w[key]!==undefined&&(!Array.isArray(w[key])||w[key].length>100||w[key].some(s=>typeof s!=='string'||s.length>20000)))throw Error('单词卡内容格式不正确');
  if(w.related!==undefined&&(!Array.isArray(w.related)||w.related.length>100||w.related.some(r=>!r||['term','explanation'].some(k=>typeof r[k]!=='string'||r[k].length>20000))))throw Error('关联词格式不正确');
 }
 if(data.pending.some(s=>typeof s!=='string'||s.length>2000))throw Error('待处理数据格式不正确');return data;
}
const toWord=(dict,term)=>{const r=dict.entries[term];return {meaningLanguage:dict.meaningLanguage||'zh',...(dict.sources?{sources:dict.sources}:{}),...(dict.details?.[term]||{}),term,phonetic:r[0],meaning:r[1],category:r[2],example:r[3]||''};};
export function findWords(dict,text){
 const raw=text.trim().toLowerCase().replace(/\s+/g,' '),has=t=>Object.hasOwn(dict.entries,t);
 const term=has(raw)?raw:normalize(text);
 if(has(term))return [toWord(dict,term)];
 const forms=dict.forms||{};
 const keys=Object.hasOwn(forms,raw)?forms[raw]:Object.hasOwn(forms,term)?forms[term]:[];
 const matches=[...new Set(keys)].filter(has).map(k=>({...toWord(dict,k),lookupKind:'dictionary-form',lookupInput:raw}));
 if(matches.length)return matches;
 return morphologyCandidates(dict,term).map(k=>({...toWord(dict,k),lookupKind:'rule-candidate',lookupInput:raw}));
}
export function findEnglishByChinese(dict,text,limit=30){
 if(dict.meaningLanguage==='en')return [];
 const query=text.trim().replace(/\s+/g,' ');if(!query||!/[\u3400-\u9fff]/u.test(query))return [];
 return Object.entries(dict.entries).flatMap(([term,row])=>{
  const meaning=String(row[1]||'');const at=meaning.indexOf(query);if(at<0)return [];
  const boundary=at===0||/[；;，,、。\s]/u.test(meaning[at-1]);
  return [{word:toWord(dict,term),score:(boundary?0:1000)+at*10+meaning.length+term.length}];
 }).sort((a,b)=>a.score-b.score||a.word.term.localeCompare(b.word.term)).slice(0,limit).map(x=>x.word);
}
export function merge(current,incoming){validate(incoming);return {...current,words:[...new Map([...incoming.words,...current.words].map(w=>[w.term,w])).values()],pending:[...new Set([...current.pending,...incoming.pending])]};}
export function nextReview(level,correct,now=Date.now()){return now+(correct?[1,3,7,14,30,60][Math.min(level,5)]*86400000:600000);}
