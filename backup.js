import {KEY,validate,merge} from './model.js';
export const EXPORT_KEY=KEY+'.lastExport';
export const RECOVERY_KEY=KEY+'.beforeRecovery';
export function parseFile(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>20*1024*1024)throw Error('备份文件过大（最多 20 MiB）');
 let data;try{data=JSON.parse(text);}catch{throw Error('无法读取备份，请选择有效的 Wordeer JSON 文件');}return validate(data);
}
export function previewMerge(current,incoming){
 validate(current);validate(incoming);
 const local=new Set(current.words.map(w=>w.term)),unique=new Set(incoming.words.map(w=>w.term));
 const pending=new Set(current.pending);
 return {added:[...unique].filter(t=>!local.has(t)).length,duplicates:[...unique].filter(t=>local.has(t)).length,
  repeated:incoming.words.length-unique.size,pendingAdded:[...new Set(incoming.pending)].filter(t=>!pending.has(t)).length,
  next:validate(merge(current,incoming))};
}
// Preserve exact pre-recovery bytes (even damaged JSON) before replacing the main
// record. A quota error at either write leaves the current main record intact.
export function recoverData(storage,next,expectedRaw,now=Date.now()){
 validate(next);
 if(storage.getItem(KEY)!==expectedRaw)throw Error('词库已在其他页面变化，请重新预览后恢复');
 const restored={...next,savedAt:now,reviewSession:null};
 const encoded=JSON.stringify(restored);
 if(expectedRaw!==null)storage.setItem(RECOVERY_KEY,expectedRaw);
 storage.setItem(KEY,encoded);
 return restored;
}
