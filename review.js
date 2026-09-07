// Review rules independent of rendering. No user data is modified here.
export function shuffle(items, random=Math.random){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
const meaningKey=w=>w.meaning.toLowerCase().replace(/[\s；;，,、。.!！?？]/g,'');
export function makeOptions(word,pool,random=Math.random){
 const seen=new Set([meaningKey(word)]);
 const candidates=shuffle(pool,random).filter(w=>w.term!==word.term);
 candidates.sort((a,b)=>Number(b.category===word.category)-Number(a.category===word.category));
 const distractors=[];
 for(const candidate of candidates){
  const key=meaningKey(candidate);
  if(!key||seen.has(key))continue;
  seen.add(key);distractors.push(candidate);
  if(distractors.length===3)break;
 }
 return shuffle([word,...distractors],random);
}
export function createReview(pool,mode,now=Date.now()){
 const due=pool.filter(w=>w.due<=now).sort((a,b)=>a.due-b.due||a.created-b.created);
 const candidates=due.length?due:shuffle(pool);
 const eligible=mode==='quiz'?candidates.filter(w=>makeOptions(w,pool).length===4):candidates;
 const words=eligible.slice(0,20);
 return {words,index:0,mode,correct:0,revealed:false,answered:false,graded:false,
  initialCount:words.length,missed:[],retried:[],retryCorrect:0,practice:!due.length};
}
