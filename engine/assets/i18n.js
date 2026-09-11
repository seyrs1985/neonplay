/* NeonPlay i18n — runtime language switcher
   Priority: ?lang= > localStorage(np_lang) > navigator.language > en */
(function(){
"use strict";
var LANGS=[
  {code:"en",   label:"English"},
  {code:"zh",   label:"简体中文"},
  {code:"es",   label:"Español"},
  {code:"pt",   label:"Português"},
  {code:"ru",   label:"Русский"},
  {code:"ja",   label:"日本語"},
  {code:"ko",   label:"한국어"},
  {code:"de",   label:"Deutsch"},
  {code:"fr",   label:"Français"},
  {code:"id",   label:"Bahasa Indonesia"}
];
var T={
zh:{
 "nav.games":"🎮 游戏", "nav.tools":"🧰 ToolTide 工具",
 "hall.title":"免费游戏，即点即玩",
 "hall.sub":"原创游戏即刻加载、直接在浏览器中运行——无需下载、无需注册、毫无打扰。用心制作，尽情畅玩。",
 "hall.all":"全部游戏",
 "hall.originals":"我们的游戏都是原创",
 "hall.originals.blurb":"这里的每款游戏均为我们自制或已获授权——没有粗制滥造的换皮克隆，没有可疑跳转。游戏 100% 在你的浏览器本地运行，你的操作不会被追踪或上传。",
 "hall.tools_promo":"需要工具？访问我们的姐妹站 ToolTide，提供免费在线计算器、单位换算和倒计时。",
 "land.howto":"玩法说明",
 "land.faq":"常见问题",
 "land.more":"更多游戏",
 "land.tools":"工作时段的免费工具",
 "land.tools.blurb":"游戏间隙，欢迎访问我们的姐妹站 ToolTide——免费在线工具：百分比计算器、单位换算器、实时倒计时，同样无需注册。",
 "foot.tools":"🧰 ToolTide 免费在线工具",
 "foot.tag":"© {year} NeonPlay · 免费浏览器游戏。姐妹站：ToolTide——免费在线工具，即开即用。",
 "404.title":"404 — 页面不存在",
 "404.body":"该页面不存在。返回游戏大厅继续游玩。",
 "about.body":"NeonPlay 是一个小而精的免费浏览器游戏合集——街机、益智与经典玩法。每款游戏均为我们自制或已获授权：没有换皮克隆、没有可疑跳转、也不强制注册。",
 "privacy.body":"NeonPlay 游戏完全在你的浏览器中本地运行。我们不需要账号，不在服务器上存储你的分数，你在游戏中的任何操作都不会被上传。"
},
es:{
 "nav.games":"🎮 Juegos", "nav.tools":"🧰 Herramientas ToolTide",
 "hall.title":"Juegos gratis, sin fricción",
 "hall.sub":"Juegos originales que cargan al instante y corren en tu navegador — sin descargas, sin cuentas, sin interrupciones.",
 "hall.all":"Todos los juegos",
 "hall.originals":"Nuestros juegos son originales",
 "hall.originals.blurb":"Cada juego está creado por nosotros o debidamente licenciado — sin clones, sin redirecciones sospechosas. Se ejecutan 100% en tu navegador.",
 "hall.tools_promo":"¿Necesitas herramientas? Visita nuestro sitio hermano ToolTide: calculadoras, conversores y cuentas atrás gratis.",
 "land.howto":"Cómo jugar",
 "land.faq":"Preguntas frecuentes",
 "land.more":"Más juegos",
 "land.tools":"Herramientas gratis para el trabajo",
 "land.tools.blurb":"Entre partidas, visita nuestro sitio hermano ToolTide: herramientas online gratis — calculadoras, conversores y cuentas atrás.",
 "foot.tools":"🧰 Herramientas online gratis de ToolTide",
 "404.title":"404 — Página no encontrada",
 "404.body":"Esa página no existe. Vuelve al salón de juegos."
},
pt:{
 "nav.games":"🎮 Jogos", "nav.tools":"🧰 Ferramentas ToolTide",
 "hall.title":"Jogos grátis, sem complicação",
 "hall.sub":"Jogos originais que carregam instantaneamente no seu navegador — sem downloads, sem contas, sem interrupções.",
 "hall.all":"Todos os jogos",
 "hall.originals":"Nossos jogos são originais",
 "hall.originals.blurb":"Cada jogo foi criado por nós ou devidamente licenciado — sem clones, sem redirecionamentos suspeitos. Rodam 100% no seu navegador.",
 "hall.tools_promo":"Precisa de ferramentas? Visite nosso site irmão ToolTide: calculadoras, conversores e contagens regressivas grátis.",
 "land.howto":"Como jogar",
 "land.faq":"Perguntas frequentes",
 "land.more":"Mais jogos",
 "land.tools":"Ferramentas grátis para o trabalho",
 "land.tools.blurb":"Entre as partidas, visite nosso site irmão ToolTide: ferramentas online grátis — calculadoras, conversores e contagens regressivas.",
 "foot.tools":"🧰 Ferramentas online grátis do ToolTide",
 "404.title":"404 — Página não encontrada",
 "404.body":"Essa página não existe. Volte ao salão de jogos."
},
ru:{
 "nav.games":"🎮 Игры", "nav.tools":"🧰 Инструменты ToolTide",
 "hall.title":"Бесплатные игры без лишнего",
 "hall.sub":"Оригинальные игры, которые мгновенно загружаются и работают в вашем браузере — без загрузок, регистраций и отвлечений.",
 "hall.all":"Все игры",
 "hall.originals":"Наши игры — оригиналы",
 "hall.originals.blurb":"Каждая игра создана нами или должным образом лицензирована — никаких клонов и подозрительных переадресаций. Всё работает локально в браузере.",
 "hall.tools_promo":"Нужны инструменты? Загляните на наш姊妹-сайт ToolTide: бесплатные калькуляторы, конвертеры и обратный отсчёт.",
 "land.howto":"Как играть",
 "land.faq":"Частые вопросы",
 "land.more":"Больше игр",
 "land.tools":"Бесплатные инструменты для работы",
 "land.tools.blurb":"Между игровыми сессиями загляните на наш сайт-побратим ToolTide — бесплатные онлайн-инструменты: калькуляторы, конвертеры и обратный отсчёт.",
 "foot.tools":"🧰 Бесплатные инструменты ToolTide",
 "404.title":"404 — Страница не найдена",
 "404.body":"Такой страницы нет. Вернитесь в игровой зал."
}
};
function detect(){
  var q=new URLSearchParams(location.search).get("lang");
  if(q&&LANGS.some(function(l){return l.code===q;}))return q;
  var s=null;try{s=localStorage.getItem("np_lang");}catch(e){}
  if(s&&LANGS.some(function(l){return l.code===s;}))return s;
  var nl=(navigator.languages&&navigator.languages[0])||navigator.language||"en";
  if(nl.indexOf("zh")===0)return "zh";
  if(nl.indexOf("es")===0)return "es";
  if(nl.indexOf("pt")===0)return "pt";
  if(nl.indexOf("ru")===0)return "ru";
  return "en";
}
var lang=detect();
window.npLang=function(){return lang;};
window.npSetLang=function(code){
  try{localStorage.setItem("np_lang",code);}catch(e){}
  location.reload();
};
window.npT=function(key){
  var d=T[lang]||T.en||{};
  return d[key]||null;
};
function apply(){
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    var v=npT(el.getAttribute("data-i18n"));
    if(v)el.textContent=v.replace("{year}",new Date().getFullYear());
  });
}
function switcher(){
  var nav=document.querySelector(".site-head nav");
  if(!nav)return;
  var b=document.createElement("button");
  b.id="lang-btn";b.textContent="🌐 "+lang.toUpperCase();
  b.style.cssText="background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit;border-radius:8px;padding:4px 10px;font-size:.85rem;cursor:pointer";
  var dd=document.createElement("div");
  dd.style.cssText="position:absolute;right:0;top:110%;background:#141a35;border:1px solid #2b3564;border-radius:10px;padding:6px;display:none;flex-direction:column;min-width:150px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.5)";
  LANGS.forEach(function(l){
    var o=document.createElement("div");
    o.textContent=l.label;
    o.style.cssText="padding:7px 12px;border-radius:6px;cursor:pointer;font-size:.9rem"+(l.code===lang?";color:#22d3ee":"");
    o.addEventListener("click",function(e){e.stopPropagation();window.npSetLang(l.code);});
    o.addEventListener("mouseenter",function(){o.style.background="#232b52";});
    o.addEventListener("mouseleave",function(){o.style.background="transparent";});
    dd.appendChild(o);
  });
  var wrap=document.createElement("div");
  wrap.style.cssText="position:relative;margin-left:8px";
  wrap.appendChild(b);wrap.appendChild(dd);
  b.addEventListener("click",function(e){e.stopPropagation();dd.style.display=dd.style.display==="flex"?"none":"flex";});
  document.addEventListener("click",function(){dd.style.display="none";});
  nav.appendChild(wrap);
}
function boot(){
  apply();
  switcher();
  document.documentElement.lang=lang;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
