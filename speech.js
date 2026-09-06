// Browser speech service owns microphone capture; stop() flushes final results.
export function createSpeechController({Recognition,onState,onText,onError,setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null,state='idle',watchdog;
 const update=s=>{state=s;onState(s);};
 function finish(session,error){if(active!==session)return;clearTimer(watchdog);active=null;update('idle');if(error)onError(error);else if(session.text.trim())onText(session.text.trim());else onError('没有听清英文，请再试一次。');}
 return {get state(){return state;},toggle(){
 if(active){if(state==='stopping')return;update('stopping');try{active.engine.stop();}catch{finish(active,'停止录音失败，请重试。');return;}const session=active;if(session)watchdog=setTimer(()=>{if(active!==session)return;finish(session,'识别服务响应超时，请重试。');session.engine.abort();},15000);return;}
 if(!Recognition){onError('当前浏览器不支持语音识别，请在支持语音识别的浏览器中打开，或使用文字收词。');return;}
 const engine=new Recognition(),session={engine,text:''};active=session;engine.lang='en-US';engine.continuous=true;engine.interimResults=true;
 engine.onstart=()=>{if(active===session&&state!=='stopping'){clearTimer(watchdog);update('recording');}};
 engine.onresult=e=>{if(active!==session)return;let text='';for(let i=0;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript+' ';session.text=text;};
 engine.onerror=e=>{const messages={'not-allowed':'麦克风权限未开启，请允许此网站使用麦克风。','service-not-allowed':'此浏览器的语音识别服务不可用。','audio-capture':'无法使用麦克风，请检查设备。','network':'语音识别网络连接失败，请重试。','no-speech':'没有听到语音，请再试一次。','aborted':'录音已取消。'};finish(session,messages[e.error]||'语音识别失败，请重试。');};
 engine.onend=()=>finish(session);
 update('starting');try{engine.start();if(active===session)watchdog=setTimer(()=>{if(active!==session||state!=='starting')return;finish(session,'无法启动麦克风，请检查浏览器权限。');engine.abort();},20000);}catch{finish(session,'录音启动失败，请检查麦克风权限后重试。');}
 },cancel(){if(active){const s=active;active=null;clearTimer(watchdog);update('idle');s.engine.abort();}}};
}
