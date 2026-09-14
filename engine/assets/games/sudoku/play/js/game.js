/* Sudoku — game core (self-picked classic: seeded daily generation + unique-solution
 * digging verified by a built-in counting solver; per-board autosave). */
'use strict';

// ---- i18n (np_core) ----
var L = {
  en: { daily: "Daily", free: "Free play", easy: "Easy", med: "Medium", hard: "Hard",
    win: "Solved!", winText: "Every row, column and box — perfect.", close: "New puzzle",
    doneToday: "Daily cleared ✓", conflictHint: "conflicts highlighted in pink",
    todayDone: "Today {n}/3", share: "Share", copied: "Copied!",
    solvedIn: "solved in", noRank: "Rank is measured on Hard dailies",
    topRank: "Top rank reached!", nextRank: "{t} to {name}",
    rLegend: "Legend", rMaster: "Master", rDiamond: "Diamond", rPlat: "Platinum",
    rGold: "Gold", rSilver: "Silver", rBronze: "Bronze" },
  zh: { daily: "每日一题", free: "自由练习", easy: "简单", med: "中等", hard: "困难",
    win: "解题成功！", winText: "每一行、每一列、每一宫——完美。", close: "再来一局",
    doneToday: "今日已完成 ✓", conflictHint: "冲突数字以粉色高亮",
    todayDone: "今日 {n}/3", share: "分享", copied: "已复制！",
    solvedIn: "完成用时", noRank: "段位按每日 Hard 用时计",
    topRank: "已达最高段位！", nextRank: "距 {name} 还差 {t}",
    rLegend: "传奇", rMaster: "大师", rDiamond: "钻石", rPlat: "白金",
    rGold: "黄金", rSilver: "白银", rBronze: "青铜" }
};
function T(k) { return npT(L, k); }

