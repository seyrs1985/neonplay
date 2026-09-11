# -*- coding: utf-8 -*-
"""Batch 1: replace per-game L dicts with 10-language versions (6 simple games).
Each NEW_L is the literal JS block spliced in place of the existing definition."""
import re
import io

BASE = r"I:\BaiduSyncdisk\Drill\数据报告\game-arcade\engine\assets\games"

JOBS = {}

JOBS["snake/play.html"] = """var L={
en:{score:"SCORE",best:"BEST",msg:"arrow keys / WASD — swipe on mobile",over:"GAME OVER",fsLabel:"score",again:"Play again"},
zh:{score:"得分",best:"最佳",msg:"方向键 / WASD — 手机滑动",over:"游戏结束",fsLabel:"得分",again:"再来一局"},
es:{score:"PUNTOS",best:"RÉCORD",msg:"flechas / WASD — desliza en móvil",over:"FIN DEL JUEGO",fsLabel:"puntos",again:"Jugar de nuevo"},
pt:{score:"PONTOS",best:"RECORDE",msg:"setas / WASD — deslize no celular",over:"FIM DE JOGO",fsLabel:"pontos",again:"Jogar de novo"},
ru:{score:"ОЧКИ",best:"РЕКОРД",msg:"стрелки / WASD — свайпы на телефоне",over:"ИГРА ОКОНЧЕНА",fsLabel:"очки",again:"Играть снова"},
ja:{score:"スコア",best:"ベスト",msg:"方向キー / WASD — スマホはスワイプ",over:"ゲームオーバー",fsLabel:"スコア",again:"もう一度遊ぶ"},
ko:{score:"점수",best:"최고",msg:"방향키 / WASD — 모바일은 스와이프",over:"게임 오버",fsLabel:"점수",again:"다시 플레이"},
de:{score:"PUNKTE",best:"REKORD",msg:"Pfeiltasten / WASD — auf dem Handy wischen",over:"GAME OVER",fsLabel:"Punkte",again:"Nochmal spielen"},
fr:{score:"POINTS",best:"RECORD",msg:"flèches / WASD — glisser sur mobile",over:"PARTIE TERMINÉE",fsLabel:"points",again:"Rejouer"},
id:{score:"SKOR",best:"TERBAIK",msg:"panah / WASD — usap di ponsel",over:"PERMAINAN SELESAI",fsLabel:"skor",again:"Main lagi"}};"""

JOBS["2048/play.html"] = """var L={
en:{score:"SCORE",best:"BEST",again:"New game",msg:"arrow keys / WASD — swipe on mobile · merge to 2048",
  over:"No moves left",overP:function(s,m){return "score "+s+" · best tile "+m;}},
zh:{score:"得分",best:"最佳",again:"新游戏",msg:"方向键 / WASD — 手机滑动方块 · 合成 2048",
  over:"无路可走了",overP:function(s,m){return "得分 "+s+" · 最大方块 "+m;}},
es:{score:"PUNTOS",best:"RÉCORD",again:"Nueva partida",msg:"flechas / WASD — desliza en móvil · llega a 2048",
  over:"Sin movimientos",overP:function(s,m){return "puntos "+s+" · ficha máxima "+m;}},
pt:{score:"PONTOS",best:"RECORDE",again:"Novo jogo",msg:"setas / WASD — deslize no celular · chegue ao 2048",
  over:"Sem movimentos",overP:function(s,m){return "pontos "+s+" · peça máxima "+m;}},
ru:{score:"ОЧКИ",best:"РЕКОРД",again:"Новая игра",msg:"стрелки / WASD — свайпы на телефоне · соберите 2048",
  over:"Ходов нет",overP:function(s,m){return "очки "+s+" · макс. плитка "+m;}},
ja:{score:"スコア",best:"ベスト",again:"ニューゲーム",msg:"方向キー / WASD — スマホはスワイプ · 2048 を作ろう",
  over:"動かせません",overP:function(s,m){return "スコア "+s+" · 最大タイル "+m;}},
ko:{score:"점수",best:"최고",again:"새 게임",msg:"방향키 / WASD — 모바일은 스와이프 · 2048을 만들어 보세요",
  over:"움직일 수 없음",overP:function(s,m){return "점수 "+s+" · 최대 타일 "+m;}},
de:{score:"PUNKTE",best:"REKORD",again:"Neues Spiel",msg:"Pfeiltasten / WASD — auf dem Handy wischen · erreiche 2048",
  over:"Keine Züge mehr",overP:function(s,m){return "Punkte "+s+" · höchste Kachel "+m;}},
fr:{score:"POINTS",best:"RECORD",again:"Nouvelle partie",msg:"flèches / WASD — glisser sur mobile · atteins 2048",
  over:"Plus de mouvements",overP:function(s,m){return "points "+s+" · tuile max "+m;}},
id:{score:"SKOR",best:"TERBAIK",again:"Main baru",msg:"panah / WASD — usap di ponsel · capai 2048",
  over:"Tidak ada langkah",overP:function(s,m){return "skor "+s+" · ubin maks "+m;}}};"""

