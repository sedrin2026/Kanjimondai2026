let BANK={},level=Number(localStorage.getItem("dojoLevel")||0),currentMode="all",currentQuestion=null,locked=false,asked={},questionCount=0;

// Web Audio APIでオリジナル音を生成。音声ファイル不要なのでオフラインでも動作します。
let audioContext=null,bgmTimer=null,bgmStep=0,bgmGain=null;
const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46,523.25,659.25,783.99,1046.5,880,783.99,659.25,587.33];
function getAudio(){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return null;
  if(!audioContext)audioContext=new AudioCtx();
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  return audioContext;
}
function tone(freq,duration=0.16,wave="sine",volume=0.10,delay=0){
  const ctx=getAudio();if(!ctx)return;
  const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(freq,start);
  gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+0.018);gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+0.03);
}
function startBgm(){
  const ctx=getAudio();if(!ctx)return;
  stopBgm();bgmStep=0;
  const play=()=>{
    if(!audioContext||audioContext.state!=="running")return;
    const n=melody[bgmStep%melody.length];
    tone(n,0.22,"triangle",0.045);
    if(bgmStep%4===0)tone(n/2,0.34,"sine",0.025);
    bgmStep++;
  };
  play();bgmTimer=setInterval(play,300);
}
function stopBgm(){if(bgmTimer!==null){clearInterval(bgmTimer);bgmTimer=null;}}
function playCorrect(){[659.25,783.99,987.77].forEach((n,i)=>tone(n,0.17,"sine",0.12,i*0.11));}
function playWrong(){[392,329.63,261.63].forEach((n,i)=>tone(n,0.24,"triangle",0.10,i*0.17));}
function playFanfare(){stopBgm();[523.25,659.25,783.99,1046.5,1318.51].forEach((n,i)=>tone(n,0.34,"triangle",0.13,i*0.19));setTimeout(()=>tone(1567.98,0.8,"sine",0.12,0),1000);}

const categories={kanji:"漢字の読み取り",idiom_meaning:"四字熟語の意味",idiom_hole:"四字熟語の穴埋め",history:"歴史・発明問題"};
const birds=["🥚","🐤","🐥","🐦","🐦‍⬛","🦅","🦉","🦜","🦚","🦢","🔥🦅"];
const praise=["やる〜！","凄い！","その調子！","さすが！","天才！"];
const $=id=>document.getElementById(id);
async function init(){try{const r=await fetch("questions.json");BANK=await r.json();}catch(e){alert("問題データを読み込めませんでした。index.htmlとquestions.jsonを同じフォルダに置いてね。");return;}renderLevel();if("serviceWorker" in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").catch(()=>{});}}
function stage(l){return Math.min(10,Math.floor(l/10));}
function birdFor(l){return birds[stage(l)];}
function renderLevel(){$("topLevel").textContent="Lv "+level;$("homeLevel").textContent=level;$("homeBird").textContent=birdFor(level);$("homeBirdLv").textContent="Lv "+level; $("meterFill").style.width=(level%10)*10+"%";$("nextText").textContent=level===100?"最高レベル！鳳凰が完成！":"次の進化まであと "+(10-level%10)+" 問！";}
function hideAll(){["home","game","result","rules","exitScreen"].forEach(x=>$(x).classList.add("hidden"));}
function goHome(){stopBgm();hideAll();$("home").classList.remove("hidden");renderLevel();}
function showRules(){hideAll();$("rules").classList.remove("hidden");}
function startGame(mode){currentMode=mode;questionCount=0;hideAll();$("game").classList.remove("hidden");startBgm();nextQuestion();}
function poolForMode(){return currentMode==="all"?Object.keys(BANK):[currentMode];}
function getQuestion(){let cats=poolForMode();let cat=cats[Math.floor(Math.random()*cats.length)];let band=Math.floor(level/10);let key=cat+"_"+band;asked[key]??=[];let pool=BANK[cat]||[];let start=band*10;let bandPool=pool.slice(start,start+10);if(!bandPool.length)bandPool=pool;let available=bandPool.filter(q=>!asked[key].includes(q.id));if(!available.length){asked[key]=[];available=bandPool.slice();}let q=available[Math.floor(Math.random()*available.length)];asked[key].push(q.id);return q;}
function nextQuestion(){questionCount++;locked=false;$("feedback").classList.add("hidden");currentQuestion=getQuestion();$("categoryLabel").textContent=categories[currentQuestion.category];$("gameLevel").textContent="Lv "+level;$("questionText").textContent=currentQuestion.prompt;$("progressText").textContent="第 "+questionCount+" 問";let wrap=$("choices");wrap.innerHTML="";currentQuestion.choices.forEach(choice=>{let b=document.createElement("button");b.className="choice";b.textContent=choice;b.onclick=()=>answer(choice,b);wrap.appendChild(b);});}
function answer(choice,btn){if(locked)return;locked=true;[...$("choices").children].forEach(b=>b.disabled=true);let ok=choice===currentQuestion.answer;let fb=$("feedback");fb.classList.remove("hidden");if(ok){level=Math.min(100,level+1);localStorage.setItem("dojoLevel",level);renderLevel();fb.className="feedback correct";fb.textContent="⭕ 正解！！ "+praise[Math.floor(Math.random()*praise.length)];$("progressText").textContent="レベル "+level+" にアップ！";if(level===100)playFanfare();else playCorrect();setTimeout(()=>{if(level===100)showSuccess(true);else nextQuestion();},1100);}else{playWrong();level=0;localStorage.setItem("dojoLevel",0);renderLevel();fb.className="feedback wrong";fb.textContent="❌ おしい！正解は「"+currentQuestion.answer+"」";$("progressText").textContent="もう一度挑戦しよう！";setTimeout(()=>showFailure(),1200);}}
function showSuccess(max=false){stopBgm();hideAll();$("result").classList.remove("hidden");$("resultTitle").textContent="🎉 やる〜！レベル100達成！";$("resultBird").textContent=birdFor(100);$("resultBirdLv").textContent="Lv 100";$("resultText").textContent="⭕ 正解！！ 鳳凰の誕生！";}
function showFailure(){stopBgm();hideAll();$("result").classList.remove("hidden");$("resultTitle").textContent="🌸 また挑戦しよう！";$("resultBird").textContent="🐥💦";$("resultBirdLv").textContent="Lv 0";$("resultText").textContent="❌ 間違えちゃった！レベル0から再スタートだよ。";}
init();

// ブラウザの仕様上、Webアプリ側からタブを強制終了できない場合があります。
// 閉じられる環境では閉じ、閉じられない場合は終了画面を表示します。
function quitApp(){
  stopBgm();
  try { window.close(); } catch(e) {}
  setTimeout(()=>{
    hideAll();
    const exit = $("exitScreen");
    if(exit) exit.classList.remove("hidden");
  }, 120);
}