// ---- seeded RNG + solver ----
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function dayIndex(){return Math.floor(Date.now()/86400000);}
function todayStr(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
// daily puzzles are seeded from the UTC date → same board worldwide on a given
// UTC day (Date.now-based so the __qa.newDay hook shifts it too)
function utcDayStr(){return new Date(Date.now()).toISOString().slice(0,10);}
function dayNum(s){var p=s.split("-");return Math.floor(Date.UTC(+p[0],+p[1]-1,+p[2])/86400000);}

// rank ladder (design doc: measured on Hard daily solve time, thresholds in
// seconds; tier holds when time <= threshold, e.g. 16:00 → Diamond, 16:00.9 → Platinum)
var RANKS=[
  {sec:480,emo:"🏆",key:"rLegend"},
  {sec:720,emo:"🥇",key:"rMaster"},
  {sec:960,emo:"💎",key:"rDiamond"},
  {sec:1320,emo:"🥈",key:"rPlat"},
  {sec:1800,emo:"🟡",key:"rGold"},
  {sec:2700,emo:"⚪",key:"rSilver"},
  {sec:Infinity,emo:"🟤",key:"rBronze"}
];
function rankIdx(sec){for(var i=0;i<RANKS.length;i++)if(sec<=RANKS[i].sec)return i;return RANKS.length-1;}
function rankStars(i){var s="";for(var k=0;k<7;k++)s+=k<7-i?"★":"☆";return s;}
function fmtSec(s){s=Math.max(0,Math.round(s));return ((s/60)|0)+":"+("0"+(s%60)).slice(-2);}

function peersOf(i){
  var r=(i/9)|0,c=i%9,out=[],seen={};
  for(var k=0;k<9;k++){out.push(r*9+k);out.push(k*9+c);}
  var br=((r/3)|0)*3, bc=((c/3)|0)*3;
  for(var rr=br;rr<br+3;rr++)for(var cc=bc;cc<bc+3;cc++)out.push(rr*9+cc);
  return out.filter(function(j){if(seen[j]||j===i)return false;seen[j]=1;return true;});
}
var PEERS=[];for(var pi=0;pi<81;pi++)PEERS.push(peersOf(pi));

// counting solver: returns number of solutions up to `cap` (MRV-pruned)
function countSolutions(g,cap){
  var grid=g.slice();
  function solve(){
    var best=-1,bestUsed=null,bestN=10;
    for(var i=0;i<81;i++){
      if(grid[i])continue;
      var used={};
      PEERS[i].forEach(function(j){if(grid[j])used[grid[j]]=1;});
      var n=0;
      for(var v=1;v<=9;v++)if(!used[v])n++;
      if(n===0)return 0;
      if(n<bestN){bestN=n;best=i;bestUsed=used;if(n===1)break;}
    }
    if(best===-1)return 1;
    var count=0;
    for(var v2=1;v2<=9&&count<cap;v2++){
      if(!bestUsed[v2]){grid[best]=v2;count+=solve();grid[best]=0;}
    }
    return count;
  }
  return solve();
}
// full-solution generator: sequential cell order + randomized digit order.
// (Shuffling CELL order makes naive backtracking exponential on unlucky seeds —
//  it hung production on 2026-09-13. Sequential fill from an empty grid is
//  practically instant; the step budget below is a safety fuse only.)
function genSolution(rng){
  for(var attempt=0;attempt<10;attempt++){
    var grid=new Array(81).fill(0);
    var steps=0,stuck=false;
    function fill(pos){
      if(pos>=81)return true;
      if(++steps>50000){stuck=true;return false;}
      var i=pos;
      var digits=[1,2,3,4,5,6,7,8,9];
      for(var k=digits.length-1;k>0;k--){var j=(rng()*(k+1))|0;var t=digits[k];digits[k]=digits[j];digits[j]=t;}
      var used={};
      PEERS[i].forEach(function(j){if(grid[j])used[grid[j]]=1;});
      for(var d=0;d<9;d++){
        var v=digits[d];
        if(!used[v]){grid[i]=v;if(fill(pos+1))return true;grid[i]=0;}
        if(stuck)return false;
      }
      return false;
    }
    if(fill(0)&&!stuck)return grid;
  }
  // deterministic fallback: cyclic pattern shifted per band/stack — always valid
  var g2=new Array(81).fill(0);
  for(var r=0;r<9;r++)for(var c=0;c<9;c++)g2[r*9+c]=((r%3)*3+((r/3)|0)+c)%9+1;
  return g2;
}
// dig holes keeping the solution unique (clue target depends on difficulty)
function digHoles(sol,rng,clues){
  var g=sol.slice();
  var order=[];for(var oi=0;oi<81;oi++)order.push(oi);
  for(var k=order.length-1;k>0;k--){var j=(rng()*(k+1))|0;var t=order[k];order[k]=order[j];order[j]=t;}
  var removed=0;
  for(var oi2=0;oi2<81&&81-removed>clues;oi2++){
    var i=order[oi2];
    if(!g[i])continue;
    var keep=g[i];g[i]=0;
    if(countSolutions(g,2,null)>1){g[i]=keep;}
    else removed++;
  }
  return g;
}
// ---- sudoku in browser could block: cap work, board cached per (mode,diff,day) ----
var CACHE_KEY="np_sd_cache";

var DIFFS=[
  {key:"easy",  label:"easy", clues:42},
  {key:"med",   label:"med",  clues:36},
  {key:"hard",  label:"hard", clues:30}
];
var mode="daily", diff=1;               // free-play difficulty index
var givens, user, sel=0;                // givens[i]: 1-9 or 0; user[i]: 0 or 1-9
var solution;                           // full solution of the current board (QA/hooks)
var curKey="";
var SAVE_KEY="np_sd_save";

function boardKey(){return mode==="daily"?("daily_"+utcDayStr()+"_"+diff):("free_"+diff);}
function dailySeed(d){return hashStr("np-sudoku-daily-"+utcDayStr()+"-"+d);}
function loadBoard(){
  // current board cached? (same day / same diff)
  var seedBase=mode==="daily"?dailySeed(diff):hashStr("np-sudoku-free-"+diff+"-"+todayStr());
  try{
    var c=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(c&&c.key===curKey){
      // cache hit: recompute the solution from the same deterministic seed so
      // solver-dependent hooks stay valid after a reload (board itself untouched)
      solution=genSolution(mulberry32(seedBase));
      return {givens:c.givens,user:c.user||[]};
    }
  }catch(e){}
  var rng=mulberry32(seedBase);
  solution=genSolution(rng);
  var g=digHoles(solution,rng,DIFFS[diff].clues);
  return {givens:g,user:new Array(81).fill(0)};
}
function persistBoard(){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({key:curKey,givens:givens,user:user}));}catch(e){}
}

