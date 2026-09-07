import {KEY,validate} from './model.js';
export const BACKUP_KEY=KEY+'.previous';
export function saveData(storage,next){
 validate(next);
 const encoded=JSON.stringify(next);
 const previous=storage.getItem(KEY);
 // A single main record contains both the vocabulary and the review session.
 // Never replace the previous snapshot with corrupt data.
 if(previous){validate(JSON.parse(previous));storage.setItem(BACKUP_KEY,previous);}
 storage.setItem(KEY,encoded);
}
export function restoreSession(data){
 const s=data.reviewSession;
 if(!s||!['flash','quiz','spelling'].includes(s.mode)||!Array.isArray(s.words)||s.words.length>40||s.words.length===0)return null;
 if(!Number.isInteger(s.index)||s.index<0||s.index>s.words.length||!Number.isInteger(s.initialCount)||s.initialCount<1||s.initialCount>20||s.initialCount>s.words.length)return null;
 if(!Array.isArray(s.missed)||s.missed.length>20||s.missed.some(t=>typeof t!=='string'))return null;
 for(const field of ['correct','retryCorrect'])if(!Number.isInteger(s[field])||s[field]<0||s[field]>20)return null;
 for(const field of ['graded','revealed','practice'])if(typeof s[field]!=='boolean')return null;
 const byTerm=new Map(data.words.map(w=>[w.term,w]));
 if(s.words.some(w=>!w||!byTerm.has(w.term)))return null;
 // Load current vocabulary fields rather than trusting session snapshots.
 const result={...s,words:s.words.map(w=>byTerm.get(w.term))};
 if(s.mode==='quiz'&&s.index<s.words.length){
  if(!Array.isArray(s.options)||s.options.length!==4||s.options.some(w=>!w||!byTerm.has(w.term)))return null;
  result.options=s.options.map(w=>byTerm.get(w.term));
  if(new Set(result.options.map(w=>w.term)).size!==4||!result.options.some(w=>w.term===result.words[s.index].term))return null;
 }
 if(s.graded)result.answered=true;
 return result;
}
