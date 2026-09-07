export const MIME_TYPES=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg','audio/mp4;codecs=mp4a.40.2','audio/mp4'];
export function supportedFormats(Recorder){return Object.fromEntries(MIME_TYPES.map(type=>{try{return [type,typeof Recorder?.isTypeSupported==='function'?Recorder.isTypeSupported(type):false];}catch{return [type,false];}}));}
export function explainRecordingError(error){
 const code=typeof error?.error==='string'?error.error:error?.name;
 return ({NotAllowedError:'音频请求被拒绝：可能是浏览器/系统策略、嵌入页面限制或授权状态，不能据此断定用户未授权。',NotFoundError:'没有找到可用的音频输入设备。',NotReadableError:'无法读取麦克风：可能被占用，或系统/驱动无法启动设备。',AbortError:'音频采集被中断。',NotSupportedError:'当前浏览器不支持该录音方式、格式或编码。',SecurityError:'浏览器安全策略禁止音频采集。',OverconstrainedError:'音频设备无法满足请求的约束。',InvalidStateError:'当前页面或录音器状态不允许此操作。',TimeoutError:'服务响应超时，无法据此判断麦克风权限。',MediaRecorderUnsupported:'浏览器未提供 MediaRecorder；不代表麦克风权限被拒绝。',GetUserMediaUnsupported:'浏览器未提供 getUserMedia 音频采集接口。',InsecureContext:'页面不是安全上下文，请使用 HTTPS 或本机 localhost。','not-allowed':'浏览器拒绝启动语音识别；可能涉及服务或安全策略，不能据此断定麦克风未授权。','service-not-allowed':'浏览器不允许使用语音识别服务；麦克风授权和识别服务是两回事。','audio-capture':'语音识别服务无法获取音频，请使用下方独立麦克风检测定位原因。',network:'语音识别服务网络连接失败。','no-speech':'未检测到可识别的语音。',aborted:'语音识别已中断。',SpeechRecognitionUnsupported:'此浏览器未提供语音识别接口；可以独立检测麦克风采集。'})[code]||'录音操作失败，请查看诊断区域中的原始错误。';
}
export function installRecordingDiagnostics({win=window,nav=navigator,doc=document}={}){
 const panel=doc.createElement('section');panel.className='recording-diagnostics';
 panel.innerHTML='<h3>录音诊断信息（临时）</h3><p>失败后请截图此区域。独立检测录制约 2 秒，只统计音频大小，不保存或上传声音，不进行转文字。</p><button type="button" class="secondary">独立检测麦克风（2 秒）</button><pre aria-live="polite"></pre>';
 doc.querySelector('.shell').insertBefore(panel,doc.querySelector('nav'));
 const button=panel.querySelector('button'),pre=panel.querySelector('pre');let probe=null;
 const report={build:'android-diagnostics-1',path:win.location.origin+win.location.pathname,userAgent:nav.userAgent,'window.isSecureContext':win.isSecureContext,'navigator.mediaDevices':typeof nav.mediaDevices,'navigator.mediaDevices?.getUserMedia':typeof nav.mediaDevices?.getUserMedia,'window.MediaRecorder':typeof win.MediaRecorder,SpeechRecognition:typeof(win.SpeechRecognition||win.webkitSpeechRecognition),microphonePermission:'未查询（不影响录音）',supportedMimeTypes:supportedFormats(win.MediaRecorder),recognitionMime:'不适用：SpeechRecognition 不接受 MIME 设置',events:[]};
 function log(stage,error,extra={}){const raw=error?.error&&typeof error.error==='object'?error.error:error;const entry={time:new Date().toISOString(),stage,...extra};if(error){entry['error.name']=raw?.name??'(事件未提供 name)';entry['error.message']=raw?.message??'(事件未提供 message)';entry['error.error']=typeof error.error==='string'?error.error:null;entry.explanation=explainRecordingError(raw);}report.events.push(entry);report.events=report.events.slice(-8);pre.textContent=JSON.stringify(report,null,2);}
 log('页面就绪');
 async function permission(){try{if(!nav.permissions?.query)return;report.microphonePermission=(await nav.permissions.query({name:'microphone'})).state;}catch{report.microphonePermission='浏览器不支持查询';}}
 const failure=(name,message)=>Object.assign(new Error(message),{name});
 async function runProbe(){
  if(probe)return;const session={stream:null,recorder:null,cancelled:false,timer:null};probe=session;button.disabled=true;
  const release=()=>{session.stream?.getTracks().forEach(t=>t.stop());clearTimeout(session.timer);if(probe===session)probe=null;button.disabled=false;};
  session.cancel=()=>{session.cancelled=true;try{if(session.recorder?.state==='recording')session.recorder.stop();}finally{release();}};
  let stage='getUserMedia';
  try{
   log('开始独立检测');
   if(!win.isSecureContext)throw failure('InsecureContext','window.isSecureContext is false');
   if(typeof nav.mediaDevices?.getUserMedia!=='function')throw failure('GetUserMediaUnsupported','navigator.mediaDevices.getUserMedia is unavailable');
   session.timer=setTimeout(()=>{if(probe===session){log(stage,failure('TimeoutError','麦克风请求在 20 秒内未完成，授权状态未知'));session.cancel();}},20000);
   const stream=await nav.mediaDevices.getUserMedia({audio:true});session.stream=stream;
   if(session.cancelled){release();return;}clearTimeout(session.timer);log('getUserMedia 成功',null,{audioTracks:stream.getAudioTracks().length});
   stage='MediaRecorder';if(typeof win.MediaRecorder!=='function')throw failure('MediaRecorderUnsupported','window.MediaRecorder is unavailable');
   const formats=supportedFormats(win.MediaRecorder),mime=Object.keys(formats).find(t=>formats[t]);
   log('选择录制格式',null,{selectedMime:mime||'浏览器默认（不强制指定）'});
   const recorder=mime?new win.MediaRecorder(stream,{mimeType:mime}):new win.MediaRecorder(stream);session.recorder=recorder;let bytes=0;
   recorder.ondataavailable=e=>{bytes+=e.data?.size||0;};
   recorder.onerror=e=>{log('MediaRecorder error',e);session.cancel();};
   recorder.onstop=()=>{if(!session.cancelled)log('MediaRecorder 完成',null,{actualMime:recorder.mimeType,audioBytes:bytes,result:bytes?'音频采集成功；不代表语音识别服务可用':'没有产生音频数据'});release();};
   recorder.start();log('MediaRecorder 开始',null,{actualMime:recorder.mimeType});
   session.timer=setTimeout(()=>{try{recorder.stop();session.timer=setTimeout(()=>{log('MediaRecorder stop',failure('TimeoutError','录音器停止后未返回数据'));session.cancel();},5000);}catch(e){log('MediaRecorder stop',e);session.cancel();}},2000);
  }catch(e){log(stage,e);release();}finally{await permission();pre.textContent=JSON.stringify(report,null,2);}
 }
 button.addEventListener('click',()=>{if(!button.disabled)runProbe();});
 win.addEventListener('pagehide',()=>probe?.cancel());doc.addEventListener('visibilitychange',()=>{if(doc.hidden)probe?.cancel();});
 return {log,isProbing:()=>!!probe,setRecognitionActive(active){button.disabled=active||!!probe;},show(){panel.scrollIntoView({block:'nearest'});},permission};
}