// ---- daily timer (ms accumulator, survives reloads via np_sd_timer) ----
var TIMER_KEY="np_sd_timer",STREAK_KEY="np_sd_streak",DAILY_KEY="np_sd_daily_v2";
var timerBase=0,timerOn=false,timerStopAt=0;
function timerElapsed(){return timerOn?(Date.now()-timerBase):timerStopAt;}
function timerStart(){
  timerStopAt=0;timerOn=false;
  if(mode!=="daily")return;
  var acc=0;
  try{var p=JSON.parse(localStorage.getItem(TIMER_KEY)||"null");
    if(p&&p.key===curKey&&typeof p.acc==="number")acc=Math.max(0,p.acc);
  }catch(e){}
  if(dailyRecorded){timerStopAt=acc;return;}    // already solved today: keep final time
  timerBase=Date.now()-acc;timerOn=true;
}
function timerPersist(){if(mode!=="daily")return;
  try{localStorage.setItem(TIMER_KEY,JSON.stringify({key:curKey,acc:Math.round(timerElapsed())}));}catch(e){}}
setInterval(function(){if(mode==="daily"&&timerOn){renderTime();timerPersist();}},1000);
document.addEventListener("visibilitychange",function(){if(document.hidden)timerPersist();});

// ---- streak (🔥 consecutive UTC days, one monthly mulligan per design doc) ----
function readStreak(){var st={count:0,last:"",best:0,protect:1,pm:""};
  try{var p=JSON.parse(localStorage.getItem(STREAK_KEY)||"null");if(p&&typeof p.count==="number")st=p;}catch(e){}
  return st;}
function updateStreak(){
  var st=readStreak(),today=utcDayStr(),m=today.slice(0,7);
  if(st.pm!==m){st.pm=m;st.protect=1;}           // mulligan refreshes each month
  if(st.last!==today){
    if(st.last){
      var gap=dayNum(today)-dayNum(st.last);
      if(gap===1)st.count++;
      else if(gap===2&&st.protect>0){st.protect--;st.count++;} // 补签 mulligan
      else st.count=1;
    }else st.count=1;
    st.last=today;
  }
  if(st.count>st.best)st.best=st.count;
  try{localStorage.setItem(STREAK_KEY,JSON.stringify(st));}catch(e){}
  return st;
}
// ---- per-difficulty daily completion record ----
function readDaily(){var v={date:"",done:[false,false,false],times:[null,null,null]};
  try{var p=JSON.parse(localStorage.getItem(DAILY_KEY)||"null");
    if(p&&p.date===utcDayStr()&&p.done){v=p;v.times=p.times||[null,null,null];}}catch(e){}
  return v;}
