// Keep speak() synchronous with the user's tap, including while voices load.
export function createPronouncer({synth,Utterance,onState=()=>{},onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}) {
 let active=null,watchdog;
 function stop(){const old=active;active=null;clearTimer(watchdog);if(synth&&old){try{synth.cancel();}catch{}}onState('idle');}
 function fail(utterance,message){if(active!==utterance)return;stop();onError(message);}
 return {stop,get active(){return active!==null;},speak(text,slow=false){
  stop();
  if(!synth||!Utterance){onError('此浏览器暂不支持发音，请使用 Safari 或其他支持发音的浏览器。');return;}
  if(typeof text!=='string'||!text.trim()||text.length>2000){onError('发音内容为空或过长，请选择较短的例句。');return;}
  try {
   const u=new Utterance(text.trim());u.lang='en-US';u.rate=slow?0.7:1;u.pitch=1;u.volume=1;
   const voices=(synth.getVoices?.()||[]).filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
   const voice=voices.find(v=>v.localService&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>v.localService)||voices[0];
   if(voice){u.voice=voice;u.lang=voice.lang;}
   active=u;
   u.onstart=()=>{if(active===u){clearTimer(watchdog);onState('speaking');}};
   u.onend=()=>{if(active===u){active=null;clearTimer(watchdog);onState('idle');}};
   u.onerror=e=>{if(['canceled','interrupted'].includes(e.error)){if(active===u)stop();return;}fail(u,e.error==='language-unavailable'||e.error==='voice-unavailable'?'设备暂没有可用的英语声音，请检查系统英语语音后重试。':'发音未能完成，请检查音量和设备语音后重试。');};
   onState('starting');watchdog=setTimer(()=>fail(u,'发音没有启动，请检查音量并再次点击播放。'),10000);
   synth.speak(u);
  }catch{if(active)stop();onError('发音暂不可用，请重试。');}
 }};
}
