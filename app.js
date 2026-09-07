import {createSpeechController} from './speech.js';
import {createPronouncer} from './pronunciation.js';
import {EXPORT_KEY,RECOVERY_KEY,parseFile,previewMerge,recoverData} from './backup.js';
import {makeOptions,createReview} from './review.js';
import {saveData,restoreSession,BACKUP_KEY} from './persistence.js';
import {installRecordingDiagnostics} from './recording-diagnostics.js';
import {KEY,categories,normalize,validate,findWords,findEnglishByChinese,merge,nextReview} from './model.js';
const app=document.querySelector('#app'),dialog=document.querySelector('#detail');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data={app:'wordeer',version:1,words:[],pending:[]},dict=null,loadError='',storageError=false,filter='全部',query='',review=null,timer;
try{const raw=localStorage.getItem(KEY);if(raw)data=validate(JSON.parse(raw));}catch{storageError=true;loadError='浏览器词库无法读取。请勿清除数据，可先导出原始备份。';}
review=restoreSession(data);
function save(next){if(storageError)throw Error('当前词库无法读取，已停止写入以保护原数据');const stamped={...next,savedAt:Date.now()};saveData(localStorage,stamped);data=stamped;}
function persistReview(){save({...data,reviewSession:review});}
function toast(s){clearTimeout(timer);const t=document.querySelector('#toast');t.textContent=s;t.style.display='block';timer=setTimeout(()=>t.style.display='none',3600);}
function page(){return location.hash.slice(1)||'home';}
const due=()=>data.words.filter(w=>w.due<=Date.now());
function wordRows(words){return words.length?words.map(w=>`<article class="word"><button class="open" data-detail="${esc(w.term)}"><span class="term">${esc(w.term)}</span><span class="meaning">${esc(w.meaning)}</span></button><button class="star ${w.favorite?'active':''}" data-star="${esc(w.term)}" aria-label="${w.favorite?'取消收藏':'收藏'} ${esc(w.term)}">${w.favorite?'★':'☆'}</button></article>`).join(''):'<div class="empty"><div class="symbol">▤</div>这里还没有单词<br>从首页收录你的第一个英文单词</div>';}
function render(){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+page()));
 if(page()==='home')app.innerHTML=`<section class="hero"><h1>让每一次遇见，<br>都成为你的词汇。</h1><div class="muted">Capture a word. Keep a little wonder.</div><div class="stats"><div class="stat"><b>${data.words.length}</b><span>已收录单词</span></div><div class="stat"><b>${due().length}</b><span>待复习</span></div><div class="stat"><b>${data.words.filter(w=>w.favorite).length}</b><span>我的收藏</span></div></div></section><section class="panel"><div class="row"><h3>✧ 遇见新单词</h3><button class="link" data-action="bulk">批量收词</button></div><form id="collect"><input class="input" name="term" autocomplete="off" autocapitalize="none" maxlength="2000" placeholder="输入英文或中文，如 curious、好奇" aria-label="输入英文或中文查词"><button class="primary full" ${!dict?'disabled':''}>${dict?'查看单词卡':'词典加载中…'}</button></form><small class="note">${loadError?esc(loadError):'支持英文查中文、中文反查英文 · 自动分类收录'}</small>${!dict&&loadError?'<button class="link" data-action="retry">重新加载词典</button>':''}</section><div class="row"><h2>我的单词本</h2><a class="link" href="#library">查看全部 ›</a></div><div class="grid">${categories.slice(0,4).map((c,i)=>`<button class="book" data-category="${c}"><span class="icon">${['▤','↗','✧','≈'][i]}</span><b>${c}</b><small>${data.words.filter(w=>w.category===c).length} 个单词</small><i>›</i></button>`).join('')}</div><div class="row"><h2>最近收录</h2><a class="link" href="#library">全部 ›</a></div>${wordRows([...data.words].reverse().slice(0,4))}`;
 else if(page()==='library'){app.innerHTML=`<h1>我的词库</h1><p class="muted">每一个单词，都值得留下。</p><input class="input" id="search" placeholder="搜索英文或中文释义" aria-label="搜索词库" value="${esc(query)}"><div class="filters">${['全部','收藏',...categories].map(c=>`<button class="chip ${filter===c?'active':''}" data-filter="${c}">${c}</button>`).join('')}</div><div id="word-list"></div>`;renderList();}
 else if(page()==='review')renderReview();
 else if(page()==='settings')app.innerHTML=`<section class="hero"><h1>我的 Wordeer</h1><div class="muted">一点一滴，让英语成为日常。</div></section><section class="panel"><h3>词库与数据</h3>${backupStatus()}<button class="settings-button" data-action="pending">待处理输入 <span class="muted">${data.pending.length} 条</span>　›</button><button class="settings-button" data-action="export">导出词库备份　↓</button><button class="settings-button" data-action="restore">导入并合并备份　↑</button><button class="settings-button" data-action="previous-backup">下载上一次自动备份　↓</button><button class="settings-button" data-action="restore-snapshot">预览并恢复上一份快照　↶</button><button class="settings-button" data-action="download-recovery">下载恢复前数据　↓</button></section><section class="panel"><h3>关于网页测试版</h3><p class="muted">支持文字查词、自动分类、收藏、闪卡与选择题复习。词典包含 100,016 个词条（含短语）及词形还原。</p><p class="muted">数据保存在当前浏览器，暂不跨设备同步。清理网站数据前请导出备份。</p><p class="muted">网页录音使用浏览器语音识别服务，可能需要联网并由浏览器服务处理音频。Action Button 仍需原生 App。DeepSeek 尚未连接，未命中的词会进入待处理。</p><button class="link" data-action="licenses">开源词典与字体许可</button></section>`;
 else{location.hash='home';return;}
}
function renderList(){let words=data.words.filter(w=>(filter==='全部'||(filter==='收藏'?w.favorite:w.category===filter))&&(!query||w.term.toLowerCase().includes(query.toLowerCase())||w.meaning.includes(query)));document.querySelector('#word-list').innerHTML=`<p class="muted">${words.length} 个单词</p>${wordRows([...words].reverse())}`;}
function show(html){previewWord=null;dialog.innerHTML=`<button class="close" data-action="close" aria-label="关闭">×</button>${html}`;if(!dialog.open)dialog.showModal();}
let previewWord=null;
let pendingOriginal=null, deletedWord=null;
dialog.addEventListener("cancel",e=>{if(previewWord){e.preventDefault();action("close").catch(err=>toast(err.message));}else{pendingOriginal=null;}});
const detailLoads=new Map();
let undoEntry=null;
let lookupSelections=new Map();
function offerUndo(word){
 undoEntry=structuredClone(word);toast(`已收录 ${word.term}`);
 const button=document.createElement('button');button.textContent='撤销';button.className='secondary';button.dataset.action='undo-add';
 document.querySelector('#toast').append(' ',button);clearTimeout(timer);
 timer=setTimeout(()=>{document.querySelector('#toast').style.display='none';},10000);
}
function renderSpelling(w){
 app.innerHTML=`<div class="row"><h1>拼写练习</h1><button class="link" data-action="end-review">退出</button></div><p>${review.index+1} / ${review.words.length} · ${review.index>=review.initialCount?'错词重练':(review.practice?'额外练习':'到期复习')}</p><section class="review-card"><p>${esc(w.meaning)}</p></section>${review.graded?`<p>${review.wasCorrect?'回答正确':'再记一次'}：<strong>${esc(w.term)}</strong></p>${pronunciationControls(w.term)}<button class="primary full" data-action="next">下一个</button>`:'<form id="spelling"><input class="input" name="answer" required autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="输入英文拼写" placeholder="输入对应的英文单词或表达"><button class="primary full spaced">确认答案</button></form>'}`;
}
document.addEventListener('submit',e=>{
 if(e.target.id==='word-metadata'){
  e.preventDefault();try{const fields=new FormData(e.target);const term=fields.get('term'),category=fields.get('category'),note=fields.get('note');
   if(!categories.includes(category)||typeof note!=='string'||note.length>2000)throw Error('分类或笔记格式无效');
   save({...data,words:data.words.map(w=>w.term===term?{...w,category,note}:w)});toast('分类与笔记已保存');render();
  }catch(err){toast(err.message);}return;
 }
 if(e.target.id!=='spelling')return;e.preventDefault();
 try{if(!review||review.graded)return;const answer=new FormData(e.target).get('answer');grade(normalize(answer)===normalize(review.words[review.index].term));renderReview();}catch(err){toast(err.message);}
});
document.addEventListener('click',e=>{
 const a=e.target.closest('button')?.dataset.action;
 try{
  if(a==='undo-add'&&undoEntry){
   const current=data.words.find(w=>w.term===undoEntry.term);
   if(!current||JSON.stringify(current)!==JSON.stringify(undoEntry)){toast('词条已发生变化，请到词库中管理');return;}
   save({...data,words:data.words.filter(w=>w.term!==undoEntry.term),reviewSession:null});review=null;undoEntry=null;render();toast('已撤销本次收录');
  }
  if(a==='previous-backup'){
   const raw=localStorage.getItem(BACKUP_KEY);if(!raw){toast('还没有自动备份');return;}
   validate(JSON.parse(raw));const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='Wordeer-previous-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
 }catch(err){toast(err.message||'操作失败');}
});
function wordCard(w){
 const saved=data.words.find(x=>x.term===w.term);
 const examples=(Array.isArray(w.examples)?w.examples:(w.example?[w.example]:[])).filter(x=>typeof x==='string'&&x.trim()).slice(0,3);
 const related=Array.isArray(w.related)?w.related.filter(x=>x&&typeof x.term==='string'&&typeof x.explanation==='string'):[];
 show(`<div class="word-card">${w.lookupKind==='rule-candidate'?`<p class="note">“${esc(w.lookupInput)}”可能是以下词条的变化形式（规则推测），请核对词义。</p>`:''}<span class="tag">${esc(w.category)}</span><p class="term">${esc(w.term)}</p>${pronunciationControls(w.term)}${w.phonetic?`<span class="muted">${esc(w.phonetic)}</span>`:''}<section><h3>${w.meaningLanguage==='en'?'英文释义':'中文释义'}</h3><p>${esc(w.meaning)}</p>${w.meaningLanguage==='en'?'<small class="note">中文释义尚未补充。</small>':''}</section>${w.nuance?`<section><h3>语感与用法</h3><p>${esc(w.nuance)}</p></section>`:''}${examples.length?`<section><h3>例句</h3>${examples.map((text,i)=>`<div class="example"><span>${i+1}</span><div>${esc(text)}${pronunciationControls(text,`例句${i+1}`)}</div></div>`).join('')}</section>`:''}${related.length?`<section><h3>相近与关联词</h3>${related.map(x=>`<p><b>${esc(x.term)}</b><br>${esc(x.explanation)}</p>`).join('')}</section>`:''}${!w.nuance||examples.length<3||!related.length?'<small class="note">当前展示本地词典已有内容，完整语感、3 个例句与关联词解说待补充。</small>':''}<small class="note">来源：${esc((w.sources||["ECDICT"]).join(" · "))}</small>${saved?`<form id="word-metadata"><input type="hidden" name="term" value="${esc(w.term)}"><label>所属单词本<select name="category" class="input">${categories.map(c=>`<option ${c===saved.category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label>我的笔记<textarea name="note" maxlength="2000" rows="3">${esc(saved.note||'')}</textarea></label><button class="secondary full">保存分类与笔记</button></form>`:''}<div class="card-actions">${saved?`<button class="secondary full" data-star="${esc(w.term)}">${saved.favorite?'★ 已收藏 · 点击取消':'☆ 收藏这个单词'}</button><p class="muted">已收录 · ${esc(saved.category)} · 已复习 ${saved.reviews} 次</p><button class="secondary full" data-action="delete-word">删除这个单词</button>`:`<p class="muted">点右上角 ×，自动收录到「${esc(w.category)}」</p><button class="secondary full" data-action="discard-card">不收录该词</button>`}</div></div>`);
 previewWord=w;
 dialog.querySelector(".close").setAttribute("aria-label",saved?"关闭单词卡":"收录并关闭单词卡");
 if(dict?.detailShards&&!w.detailsLoaded){
  const letter=w.term[0];
  if(!detailLoads.has(letter))detailLoads.set(letter,fetch(`assets/details/${letter}.json`).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(e=>{detailLoads.delete(letter);throw e;}));
  detailLoads.get(letter).then(shard=>{dict.details={...dict.details,...shard};if(dialog.open&&previewWord===w)wordCard({...w,...shard[w.term],...data.words.find(x=>x.term===w.term),detailsLoaded:true});}).catch(()=>{});
 }
}
function detail(term){const saved=data.words.find(w=>w.term===term);if(!saved)return;const local=dict?findWords(dict,term).find(w=>w.term===term):null;wordCard({...local,...saved});}
async function collect(text){if(!dict)throw Error('词典正在加载，请稍后');if(!normalize(text))return;const chinese=/[\u3400-\u9fff]/u.test(text);const matches=chinese?findEnglishByChinese(dict,text):findWords(dict,text);if(matches.length>1){lookupSelections=new Map(matches.map(w=>[w.term,w]));show(`<h3>${chinese?'选择对应的英文单词':'选择要收录的原形'}</h3><p class="muted">找到 ${matches.length} 个本地词典结果</p>${matches.map(w=>`<button class="settings-button" data-pick="${esc(w.term)}"><b>${esc(w.term)}</b><span class="meaning">${esc(w.meaning)}</span></button>`).join('')}`);return;}
 if(!matches.length){const pending=[...new Set([...data.pending,text.trim()])];save({...data,pending});toast('本地词典未命中，已保存到待处理');render();return;}
 wordCard(matches[0]);}
function addWord(w){if(data.words.some(x=>x.term===w.term)){toast('已经收录，保留原有学习进度');return;}save({...data,words:[...data.words,{...w,created:Date.now(),favorite:0,reviews:0,level:0,due:0}],pending:data.pending.filter(p=>normalize(p)!==w.term)});offerUndo(data.words.find(x=>x.term===w.term));render();}
function renderReview(){pronouncer.stop();if(!review){app.innerHTML=`<h1>温故，遇见新知</h1><p class="muted">每天一点，让单词真正属于你。</p><section class="review-card"><div class="muted">今天待复习</div><div class="term" style="color:#2f7bff;font-size:56px">${due().length}</div><div class="muted">共收录 ${data.words.length} 个单词</div></section><div class="choices"><button class="primary" data-action="flash" ${!data.words.length?'disabled':''}>开始闪卡复习</button><button class="secondary" data-action="quiz" ${data.words.length<4?'disabled':''}>四选一练习</button></div><p class="muted"><button class="secondary full" data-action="spelling" ${!data.words.length?'disabled':''}>中文提示 · 拼写练习</button><br>选择题需要至少 4 个释义不同的词条。错词在本轮末尾再练一次；额外练习不改变到期计划。</p>`;return;}
 const w=review.words[review.index];if(!w){app.innerHTML=`<section class="review-card"><div style="font-size:45px">✓</div><h1>本轮复习完成</h1><p class="muted">本轮 ${review.initialCount} 个词条，首次答对 ${review.correct} 个<br>首次正确率 ${Math.round(review.correct/review.initialCount*100)}% · 错词 ${review.missed.length} 个<br>重练答对 ${review.retryCorrect} 个${review.practice?'<br>额外练习 · 到期计划未改变':''}</p><button class="primary" data-action="end-review">返回复习</button></section>`;return;}
 if(review.mode==='spelling'){renderSpelling(w);return;}
 app.innerHTML=`<div class="row"><h1>${review.mode==='flash'?'闪卡复习':'四选一练习'}</h1><button class="link" data-action="end-review">退出</button></div><p class="muted">${review.index+1} / ${review.words.length} · ${review.index>=review.initialCount?'错词重练':(review.practice?'额外练习':'到期复习')}</p><div class="progress"><span style="width:${review.index/review.words.length*100}%"></span></div><section class="review-card"><span class="term">${esc(w.term)}</span><span class="muted">${esc(w.phonetic)}</span>${pronunciationControls(w.term)}${review.revealed?`<p>${esc(w.meaning)}</p>`:''}</section>${review.mode==='flash'?(review.revealed?'<div class="row spaced"><button class="secondary full" data-grade="0">再学一次</button><button class="primary full" data-grade="1">记住了</button></div>':'<button class="primary full spaced" data-action="flip">查看释义</button>'):`<div class="choices">${review.options.map((o,i)=>`<button class="choice" data-answer="${i}" ${review.answered?'disabled':''}>${esc(o.meaning)}</button>`).join('')}</div>${review.answered?`<p class="answer">${review.wasCorrect?'回答正确':'正确释义：'+esc(w.meaning)}</p><button class="primary full" data-action="next">下一个</button>`:''}`}`;}
function options(){const w=review.words[review.index];if(!w)return;review.options=makeOptions(w,data.words);}
function grade(correct){
 if(!review||review.graded)return;
 const w=review.words[review.index];if(!w)return;
 const retry=review.index>=review.initialCount;
 // Same-round correction and extra practice must not inflate the review interval.
 const next=structuredClone(review);next.graded=true;next.wasCorrect=correct;
 if(retry){if(correct)next.retryCorrect++;}
 else if(correct)next.correct++;
 else {next.missed.push(w.term);next.words.push(w);}
 const words=!retry&&!review.practice?data.words.map(x=>x.term===w.term?{...x,reviews:x.reviews+1,level:correct?x.level+1:0,due:nextReview(x.level,correct)}:x):data.words;
 save({...data,words,reviewSession:next});review=next;
}
function advance(){pronouncer.stop();if(!review||!review.graded)return;const next=structuredClone(review);next.index++;next.revealed=false;next.answered=false;next.graded=false;const word=next.words[next.index];if(word)next.options=makeOptions(word,data.words);save({...data,reviewSession:next});review=next;renderReview();}
async function action(a){if(a==='save-card'){if(previewWord){addWord(previewWord);wordCard(previewWord);}return;}if(a==='record-entry'){if(!dict){toast('请等词典加载完成后录音');return;}pronouncer.stop();speech.toggle();return;}if(a==='text-entry'){dialog.close();location.hash='home';render();document.querySelector('[name="term"]')?.focus();return;}if(a==='discard-card'){previewWord=null;pendingOriginal=null;dialog.close();return;}if(a==='close'){if(previewWord){if(!data.words.some(w=>w.term===previewWord.term))addWord(previewWord);if(pendingOriginal!==null){save({...data,pending:data.pending.filter(p=>p!==pendingOriginal)});pendingOriginal=null;render();}}previewWord=null;pendingOriginal=null;dialog.close();return;}if(a==='retry'){loadDictionary();return;}if(a==='bulk'){show('<h3>批量收词</h3><p class="muted">每行一个单词或短语，最多 100 行。</p><form id="bulk"><textarea rows="7" name="terms" required placeholder="apple\ncurious\nlook forward to"></textarea><button class="primary full spaced">查词并收录</button></form>');}
 if(a==='pending')showPending();
 if(a==='retry-pending')retryPending();
 if(a==='delete-word'&&previewWord){const w=data.words.find(x=>x.term===previewWord.term);if(w){save({...data,words:data.words.filter(x=>x.term!==w.term),reviewSession:null});deletedWord=structuredClone(w);review=null;previewWord=null;dialog.close();render();toast('已删除单词，本轮复习已结束');const b=document.createElement('button');b.textContent='撤销删除';b.className='secondary';b.dataset.action='undo-delete';document.querySelector('#toast').append(' ',b);clearTimeout(timer);timer=setTimeout(()=>{document.querySelector('#toast').style.display='none';deletedWord=null;},10000);}}
 if(a==='undo-delete'&&deletedWord){if(data.words.some(w=>w.term===deletedWord.term))throw Error('此词已重新收录，保留当前记录');save({...data,words:[...data.words,deletedWord]});deletedWord=null;render();toast('已恢复单词及原有学习记录');}
 if(a==='export'){downloadBackup(storageError?localStorage.getItem(KEY):JSON.stringify(data,null,2),'Wordeer-backup-'+new Date().toISOString().slice(0,10)+'.json');try{localStorage.setItem(EXPORT_KEY,String(Date.now()));}catch{toast('已发起下载，但导出时间无法保存');return;}render();toast('已发起备份下载，请确认文件已保存');}
 if(a==='restore-snapshot')previewSnapshot();
 if(a==='confirm-restore')confirmRestore();
 if(a==='cancel-restore'){restorePreview=null;dialog.close();}
 if(a==='download-recovery'){downloadBackup(localStorage.getItem(RECOVERY_KEY),'Wordeer-before-recovery.json');toast('已发起恢复前数据下载');}
 if(a==='restore')show('<h3>导入 Wordeer 备份</h3><p class="muted">合并单词，已有单词的学习进度保留。</p><input id="restore-file" type="file" accept=".json,application/json" aria-label="选择 Wordeer 备份">');
 if(a==='licenses')show('<h3>开源许可</h3><p><a href="assets/ECDICT-LICENSE.txt" target="_blank">ECDICT · MIT License ↗</a></p><p><a href="assets/WORDNET-LICENSE.txt" target="_blank">Open English WordNet 2025 · CC BY 4.0 ↗</a></p><p><a href="assets/PRINCETON-WORDNET-LICENSE.txt" target="_blank">Princeton WordNet License ↗</a></p><p><a href="assets/NotoSansSC-OFL.txt" target="_blank">Noto Sans SC · SIL OFL ↗</a></p>');
 if(a==='flash'||a==='quiz'||a==='spelling'){review=createReview(data.words,a);if(!review.words.length){review=null;toast('需要至少四个释义不同的词条，请先收词或使用闪卡。');return;}options();persistReview();renderReview();}if(a==='flip'&&review){review.revealed=true;persistReview();renderReview();}if(a==='end-review'){review=null;persistReview();render();}if(a==='next')advance();}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;try{if(b.dataset.action)await action(b.dataset.action);if(b.dataset.category){filter=b.dataset.category;location.hash='library';}if(b.dataset.filter){filter=b.dataset.filter;render();}if(b.dataset.detail)detail(b.dataset.detail);if(b.dataset.star){save({...data,words:data.words.map(w=>w.term===b.dataset.star?{...w,favorite:w.favorite?0:1}:w)});render();if(dialog.open)detail(b.dataset.star);}if(b.dataset.pick){wordCard(lookupSelections.get(b.dataset.pick)||findWords(dict,b.dataset.pick)[0]);}if(b.dataset.grade){grade(b.dataset.grade==='1');advance();}if(b.dataset.answer!==undefined&&!review.answered){const correct=review.options[Number(b.dataset.answer)].term===review.words[review.index].term;grade(correct);review.answered=true;review.wasCorrect=correct;persistReview();renderReview();}}catch(err){toast(err.message||'操作失败，请重试');}});
document.addEventListener('submit',async e=>{e.preventDefault();try{if(e.target.id==='collect'){pendingOriginal=null;await collect(new FormData(e.target).get('term'));}if(e.target.id==='bulk'){if(!dict)throw Error('词典正在加载');const lines=[...new Set(new FormData(e.target).get('terms').split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];if(lines.length>100)throw Error('每次最多导入 100 行');let words=[...data.words],pending=[...data.pending],added=0;for(const line of lines){const matches=findWords(dict,line);if(matches.length===1&&matches[0].lookupKind!=='rule-candidate'){const w=matches[0];if(!words.some(x=>x.term===w.term)){words.push({...w,created:Date.now(),favorite:0,reviews:0,level:0,due:0});added++;}pending=pending.filter(p=>normalize(p)!==normalize(line));}else pending.push(line);}save({...data,words,pending:[...new Set(pending)]});dialog.close();render();toast(`收录 ${added} 个单词，未命中或有歧义的输入保留在待处理`);}}catch(err){toast(err.message||'保存失败，请重试');}});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;renderList();}});
document.addEventListener('change',async e=>{if(e.target.id==='restore-file'){const readId=++restoreReadId;try{const f=e.target.files[0];if(!f)return;if(f.size>20*1024*1024)throw Error('备份文件过大');const text=await f.text();if(readId!==restoreReadId||!dialog.open)return;showImportPreview(parseFile(text));}catch(err){if(readId===restoreReadId)toast(err.message||'无法导入备份');}}});
window.addEventListener('hashchange',render);window.addEventListener('storage',e=>{if(e.key===KEY){try{data=e.newValue?validate(JSON.parse(e.newValue)):{app:'wordeer',version:1,words:[],pending:[]};review=restoreSession(data);render();}catch{toast('其他页面的数据无法读取，请重新打开');}}});
async function loadDictionary(){try{loadError='';const response=await fetch('assets/dictionary-web.json');if(!response.ok)throw Error();dict=await response.json();render();}catch{loadError='词典加载失败，请检查网络后重试。';render();}}
const recordButton=document.querySelector('.record-entry');
const micIcon=recordButton.querySelector('.record-circle').innerHTML;
const recordingDiagnostics=installRecordingDiagnostics();
recordButton.addEventListener('click',event=>{if(recordingDiagnostics.isProbing()){event.stopPropagation();toast('独立麦克风检测进行中，请稍后再开始语音识别');}});
const speech=createSpeechController({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,
 onDiagnostic:recordingDiagnostics.log,
 onState(state){const active=state!=='idle';recordingDiagnostics.setRecognitionActive(active);recordButton.classList.toggle('recording',active);recordButton.setAttribute('aria-pressed',String(active));recordButton.setAttribute('aria-label',active?'停止录音并识别':'开始录音收词');recordButton.querySelector('.record-circle').innerHTML=active?'■':micIcon;recordButton.lastElementChild.textContent=({idle:'录音收词',starting:'启动中·点此停止',recording:'点击停止',stopping:'正在识别…'})[state];recordButton.disabled=state==='stopping';if(state==='recording')toast('正在录音，请说英语，再点录音键停止');},
 async onText(text){pendingOriginal=null;try{const matches=findWords(dict,text);if(matches.length){await collect(text);}else{save({...data,pending:[...new Set([...data.pending,text])]});show(`<h3>识别结果</h3><p class="term">${esc(text)}</p><p class="muted">本地未找到对应词条，已保存到待处理。可修改识别文字后再查词。</p><form id="voice-edit"><input class="input" name="term" value="${esc(text)}" aria-label="修改识别文字"><button class="primary full spaced">查看单词卡</button></form>`);render();}}catch(err){toast(err.message||'查词失败，请重试');}},
 onError(message){toast(message);recordingDiagnostics.show();recordingDiagnostics.permission();}
});
document.addEventListener('submit',async e=>{if(e.target.id==='voice-edit'){e.preventDefault();try{await collect(new FormData(e.target).get('term'));}catch(err){toast(err.message);}}});
window.addEventListener('pagehide',()=>speech.cancel());
document.addEventListener('visibilitychange',()=>{if(document.hidden)speech.cancel();});
function pronunciationControls(text,label='单词'){
 return `<div class="pronunciation"><button class="secondary" type="button" data-say="${esc(text)}" data-rate="normal" aria-label="${label}发音">▶ 发音</button><button class="secondary" type="button" data-say="${esc(text)}" data-rate="slow" aria-label="${label}慢速发音">慢速</button><button class="link" type="button" data-stop-speaking hidden>停止发音</button><span class="pronunciation-status" role="status"></span></div>`;
}
function formatBackupTime(value){return Number.isSafeInteger(value)&&value>0&&value<=8640000000000000?new Date(value).toLocaleString():'未记录';}
function backupStatus(){
 try{const last=Number(localStorage.getItem(EXPORT_KEY)),raw=localStorage.getItem(BACKUP_KEY);let snapshot='暂无';
  if(raw){try{const d=parseFile(raw);snapshot=d.savedAt?formatBackupTime(d.savedAt):'已有快照，旧版本未记录时间';}catch{snapshot='快照无法读取';}}
  return `${storageError?'<p class="note">当前词库无法读取。请先导出原始数据，再导入备份或恢复快照。</p>':''}<p class="muted">最近导出操作：${last?esc(formatBackupTime(last)):'尚未导出'}<br>上一次自动快照：${esc(snapshot)}</p><small class="note">导出时间仅记录下载操作，请确认文件已保存。自动快照仍在此浏览器内。</small>`;
 }catch{return '<p class="muted">备份状态暂无法读取</p>';}
}
function downloadBackup(raw,name){if(raw===null)throw Error('没有可下载的数据');const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
let restorePreview=null,restoreReadId=0;
function showImportPreview(incoming){
 const baseline=localStorage.getItem(KEY);
 let current=null;try{if(baseline!==null)current=parseFile(baseline);else current={app:'wordeer',version:1,words:[],pending:[]};}catch{}
 if(!current){restorePreview={mode:'recover',next:incoming,baseline};show(`<h3>从备份恢复词库</h3><p>当前词库无法读取。恢复后使用文件中的 ${incoming.words.length} 个词条、${incoming.pending.length} 条待处理；旧原始数据会先保留供下载。</p><button class="primary full" data-action="confirm-restore">确认从文件恢复</button><button class="secondary full spaced" data-action="cancel-restore">取消</button>`);return;}
 const p=previewMerge(current,incoming);restorePreview={mode:'merge',next:p.next,baseline};
 show(`<h3>导入预览</h3><p>新增 ${p.added} 个词条<br>重复 ${p.duplicates} 个（保留本地释义、笔记和学习进度）<br>新增待处理 ${p.pendingAdded} 条${p.repeated?`<br>文件内重复记录 ${p.repeated} 条，按词头合并`:''}</p><button class="primary full" data-action="confirm-restore">确认合并备份</button><button class="secondary full spaced" data-action="cancel-restore">取消</button>`);
}
function previewSnapshot(){
 const raw=localStorage.getItem(BACKUP_KEY);if(!raw)throw Error('还没有可恢复的自动快照');const next=parseFile(raw),baseline=localStorage.getItem(KEY);
 let removed=null;try{const current=baseline?parseFile(baseline):{words:[]};const terms=new Set(next.words.map(w=>w.term));removed=current.words.filter(w=>!terms.has(w.term)).length;}catch{}
 restorePreview={mode:'recover',next,baseline};
 show(`<h3>恢复上一份快照</h3><p>快照时间：${esc(formatBackupTime(next.savedAt))}<br>${next.words.length} 个词条、${next.pending.length} 条待处理</p><p>这会替换当前词库和学习进度，并结束当前复习。${removed===null?'当前数据损坏，无法比较差异。':`当前有 ${removed} 个词条不在快照中。`}恢复前的数据会保留，可在“我的”下载。</p><button class="primary full" data-action="confirm-restore">确认恢复此快照</button><button class="secondary full spaced" data-action="cancel-restore">取消</button>`);
}
function confirmRestore(){
 const p=restorePreview;if(!p)throw Error('请先选择备份并预览');
 if(localStorage.getItem(KEY)!==p.baseline)throw Error('词库已变化，请重新选择备份并预览');
 if(p.mode==='recover'){data=recoverData(localStorage,p.next,p.baseline);storageError=false;loadError='';review=null;}
 else{const next={...p.next,savedAt:Date.now()};saveData(localStorage,next);data=next;storageError=false;review=restoreSession(data);}
 restorePreview=null;dialog.close();render();toast(p.mode==='recover'?'已恢复；恢复前数据可在“我的”下载':'备份已合并，原有记录保留');
}
let pronunciationText='';
const pronouncer=createPronouncer({synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,
 onState(state){document.querySelectorAll('.pronunciation').forEach(group=>{const playing=state!=='idle'&&group.querySelector('[data-say]')?.dataset.say===pronunciationText;group.querySelector('[data-stop-speaking]').hidden=!playing;group.querySelector('.pronunciation-status').textContent=playing?(state==='starting'?'正在启动…':'正在播放'):'';});},onError:toast});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.say!==undefined){if(speech.state!=='idle'){toast('请先停止录音，再播放发音');return;}pronunciationText=b.dataset.say;pronouncer.speak(b.dataset.say,b.dataset.rate==='slow');}if(b.hasAttribute('data-stop-speaking'))pronouncer.stop();});
window.addEventListener('hashchange',()=>pronouncer.stop());window.addEventListener('pagehide',()=>pronouncer.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)pronouncer.stop();});
dialog.addEventListener('close',()=>{pronouncer.stop();restorePreview=null;restoreReadId++;});

render();loadDictionary();

function showPending(){
 pendingOriginal=null;
 show(`<h3>待处理输入</h3><p class="muted">修改后重查，或自行填写释义。手动填写的内容会标注来源。</p>${data.pending.length?'<button class="secondary full" data-action="retry-pending">批量重试查词</button>':''}${data.pending.map((t,i)=>`<section class="panel"><p>${esc(t)}</p><div class="row"><button class="secondary" data-pending-edit="${i}">处理</button><button class="link" data-pending-delete="${i}">删除</button></div></section>`).join('')||'<p>暂无待处理内容</p>'}`);
}
function retryPending(){
 if(!dict)throw Error('请等待词典加载');
 let words=[...data.words],pending=[],added=0;
 for(const text of data.pending){const matches=/[\u3400-\u9fff]/u.test(text)?findEnglishByChinese(dict,text):findWords(dict,text);
  if(matches.length!==1||matches[0].lookupKind==='rule-candidate'){pending.push(text);continue;}
  const w=matches[0];if(!words.some(x=>x.term===w.term)){words.push({...w,created:Date.now(),favorite:0,reviews:0,level:0,due:0});added++;}
 }
 save({...data,words,pending});render();showPending();toast(`新增 ${added} 个，剩余 ${pending.length} 条待确认`);
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 try{
  if(b.dataset.pendingDelete!==undefined){const text=data.pending[Number(b.dataset.pendingDelete)];save({...data,pending:data.pending.filter(t=>t!==text)});render();showPending();}
  if(b.dataset.pendingEdit!==undefined){const text=data.pending[Number(b.dataset.pendingEdit)];if(text===undefined)return;pendingOriginal=text;
   show(`<h3>处理待收录内容</h3><form id="pending-lookup"><label>单词或短语<input class="input" name="term" maxlength="2000" required value="${esc(text)}"></label><button class="primary full">修改后重查</button></form><hr><form id="pending-manual"><label>英文单词或短语<input class="input" name="term" maxlength="2000" required value="${esc(text)}"></label><label>释义<textarea name="meaning" maxlength="20000" required></textarea></label><label>释义语言<select name="meaningLanguage"><option value="zh">中文</option><option value="en">英文</option></select></label><label>分类<select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></label><button class="secondary full">保存手动词条</button></form>`);
  }
 }catch(err){toast(err.message||'操作失败');}
});
document.addEventListener('submit',async e=>{
 if(!['pending-lookup','pending-manual'].includes(e.target.id))return;e.preventDefault();
 try{const fields=new FormData(e.target),term=normalize(fields.get('term'));if(!term)throw Error('请输入单词');
  if(e.target.id==='pending-lookup'){await collect(term);return;}
  if(!/[a-z]/i.test(term)||/[\u3400-\u9fff]/u.test(term))throw Error('词头请填写英文单词或短语');
  const meaning=fields.get('meaning').trim();if(!meaning)throw Error('请填写释义');
  const w={term,meaning,phonetic:'',example:'',category:fields.get('category'),meaningLanguage:fields.get('meaningLanguage'),sources:['用户手动填写'],created:Date.now(),favorite:0,reviews:0,level:0,due:0};
  const exists=data.words.some(x=>x.term===term);
  save({...data,words:exists?data.words:[...data.words,w],pending:data.pending.filter(t=>t!==pendingOriginal)});pendingOriginal=null;dialog.close();render();toast(exists?'已存在，保留原有词条和学习记录':'已保存手动词条');
 }catch(err){toast(err.message||'保存失败');}
});