JOBS["breakout/play.html"] = """var L={
en:{title:"🧱 NEON BREAKOUT",hint:"Smash every brick. Move with mouse, finger or arrow keys.<br>Tap / click / Space to launch the ball.",play:"PLAY",winT:"🏆 ALL CLEAR!",overT:"GAME OVER",scoreL:"Score",levelL:"Level reached",retry:"PLAY"},
zh:{title:"🧱 霓虹打砖块",hint:"消灭所有砖块。用鼠标、手指或方向键移动挡板。<br>点击 / 触摸 / 空格键发射弹球。",play:"开始",winT:"🏆 全部消除!",overT:"游戏结束",scoreL:"得分",levelL:"到达关卡",retry:"再玩一次"},
es:{title:"🧱 NEON BREAKOUT",hint:"Rompe todos los ladrillos. Muévete con ratón, dedo o flechas.<br>Toca / haz clic / Espacio para lanzar la bola.",play:"JUGAR",winT:"🏆 ¡TODO LIMPIO!",overT:"FIN DEL JUEGO",scoreL:"Puntos",levelL:"Nivel alcanzado",retry:"JUGAR"},
pt:{title:"🧱 NEON BREAKOUT",hint:"Quebre todos os blocos. Mova com mouse, dedo ou setas.<br>Toque / clique / Espaço para lançar a bola.",play:"JOGAR",winT:"🏆 TUDO LIMPO!",overT:"FIM DE JOGO",scoreL:"Pontos",levelL:"Nível alcançado",retry:"JOGAR"},
ru:{title:"🧱 НЕОНОВЫЙ АРКАНОИД",hint:"Разбей все кирпичи. Двигайся мышью, пальцем или стрелками.<br>Тап / клик / Пробел — запуск мяча.",play:"ИГРАТЬ",winT:"🏆 ВСЁ ЧИСТО!",overT:"ИГРА ОКОНЧЕНА",scoreL:"Очки",levelL:"Достигнут уровень",retry:"ИГРАТЬ"},
ja:{title:"🧱 ネオンブロック崩し",hint:"すべてのブロックを壊そう。マウス・指・方向キーで移動。<br>タップ / クリック / スペースでボールを発射。",play:"プレイ",winT:"🏆 全消し！",overT:"ゲームオーバー",scoreL:"スコア",levelL:"到達レベル",retry:"プレイ"},
ko:{title:"🧱 네온 벽돌깨기",hint:"모든 벽돌을 부수세요. 마우스, 터치 또는 방향키로 이동.<br>탭 / 클릭 / 스페이스로 공을 발사.",play:"플레이",winT:"🏆 전부 제거!",overT:"게임 오버",scoreL:"점수",levelL:"도달 레벨",retry:"플레이"},
de:{title:"🧱 NEON-BREAKOUT",hint:"Zerschmetre alle Blöcke. Bewege dich mit Maus, Finger oder Pfeiltasten.<br>Tippen / Klicken / Leertaste startet den Ball.",play:"SPIELEN",winT:"🏆 ALLES KLAR!",overT:"GAME OVER",scoreL:"Punkte",levelL:"Erreichte Stufe",retry:"SPIELEN"},
fr:{title:"🧱 CASSE-BRIQUES NÉON",hint:"Casse toutes les briques. Bouge avec la souris, le doigt ou les flèches.<br>Tape / clique / Espace pour lancer la balle.",play:"JOUER",winT:"🏆 TOUT CASSÉ !",overT:"PARTIE TERMINÉE",scoreL:"Points",levelL:"Niveau atteint",retry:"JOUER"},
id:{title:"🧱 BREAKOUT NEON",hint:"Hancurkan semua bata. Bergeraklah dengan mouse, jari, atau panah.<br>Ketuk / klik / Spasi untuk meluncurkan bola.",play:"MAIN",winT:"🏆 SEMUA BERHASIL!",overT:"PERMAINAN SELESAI",scoreL:"Skor",levelL:"Level dicapai",retry:"MAIN"}};"""

