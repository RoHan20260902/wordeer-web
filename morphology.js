// Conservative fallback candidates, never dictionary-authored inflection claims.
// Only existing headwords with a compatible part of speech may be returned.
export function morphologyCandidates(dict,input){
 if(!/^[a-z]{3,}$/.test(input))return [];
 const candidates=new Set();
 const add=(term,allowed)=>{
  if(term.length<2||!Object.hasOwn(dict.entries,term))return;
  const categories=dict.entryCategories?.[term]||[dict.entries[term][2]];
  if(categories.some(c=>allowed.includes(c)))candidates.add(term);
 };
 const nv=['名词','动词'],v=['动词'],adj=['形容词','副词'];
 if(input.endsWith('ies'))add(input.slice(0,-3)+'y',nv);
 if(/(?:ches|shes|sses|xes|zes|oes)$/.test(input))add(input.slice(0,-2),nv);
 if(input.endsWith('s')&&!/(ss|us|is)$/.test(input))add(input.slice(0,-1),nv);
 if(input.endsWith('ied'))add(input.slice(0,-3)+'y',v);
 if(input.endsWith('ed')){
  const stem=input.slice(0,-2);add(stem,v);add(input.slice(0,-1),v);
  if(/([b-df-hj-np-tv-z])\1$/.test(stem))add(stem.slice(0,-1),v);
 }
 if(input.endsWith('ing')){
  const stem=input.slice(0,-3);add(stem,v);add(stem+'e',v);
  if(/([b-df-hj-np-tv-z])\1$/.test(stem))add(stem.slice(0,-1),v);
  if(stem.endsWith('y'))add(stem.slice(0,-1)+'ie',v);
 }
 for(const suffix of ['er','est'])if(input.endsWith(suffix)){
  const stem=input.slice(0,-suffix.length);add(stem,adj);add(stem+'e',adj);
  if(stem.endsWith('i'))add(stem.slice(0,-1)+'y',adj);
  if(/([b-df-hj-np-tv-z])\1$/.test(stem))add(stem.slice(0,-1),adj);
 }
 return [...candidates];
}
