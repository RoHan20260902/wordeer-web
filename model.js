export const KEY='wordeer.web.words.v1';
export const categories=['名词','动词','形容词','副词','代词','介词','连词','限定词','感叹词','短语与固定表达','其他'];
export const normalize=s=>s.trim().toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,' ').replace(/^[.,!?;:" ]+|[.,!?;:" ]+$/g,'');
export function validate(data){
 if(!data||data.app!=='wordeer'||data.version!==1||!Array.isArray(data.words)||!Array.isArray(data.pending)||data.words.length>50000||data.pending.length>50000)throw Error('请选择 Wordeer 备份文件');
 for(const w of data.words){if(!w||['term','phonetic','meaning','category','example'].some(k=>typeof w[k]!=='string'||w[k].length>20000)||!w.term||!categories.includes(w.category)||![0,1].includes(w.favorite)||['reviews','level','due','created'].some(k=>!Number.isSafeInteger(w[k])||w[k]<0))throw Error('备份数据格式不正确');}
 if(data.pending.some(s=>typeof s!=='string'||s.length>2000))throw Error('待处理数据格式不正确');return data;
}
export function findWords(dict,text){const term=normalize(text);const keys=dict.entries[term]?[term]:(dict.forms[term]||[]);return [...new Set(keys)].filter(k=>dict.entries[k]).map(k=>{const r=dict.entries[k];return {term:k,phonetic:r[0],meaning:r[1],category:r[2],example:r[3]||''};});}
export function merge(current,incoming){validate(incoming);return {...current,words:[...new Map([...incoming.words,...current.words].map(w=>[w.term,w])).values()],pending:[...new Set([...current.pending,...incoming.pending])]};}
export function nextReview(level,correct,now=Date.now()){return now+(correct?[1,3,7,14,30,60][Math.min(level,5)]*86400000:600000);}