function recordDaily(timeSec){
  var v=readDaily();
  if(v.done[diff])return v;                      // keep the first time of the day
  v.date=utcDayStr();v.done[diff]=true;v.times[diff]=Math.round(timeSec);
  try{localStorage.setItem(DAILY_KEY,JSON.stringify(v));}catch(e){}
  return v;
}
// ---- rank + share ----
function rankHtml(sec){
  var i=rankIdx(sec),r=RANKS[i],h='<div class="rankline">'+r.emo+" "+T(r.key)+
    ' <span class="stars">'+rankStars(i)+"</span></div>";
  if(i===0)h+='<div class="next">'+T("topRank")+"</div>";
  else h+='<div class="next">'+T("nextRank")
    .replace("{name}",T(RANKS[i-1].key))
    .replace("{t}",fmtSec(Math.max(1,Math.ceil(RANKS[i-1].sec-sec))))+"</div>";
  return h;
}
function shareText(sec,streak){
  var p=["🔢 Neon Sudoku "+T("daily")+" "+T(DIFFS[diff].key)+" "+T("solvedIn")+" "+fmtSec(sec)];
  if(diff===2){var r=RANKS[rankIdx(sec)];p.push(r.emo+T(r.key));}
  if(streak>0)p.push("🔥"+streak);
  p.push("| https://seyrs1985.github.io/neonplay/");
  return p.join(" ");
}
var lastShareText="";
function doShare(){
  var txt=lastShareText;
  if(!txt)return;
  var fallback=function(){
    try{var ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;opacity:0";
      document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
      msgEl.textContent=T("copied");
    }catch(e){msgEl.textContent=txt;}
  };
  if(navigator.share){navigator.share({text:txt}).catch(function(){
    if(navigator.clipboard&&navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(function(){msgEl.textContent=T("copied");}).catch(fallback);
    else fallback();
  });}
  else if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(txt).then(function(){msgEl.textContent=T("copied");}).catch(fallback);
  else fallback();
}

// ---- DOM ----
var gridEl=document.getElementById("grid"),padEl=document.getElementById("pad"),msgEl=document.getElementById("msg");
function buildGrid(){
  gridEl.innerHTML="";
  for(var r=0;r<9;r++){
    var tr=document.createElement("tr");
    for(var c=0;c<9;c++){
      var td=document.createElement("td");
      td.dataset.i=r*9+c;
      if(c===3||c===6)td.classList.add("bl");
      if(r===3||r===6)td.classList.add("bt");
      tr.appendChild(td);
    }
    gridEl.appendChild(tr);
  }
}
function conflictsFor(i,v){
  var out=false;
  PEERS[i].forEach(function(j){if(user[j]===v||(!user[j]&&givens[j]===v))out=true;});
  return out;
}
function render(){
  var tds=gridEl.children[0]?gridEl.rows:null;
  for(var r=0;r<9;r++)for(var c=0;c<9;c++){
    var i=r*9+c,td=gridEl.rows[r].cells[c];
    var v=givens[i]||user[i]||0;
    td.textContent=v||"";
    td.className="";
    if(c===3||c===6)td.classList.add("bl");
    if(r===3||r===6)td.classList.add("bt");
    if(givens[i])td.classList.add("given");
    else if(v)td.classList.add("user");
    if(i===sel)td.classList.add("sel");
    else if(sel>=0&&(PEERS[sel].indexOf(i)>=0))td.classList.add("peer");
    if(v&&sel>=0&&PEERS[sel].indexOf(i)>=0&&(givens[i]===v||user[i]===v))td.classList.add("same");
    if(!givens[i]&&v&&conflictsFor(i,v)){td.classList.add("conflict");}
  }
}
function renderHud(){
  document.getElementById("diffChip").innerHTML="<b>"+
    (mode==="daily"?T("daily"):T(DIFFS[diff].key))+"</b>";
  // streak chip (always visible — account-level)
  var st=readStreak(),sc=document.getElementById("streakChip");
  sc.innerHTML="🔥 <b>"+st.count+"</b>";
  sc.title="best "+st.best;
  // daily progress chip: ✅ 今日 n/3 (+legacy stamp text when all done)
  var v=readDaily(),dc=document.getElementById("doneChip");
  var n=v.done.filter(Boolean).length;
  dc.style.display=(mode==="daily")?"":"none";
  dc.innerHTML="✅ "+(n===3?T("doneToday"):T("todayDone").replace("{n}",n));
  renderTime();
}
function renderTime(){
  var tc=document.getElementById("timeChip");
  if(!tc)return;
  if(mode!=="daily"){tc.style.display="none";return;}
  tc.style.display="";tc.innerHTML="⏱ <b>"+fmtSec(timerElapsed()/1000)+"</b>";
}

// ---- win check ----
function filled(){for(var i=0;i<81;i++)if(!(givens[i]||user[i]))return false;return true;}
function noConflicts(){for(var i=0;i<81;i++){var v=givens[i]||user[i];if(v&&conflictsFor(i,v))return false;}return true;}
var dailyRecorded=false;
function checkWin(){
  if(filled()&&noConflicts()){
    var ms=timerElapsed(),sec=Math.round(ms/1000);
    if(mode==="daily"){
      try{localStorage.setItem("np_sd_daily_done",utcDayStr());}catch(e){}
      timerOn=false;timerStopAt=ms;             // freeze the clock at completion
      if(!dailyRecorded){
        dailyRecorded=true;
        var st=updateStreak();
        recordDaily(sec);
        lastShareText=shareText(sec,st.count);
        var stats=document.getElementById("wStats");
        stats.innerHTML='<div class="wtime">⏱ '+fmtSec(sec)+"</div>"+
          (diff===2?rankHtml(sec):'<div class="next">'+T("noRank")+"</div>")+
          '<div class="next">🔥 '+st.count+"</div>";
      }
    }
    document.getElementById("wTitle").textContent=T("win");
    document.getElementById("wText").textContent=T("winText");
    document.getElementById("wClose").textContent=T("close");
    document.getElementById("win").classList.remove("hide");
    confettiRain();
    renderHud();
  }
}
function confettiRain(){
  var cols=["#22d3ee","#f472b6","#ffd54a","#a78bfa","#4ade80"];
  for(var i=0;i<30;i++){
    var f=document.createElement("span");f.className="cf";
    f.style.left=(Math.random()*100)+"%";
    f.style.background=cols[(Math.random()*cols.length)|0];
    f.style.setProperty("--dx",((Math.random()-.5)*90).toFixed(0)+"px");
    f.style.animationDelay=(Math.random()*.4).toFixed(2)+"s";
    document.body.appendChild(f);
    (function(el){setTimeout(function(){el.remove();},1800);})(f);
  }
}

// ---- pad ----
function buildPad(){
  padEl.innerHTML="";
  for(var v=1;v<=9;v++){
    (function(v){
      var b=document.createElement("button");b.textContent=v;
      b.addEventListener("click",function(){place(v);});
      padEl.appendChild(b);
    })(v);
  }
  var e=document.createElement("button");e.textContent="⌫";e.className="erase";
  e.addEventListener("click",function(){place(0);});
  padEl.appendChild(e);
}
function place(v){
  if(sel<0||givens[sel])return;
  user[sel]=v;
  render();
  persistBoard();timerPersist();
  checkWin();
}
gridEl.addEventListener("click",function(e){
  var td=e.target.closest("td");if(!td||!td.dataset.i)return;
  sel=+td.dataset.i;
  render();
});
document.addEventListener("keydown",function(e){
  if(e.key>="1"&&e.key<="9"){place(+e.key);return;}
  if(e.key==="Backspace"||e.key==="0"){place(0);return;}
  var mv={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[e.key];
  if(mv){e.preventDefault();sel=Math.max(0,Math.min(80,sel+mv));render();}
});
document.addEventListener("pointercancel",function(){},{passive:true});

// ---- modes / difficulty ----
function boot(){
  curKey=boardKey();
  var b=loadBoard();
  givens=b.givens;user=b.user;
  sel=-1;dailyRecorded=readDaily().done[diff]&&mode==="daily";
  timerStart();
  render();renderHud();
}
function setMode(m){
  mode=m;
  document.getElementById("tab-daily").classList.toggle("on",m==="daily");
  document.getElementById("tab-free").classList.toggle("on",m==="free");
  boot();
}
document.getElementById("tab-daily").addEventListener("click",function(){setMode("daily");});
document.getElementById("tab-free").addEventListener("click",function(){setMode("free");});
[0,1,2].forEach(function(d){
  document.getElementById("d"+d).addEventListener("click",function(){
    diff=d;
    document.querySelectorAll(".dbtn").forEach(function(b){b.classList.remove("on");});
    this.classList.add("on");
    boot();
  });
});
document.getElementById("wClose").addEventListener("click",function(){
  document.getElementById("win").classList.add("hide");boot();
});
document.getElementById("wShare").addEventListener("click",doShare);

// ---- testability hooks ----
window.__qaState=function(){
  return {mode:mode,diff:diff,key:curKey,givens:givens.slice(),user:user.slice(),
    filled:givens.filter(Boolean).length,dailyDone:localStorage.getItem("np_sd_daily_done")||"",
    utc:utcDayStr(),elapsedSec:Math.round(timerElapsed()/1000),
    streak:JSON.parse(localStorage.getItem("np_sd_streak")||"null"),
    daily:JSON.parse(localStorage.getItem("np_sd_daily_v2")||"null")};
};
window.__qa={
  solution:function(){return solution.slice();},
  solverCount:function(){return countSolutions(givens,2);},
  setCell:function(i,v){sel=i;place(v);},
  autoSolve:function(){for(var i=0;i<81;i++)if(!givens[i])user[i]=solution[i];render();checkWin();},
  newDay:function(n){var real=Date.now;Date.now=function(){return real()+n*86400000;};},
  reboot:function(){document.getElementById("win").classList.add("hide");boot();},
  dailyGivens:function(ds,d){ // pure: deterministic board for an arbitrary UTC date+difficulty
    var rng=mulberry32(hashStr("np-sudoku-daily-"+ds+"-"+d));
    return digHoles(genSolution(rng),rng,DIFFS[d].clues);},
  uniq:function(g){return countSolutions(g.slice(),2);},
  shareText:function(){return lastShareText;}
};

// ---- boot ----
document.getElementById("tab-daily").textContent=T("daily");
document.getElementById("tab-free").textContent=T("free");
document.getElementById("d0").textContent=T("easy");
document.getElementById("d1").textContent=T("med");
document.getElementById("d2").textContent=T("hard");
document.getElementById("wShare").textContent=T("share");
buildGrid();buildPad();boot();