JOBS["minesweeper/play.html"] = """var L={
en:{flagOn:"Flag: ON",flagOff:"Flag: OFF",lose:"💥 Boom! Tap replay.",win:"🏆 Cleared in {s}s!",again:"Play again"},
zh:{flagOn:"旗标:开",flagOff:"旗标:关",lose:"💥 踩雷了！点再来一局。",win:"🏆 扫雷成功！用时 {s} 秒。",again:"再来一局"},
es:{flagOn:"Bandera: SÍ",flagOff:"Bandera: NO",lose:"💥 ¡Boom! Toca para repetir.",win:"¡🏆 Despejado en {s} s!",again:"Jugar de nuevo"},
pt:{flagOn:"Bandeira: SIM",flagOff:"Bandeira: NÃO",lose:"💥 Boom! Toque para repetir.",win:"🏆 Limpo em {s} s!",again:"Jogar de novo"},
ru:{flagOn:"Флажок: ВКЛ",flagOff:"Флажок: ВЫКЛ",lose:"💥 Бум! Нажмите ещё раз.",win:"🏆 Очищено за {s} с!",again:"Играть снова"},
ja:{flagOn:"旗モード:ON",flagOff:"旗モード:OFF",lose:"💥 爆発！タップでリプレイ。",win:"🏆 {s} 秒でクリア！",again:"もう一度遊ぶ"},
ko:{flagOn:"깃발: 켜짐",flagOff:"깃발: 꺼짐",lose:"💥 펑! 다시 눌러 재도전.",win:"🏆 {s}초 만에 클리어!",again:"다시 플레이"},
de:{flagOn:"Fahne: AN",flagOff:"Fahne: AUS",lose:"💥 Boom! Zum Wiederholen tippen.",win:"🏆 In {s} s geräumt!",again:"Nochmal spielen"},
fr:{flagOn:"Drapeau : OUI",flagOff:"Drapeau : NON",lose:"💥 Boum ! Tape pour rejouer.",win:"🏆 Déminé en {s} s !",again:"Rejouer"},
id:{flagOn:"Bendera: AKTIF",flagOff:"Bendera: MATI",lose:"💥 Boom! Ketuk untuk ulang.",win:"🏆 Bersih dalam {s} dtk!",again:"Main lagi"}};"""

