import {explainRecordingError} from './recording-diagnostics.js';
// SpeechRecognition owns capture; MediaRecorder is tested independently, never concurrently.
export function createSpeechController({Recognition,onState,onText,onError,onDiagnostic=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 let active=null,state='idle',watchdog;
 const update=s=>{state=s;onDiagnostic('SpeechRecognition state',null,{state:s});onState(s);};
 const fail=(session,stage,error)=>{onDiagnostic(stage,error);finish(session,explainRecordingError(error));};
 function finish(session,error){if(active!==session)return;clearTimer(watchdog);active=null;update('idle');if(error)onError(error);else if(session.text.trim())onText(session.text.trim());else onError('没有听清英文，请再试一次。');}
 return {get state(){return state;},toggle(){
 if(active){if(state==='stopping')return;clearTimer(watchdog);update('stopping');try{active.engine.stop();}catch(e){fail(active,'SpeechRecognition.stop',e);return;}const session=active;if(session)watchdog=setTimer(()=>{if(active!==session)return;fail(session,'SpeechRecognition.stop timeout',{name:'TimeoutError',message:'No end event within 15000ms after stop'});session.engine.abort();},15000);return;}
 if(!Recognition){const error={name:'SpeechRecognitionUnsupported',message:'Neither SpeechRecognition nor webkitSpeechRecognition is available'};onDiagnostic('SpeechRecognition availability',error);onError(explainRecordingError(error));return;}
 let engine;try{engine=new Recognition();}catch(e){onDiagnostic('SpeechRecognition constructor',e);onError(explainRecordingError(e));return;}const session={engine,text:''};active=session;engine.lang='en-US';engine.continuous=true;engine.interimResults=true;
 engine.onstart=()=>{if(active===session&&state!=='stopping'){clearTimer(watchdog);update('recording');}};
 engine.onresult=e=>{if(active!==session)return;let text='';for(let i=0;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript+' ';session.text=text;};
 engine.onerror=e=>{if(active===session)fail(session,'SpeechRecognition.onerror',e);};
 engine.onend=()=>finish(session);
 update('starting');try{engine.start();if(active===session)watchdog=setTimer(()=>{if(active!==session||state!=='starting')return;fail(session,'SpeechRecognition.start timeout',{name:'TimeoutError',message:'No start event within 20000ms'});engine.abort();},20000);}catch(e){fail(session,'SpeechRecognition.start',e);}
 },cancel(){if(active){const s=active;active=null;clearTimer(watchdog);update('idle');s.engine.abort();}}};
}
