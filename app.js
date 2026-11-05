let BANK={},level=0,currentMode="all",currentQuestion=null,locked=false,asked={},questionCount=0;

let answerTimer=null;

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
function playEvolution(level){
  const root=440+stage(level)*22;
  [1,1.25,1.5,2,2.5].forEach((note,index)=>{
    tone(root*note,index===4?0.65:0.25,"triangle",0.12,0.35+index*0.15);
  });
}

const categories={kanji:"漢字の読み取り",idiom_meaning:"四字熟語の意味",idiom_hole:"四字熟語の穴埋め",history:"歴史・発明問題"};
const birdNames=["卵","ヒヨコ","ヒナ","色つきのヒナ","猛禽の若鳥","大人の鷹","大きな色つきの鷹","鷲","鮮やかな鷲","鳳凰","虹色の火の鳥"];
const birdColors=[
  ["#a77965","#f4d6b0"],["#34a7aa","#f7ce59"],["#767b87","#dfc7a5"],
  ["#73472d","#f2cc90"],["#934b46","#ffc45f"],["#26364a","#f5e8cb"],
  ["#2958a4","#60d5ef"],["#d94923","#ffd94d"],["#882baf","#ffe56e"]
];
const saveKey="dojoSavedGame";
let ready=false;
const praise=["やる〜！","凄い！","その調子！","さすが！","天才！"];
const $=id=>document.getElementById(id);
async function init(){try{const r=await fetch("questions.json");BANK=await r.json();}catch(e){alert("問題データを読み込めませんでした。index.htmlとquestions.jsonを同じフォルダに置いてね。");return;}ready=true;level=readSave(true)?.level??0;renderLevel();if("serviceWorker" in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").catch(()=>{});}}
function stage(l){return Math.min(10,Math.floor(l/10));}
function drawBird(id,level){
  const step=stage(level);
  const target=$(id);
  target.setAttribute("role","img");
  target.setAttribute("aria-label",birdNames[step]);
  if(step<2){
    target.textContent=step===0?"🥚":"🐤";
    return;
  }
  const [body,head]=birdColors[step-2];
  const wings=step<4
    ? '<path d="M54 58Q24 47 25 71Q39 92 63 75Z"/>'
    : '<path d="M61 59Q35 54 5 27Q5 59 30 71L14 73Q35 89 60 79Q85 89 106 73L90 71Q115 59 115 27Q85 54 59 59Z"/>';
  const tail=step>=9
    ? '<path d="M51 73Q29 86 39 109Q44 95 55 91Q46 105 57 116Q59 100 66 94Q74 103 77 110Q87 92 69 74Z"/>'
    : '<path d="M49 75L45 96L60 90L73 96L71 75Z"/>';
  const stops=step===10
    ? '<stop stop-color="#ff4b55"/><stop offset=".26" stop-color="#ffbf34"/><stop offset=".49" stop-color="#4ec878"/><stop offset=".72" stop-color="#3f9efe"/><stop offset="1" stop-color="#a545ed"/>'
    : `<stop stop-color="${head}"/><stop offset="1" stop-color="${body}"/>`;
  const crest=step>=9?'<path d="M57 44Q50 27 73 20L69 35L82 27L76 46Z" fill="#ff9d23"/>':"";
  const scale=[.7,.84,.85,.9,.99,.97,1,1,1][step-2];
  target.innerHTML=`<svg viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id="${id}Colors" x2="100%" y2="100%">${stops}</linearGradient></defs>
    <g transform="translate(60 60) scale(${scale}) translate(-60 -60)">
      <g fill="url(#${id}Colors)" stroke="${body}" stroke-width="2" stroke-linejoin="round">${tail}${wings}<ellipse cx="60" cy="67" rx="19" ry="23"/></g>
      ${crest}<ellipse cx="66" cy="49" rx="17" ry="15" fill="${head}"/>
      <path d="M79 49L94 54L${step<4?79:84} 61L77 56Z" fill="#ffac26"/>
      <circle cx="73" cy="46" r="2.8" fill="#292032"/>
    </g>
  </svg>`;
}
function readSave(migrate=false){
  try{
    const raw=localStorage.getItem(saveKey);
    const save=JSON.parse(raw);
    if(save && Number.isInteger(save.level) && save.level>0 && save.level<=100 &&
      (save.mode==="all" || Object.hasOwn(categories,save.mode)) &&
      Number.isInteger(save.questionCount) && save.questionCount>=0 && save.asked &&
      Object.values(save.asked).every(Array.isArray))return save;
    if(migrate && raw===null){
      const previous=Number(localStorage.getItem("dojoLevel"));
      if(Number.isInteger(previous)&&previous>0&&previous<=100){
        const migrated={level:previous,mode:"all",questionCount:0,asked:{}};
        localStorage.setItem(saveKey,JSON.stringify(migrated));
        return migrated;
      }
    }
  }catch(error){}
  return null;
}
function renderLevel(){
  $("topLevel").textContent="Lv "+level;
  $("homeLevel").textContent=level;
  drawBird("homeBird",level);
  $("homeBirdLv").textContent="Lv "+level;
  $("meterFill").style.width=(level===100?100:(level%10)*10)+"%";
  $("nextText").textContent=level===100?"最高レベル！虹色の火の鳥が完成！":"次の進化まであと "+(10-level%10)+" 問！";
  const save=readSave();
  $("resumeGame").disabled=!ready||!save;
  $("resumeGame").textContent=save?`続きから Lv ${save.level}`:"続きから";
}
function hideAll(){clearTimeout(answerTimer);answerTimer=null;["home","game","result","rules","exitScreen"].forEach(x=>$(x).classList.add("hidden"));}
function goHome(){stopBgm();hideAll();$("home").classList.remove("hidden");renderLevel();}
function showRules(){hideAll();$("rules").classList.remove("hidden");}
function startGame(mode,save=null){
  if(!ready)return;
  currentMode=mode;
  level=save?.level??0;
  questionCount=save?.questionCount??0;
  asked=save?.asked??{};
  renderLevel();
  if(level===100){
    showSuccess();
    return;
  }
  hideAll();
  $("game").classList.remove("hidden");
  startBgm();
  nextQuestion();
}
function resumeGame(){
  const save=readSave();
  if(save)startGame(save.mode,save);
}
function saveAndExit(){
  if($("feedback").classList.contains("hidden")||!$("feedback").classList.contains("correct"))return;
  try{
    localStorage.setItem(saveKey,JSON.stringify({level,mode:currentMode,questionCount,asked}));
  }catch(error){
    clearTimeout(answerTimer);
    $("feedbackText").textContent="保存できませんでした。";
    return;
  }
  stopBgm();
  hideAll();
  $("exitMessage").textContent=`Lv ${level} を保存しました。次回は「続きから」で再開できます。`;
  $("exitScreen").classList.remove("hidden");
}
function poolForMode(){return currentMode==="all"?Object.keys(BANK):[currentMode];}
function getQuestion(){let cats=poolForMode();let cat=cats[Math.floor(Math.random()*cats.length)];let band=Math.floor(level/10);let key=cat+"_"+band;asked[key]??=[];let pool=BANK[cat]||[];let start=band*10;let bandPool=pool.slice(start,start+10);if(!bandPool.length)bandPool=pool;let available=bandPool.filter(q=>!asked[key].includes(q.id));if(!available.length){asked[key]=[];available=bandPool.slice();}let q=available[Math.floor(Math.random()*available.length)];asked[key].push(q.id);return q;}
function nextQuestion(){questionCount++;locked=false;$("feedback").classList.add("hidden");currentQuestion=getQuestion();$("categoryLabel").textContent=categories[currentQuestion.category];$("gameLevel").textContent="Lv "+level;$("questionText").textContent=currentQuestion.prompt;$("progressText").textContent=`第${questionCount}問`;let wrap=$("choices");wrap.innerHTML="";currentQuestion.choices.forEach(choice=>{let b=document.createElement("button");b.className="choice";b.textContent=choice;b.onclick=()=>answer(choice);wrap.appendChild(b);});}
function answer(choice){
  if(locked)return;
  locked=true;
  for(const button of $("choices").children)button.disabled=true;

  const ok=choice===currentQuestion.answer;
  level=ok?Math.min(100,level+1):0;
  renderLevel();

  $("feedback").className=ok?"feedback correct":"feedback wrong";
  $("feedbackActions").classList.toggle("hidden",!ok);
  $("evolution").classList.add("hidden");
  if(ok){
    const cheer=praise[Math.floor(Math.random()*praise.length)];
    $("feedbackText").textContent=`⭕ 正解！！
${cheer} レベル ${level} にアップ！`;
    $("nextAfterCorrect").textContent=level===100?"結果を見る":"次の問題へ";
    const evolved=level%10===0;
    playCorrect();
    if(evolved){
      drawBird("evolutionBefore",level-1);
      drawBird("evolutionAfter",level);
      $("evolutionName").textContent=`✨ ${birdNames[stage(level)]}に進化！`;
      $("evolution").classList.remove("hidden");
      playEvolution(level);
    }
    answerTimer=setTimeout(advanceAfterCorrect,evolved?6500:5000);
  }else{
    $("feedbackText").textContent=`❌ 不正解
正解は「${currentQuestion.answer}」`;
    playWrong();
    answerTimer=setTimeout(showFailure,2500);
  }
}
function advanceAfterCorrect(){
  clearTimeout(answerTimer);
  answerTimer=null;
  if(level===100)showSuccess();
  else nextQuestion();
}
function showSuccess(){
  stopBgm();
  hideAll();
  $("result").classList.remove("hidden");
  $("resultTitle").textContent="🎉 やる〜！レベル100達成！";
  drawBird("resultBird",100);
  $("resultBirdLv").textContent="Lv 100";
  $("resultText").textContent="⭕ 正解！！ 虹色の火の鳥の誕生！";
}
function showFailure(){stopBgm();hideAll();$("result").classList.remove("hidden");$("resultTitle").textContent="🌸 また挑戦しよう！";$("resultBird").removeAttribute("role");$("resultBird").removeAttribute("aria-label");$("resultBird").textContent="🐥💦";$("resultBirdLv").textContent="Lv 0";$("resultText").textContent="❌ 間違えちゃった！レベル0から再スタートだよ。";}
init();

// ブラウザの仕様上、Webアプリ側からタブを強制終了できない場合があります。
// 閉じられる環境では閉じ、閉じられない場合は終了画面を表示します。
function quitApp(){
  clearTimeout(answerTimer);
  answerTimer=null;
  stopBgm();
  try { window.close(); } catch(e) {}
  setTimeout(()=>{
    hideAll();
    const exit = $("exitScreen");
    $("exitMessage").innerHTML="おつかれさまでした。<br>この画面を閉じて終了してください。";
    if(exit) exit.classList.remove("hidden");
  }, 120);
}