JOBS["tic-tac-toe/play.html"] = """var L={
en:{yourTurn:"Your turn — you are X",cpuThinking:"Computer thinking…",cpuWins:"Computer wins 🤖",xWins:"X wins! 🎉",oWins:"O wins! 🎉",draw:"It's a draw 🤝",oMove:"O to move",xMove:"X to move",newRound:"New round"},
zh:{yourTurn:"你的回合 — 你是 X",cpuThinking:"电脑思考中…",cpuWins:"电脑赢了 🤖",xWins:"X 赢了！🎉",oWins:"O 赢了！🎉",draw:"平局 🤝",oMove:"O 回合",xMove:"X 回合",newRound:"新回合"},
es:{yourTurn:"Tu turno — eres X",cpuThinking:"La máquina piensa…",cpuWins:"Gana la máquina 🤖",xWins:"¡Gana X! 🎉",oWins:"¡Gana O! 🎉",draw:"Empate 🤝",oMove:"Mueve O",xMove:"Mueve X",newRound:"Nueva ronda"},
pt:{yourTurn:"Sua vez — você é X",cpuThinking:"O computador pensando…",cpuWins:"O computador ganha 🤖",xWins:"X ganhou! 🎉",oWins:"O ganhou! 🎉",draw:"Empate 🤝",oMove:"Vez do O",xMove:"Vez do X",newRound:"Nova rodada"},
ru:{yourTurn:"Ваш ход — вы играете X",cpuThinking:"Компьютер думает…",cpuWins:"Победил компьютер 🤖",xWins:"Победа X! 🎉",oWins:"Победа O! 🎉",draw:"Ничья 🤝",oMove:"Ход O",xMove:"Ход X",newRound:"Новый раунд"},
ja:{yourTurn:"あなたの番 — あなたは X",cpuThinking:"コンピュータ思考中…",cpuWins:"コンピュータの勝ち 🤖",xWins:"X の勝ち！🎉",oWins:"O の勝ち！🎉",draw:"引き分け 🤝",oMove:"O の番",xMove:"X の番",newRound:"新しいラウンド"},
ko:{yourTurn:"당신 차례 — 당신은 X",cpuThinking:"컴퓨터 생각 중…",cpuWins:"컴퓨터 승리 🤖",xWins:"X 승리! 🎉",oWins:"O 승리! 🎉",draw:"무승부 🤝",oMove:"O 차례",xMove:"X 차례",newRound:"새 라운드"},
de:{yourTurn:"Dein Zug — du bist X",cpuThinking:"Computer überlegt…",cpuWins:"Computer gewinnt 🤖",xWins:"X gewinnt! 🎉",oWins:"O gewinnt! 🎉",draw:"Unentschieden 🤝",oMove:"O ist am Zug",xMove:"X ist am Zug",newRound:"Neue Runde"},
fr:{yourTurn:"À toi — tu es X",cpuThinking:"L'ordinateur réfléchit…",cpuWins:"L'ordinateur gagne 🤖",xWins:"X gagne ! 🎉",oWins:"O gagne ! 🎉",draw:"Match nul 🤝",oMove:"Au tour de O",xMove:"Au tour de X",newRound:"Nouvelle manche"},
id:{yourTurn:"Giliranmu — kamu X",cpuThinking:"Komputer berpikir…",cpuWins:"Komputer menang 🤖",xWins:"X menang! 🎉",oWins:"O menang! 🎉",draw:"Seri 🤝",oMove:"Giliran O",xMove:"Giliran X",newRound:"Ronde baru"}};"""

JOBS["memory-pairs/play.html"] = """var L={
en:{mv:"MOVES",pr:"PAIRS",tm:"TIME",again:"Play again",winT:"All pairs found!",winP:"{m} moves · {s} s"},
zh:{mv:"步数",pr:"配对",tm:"时间",again:"再来一局",winT:"全部配对成功！",winP:"{m} 步 · {s} 秒"},
es:{mv:"JUGADAS",pr:"PAREJAS",tm:"TIEMPO",again:"Jugar de nuevo",winT:"¡Todas las parejas encontradas!",winP:"{m} jugadas · {s} s"},
pt:{mv:"JOGADAS",pr:"PARES",tm:"TEMPO",again:"Jogar de novo",winT:"Todos os pares encontrados!",winP:"{m} jogadas · {s} s"},
ru:{mv:"ХОДЫ",pr:"ПАРЫ",tm:"ВРЕМЯ",again:"Играть снова",winT:"Все пары найдены!",winP:"{m} ходов · {s} с"},
ja:{mv:"手数",pr:"ペア",tm:"タイム",again:"もう一度遊ぶ",winT:"全ペア発見！",winP:"{m} 手 · {s} 秒"},
ko:{mv:"이동",pr:"짝",tm:"시간",again:"다시 플레이",winT:"모든 짝을 찾았어요!",winP:"{m}번 이동 · {s}초"},
de:{mv:"ZÜGE",pr:"PAARE",tm:"ZEIT",again:"Nochmal spielen",winT:"Alle Paare gefunden!",winP:"{m} Züge · {s} s"},
fr:{mv:"COUPS",pr:"PAIRES",tm:"TEMPS",again:"Rejouer",winT:"Toutes les paires trouvées !",winP:"{m} coups · {s} s"},
id:{mv:"LANGKAH",pr:"PASANGAN",tm:"WAKTU",again:"Main lagi",winT:"Semua pasangan ditemukan!",winP:"{m} langkah · {s} dtk"}};"""

ok = 0
for rel, block in JOBS.items():
    p = BASE + "\\" + rel.replace("/", "\\")
    src = io.open(p, encoding="utf-8").read()
    # match "var L={" through the closing "};" of the object (brace counting)
    i = src.find("var L={")
    assert i >= 0, rel + ": L not found"
    j = i + len("var L=")
    depth = 0
    while j < len(src):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    end = src.index(";", j) + 1
    src = src[:i] + block + src[end:]
    io.open(p, "w", encoding="utf-8", newline="\n").write(src)
    ok += 1
    print("patched", rel)
print("batch1 done:", ok)
