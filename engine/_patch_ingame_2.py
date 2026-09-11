# -*- coding: utf-8 -*-
"""Batch 2: 10-language L dicts for flappy-dash, connect-four, neon-block-blast,
neon-block-jam, brickstorm."""
import io

BASE = r"I:\BaiduSyncdisk\Drill\数据报告\game-arcade\engine\assets\games"

JOBS = {}

JOBS["flappy-dash/play.html"] = """var L={
en:{start:"START",hint:"Tap / click / Space to flap.<br>Thread the neon gates. One touch and it's over.<br>Best:",scoreL:"Score:",bestL:"Best:",medal:"Medal"},
zh:{start:"START",hint:"Tap / click / Space to flap.<br>Thread the neon gates. One touch and it's over.<br>Best:",scoreL:"Score:",bestL:"Best:",medal:"奖牌"},
es:{start:"EMPEZAR",hint:"Toca / haz clic / Espacio para aletear.<br>Cruza las puertas de neón. Un roce y se acabó.<br>Récord:",scoreL:"Puntos:",bestL:"Récord:",medal:"Medalla"},
pt:{start:"COMEÇAR",hint:"Toque / clique / Espaço para bater as asas.<br>Atravesse os portais neon. Um toque e acabou.<br>Recorde:",scoreL:"Pontos:",bestL:"Recorde:",medal:"Medalha"},
ru:{start:"СТАРТ",hint:"Тап / клик / Пробел — взмах.<br>Проходите неоновые ворота. Одно касание — конец.<br>Рекорд:",scoreL:"Очки:",bestL:"Рекорд:",medal:"Медаль"},
ja:{start:"スタート",hint:"タップ / クリック / スペースで羽ばたく。<br>ネオンのゲートを縫って。一度触れたら終わり。<br>ベスト:",scoreL:"スコア:",bestL:"ベスト:",medal:"メダル"},
ko:{start:"시작",hint:"탭 / 클릭 / 스페이스로 날개짓.<br>네온 게이트를 통과하세요. 스치면 끝.<br>최고:",scoreL:"점수:",bestL:"최고:",medal:"메달"},
de:{start:"START",hint:"Tippen / Klicken / Leertaste zum Flattern.<br>Durch die Neon-Tore schlängeln. Eine Berührung — vorbei.<br>Rekord:",scoreL:"Punkte:",bestL:"Rekord:",medal:"Medaille"},
fr:{start:"DÉMARRER",hint:"Tape / clique / Espace pour battre des ailes.<br>Enfile les portes néon. Un effleurement et c'est fini.<br>Record :",scoreL:"Points :",bestL:"Record :",medal:"Médaille"},
id:{start:"MULAI",hint:"Ketuk / klik / Spasi untuk mengepak.<br>Menembus gerbang neon. Sekali sentuh, tamat.<br>Terbaik:",scoreL:"Skor:",bestL:"Terbaik:",medal:"Medali"}};"""

JOBS["connect-four/play.html"] = """var L={
en:{yourTurn:"Your turn — tap a column",aiTurn:"AI thinking…",aiWin:"AI wins 🤖",youWin:"You win! 🎉",
  p1Turn:"🔴 Red's turn",p2Turn:"🔵 Blue's turn",p1Win:"🔴 Red wins!",p2Win:"🔵 Blue wins!",draw:"Draw 🤝",
  newGame:"New game",you:"You",drawLbl:"Draw"},
zh:{yourTurn:"你的回合 — 点一列落子",aiTurn:"AI 思考中…",aiWin:"AI 赢了 🤖",youWin:"你赢了！🎉",
  p1Turn:"🔴 红方回合",p2Turn:"🔵 蓝方回合",p1Win:"🔴 红方赢！",p2Win:"🔵 蓝方赢！",draw:"平局 🤝",
  newGame:"新游戏",you:"你",drawLbl:"平局"},
es:{yourTurn:"Tu turno — toca una columna",aiTurn:"La IA piensa…",aiWin:"Gana la IA 🤖",youWin:"¡Ganaste! 🎉",
  p1Turn:"Turno del 🔴 rojo",p2Turn:"Turno del 🔵 azul",p1Win:"¡Gana el 🔴 rojo!",p2Win:"¡Gana el 🔵 azul!",draw:"Empate 🤝",
  newGame:"Nueva partida",you:"Tú",drawLbl:"Empate"},
pt:{yourTurn:"Sua vez — toque numa coluna",aiTurn:"A IA pensando…",aiWin:"A IA ganhou 🤖",youWin:"Você ganhou! 🎉",
  p1Turn:"Vez do 🔴 vermelho",p2Turn:"Vez do 🔵 azul",p1Win:"O 🔴 vermelho ganhou!",p2Win:"O 🔵 azul ganhou!",draw:"Empate 🤝",
  newGame:"Novo jogo",you:"Você",drawLbl:"Empate"},
ru:{yourTurn:"Ваш ход — нажмите на колонку",aiTurn:"ИИ думает…",aiWin:"Победил ИИ 🤖",youWin:"Вы победили! 🎉",
  p1Turn:"Ход 🔴 красных",p2Turn:"Ход 🔵 синих",p1Win:"Победили 🔴 красные!",p2Win:"Победили 🔵 синие!",draw:"Ничья 🤝",
  newGame:"Новая игра",you:"Вы",drawLbl:"Ничья"},
ja:{yourTurn:"あなたの番 — 列をタップして落とす",aiTurn:"AI 思考中…",aiWin:"AI の勝ち 🤖",youWin:"あなたの勝ち！🎉",
  p1Turn:"🔴 赤の番",p2Turn:"🔵 青の番",p1Win:"🔴 赤の勝ち！",p2Win:"🔵 青の勝ち！",draw:"引き分け 🤝",
  newGame:"ニューゲーム",you:"あなた",drawLbl:"引き分け"},
ko:{yourTurn:"당신 차례 — 열을 탭해 놓기",aiTurn:"AI 생각 중…",aiWin:"AI 승리 🤖",youWin:"당신 승리! 🎉",
  p1Turn:"🔴 빨강 차례",p2Turn:"🔵 파랑 차례",p1Win:"🔴 빨강 승리!",p2Win:"🔵 파랑 승리!",draw:"무승부 🤝",
  newGame:"새 게임",you:"당신",drawLbl:"무승부"},
de:{yourTurn:"Dein Zug — tippe auf eine Spalte",aiTurn:"KI überlegt…",aiWin:"Die KI gewinnt 🤖",youWin:"Du gewinnst! 🎉",
  p1Turn:"🔴 Rot ist am Zug",p2Turn:"🔵 Blau ist am Zug",p1Win:"🔴 Rot gewinnt!",p2Win:"🔵 Blau gewinnt!",draw:"Unentschieden 🤝",
  newGame:"Neues Spiel",you:"Du",drawLbl:"Unentschieden"},
fr:{yourTurn:"À toi — tape une colonne",aiTurn:"L'IA réfléchit…",aiWin:"L'IA gagne 🤖",youWin:"Tu gagnes ! 🎉",
  p1Turn:"Au tour du 🔴 rouge",p2Turn:"Au tour du 🔵 bleu",p1Win:"Le 🔴 rouge gagne !",p2Win:"Le 🔵 bleu gagne !",draw:"Match nul 🤝",
  newGame:"Nouvelle partie",you:"Toi",drawLbl:"Match nul"},
id:{yourTurn:"Giliranmu — ketuk satu kolom",aiTurn:"AI berpikir…",aiWin:"AI menang 🤖",youWin:"Kamu menang! 🎉",
  p1Turn:"Giliran 🔴 merah",p2Turn:"Giliran 🔵 biru",p1Win:"🔴 merah menang!",p2Win:"🔵 biru menang!",draw:"Seri 🤝",
  newGame:"Main baru",you:"Kamu",drawLbl:"Seri"}};"""

JOBS["neon-block-blast/play.html"] = """var L={
en:{score:"SCORE",best:"BEST",combo:"COMBO",daily:"📅 Daily",dailyOn:"✅ Daily done",
   over:"GAME OVER",bestLine:"Best",beat:"Beat yesterday: {d}",again:"PLAY AGAIN",
   clear1:"LINE CLEAR!",clearN:"{n} LINES ×{m}!",reset:"board reset"},
zh:{score:"得分",best:"最佳",combo:"连消",daily:"📅 每日挑战",dailyOn:"✅ 今日已完成",
   over:"游戏结束",bestLine:"最佳",beat:"超越昨日：{d}",again:"再来一局",
   clear1:"消行！",clearN:"{n} 行同消 ×{m}！",reset:"盘面已重置"},
es:{score:"PUNTOS",best:"RÉCORD",combo:"COMBO",daily:"📅 Diario",dailyOn:"✅ Diario hecho",
   over:"FIN DEL JUEGO",bestLine:"Récord",beat:"Supera el ayer: {d}",again:"JUGAR OTRA VEZ",
   clear1:"¡LÍNEA!",clearN:"¡{n} LÍNEAS ×{m}!",reset:"tablero reiniciado"},
pt:{score:"PONTOS",best:"RECORDE",combo:"COMBO",daily:"📅 Diário",dailyOn:"✅ Diário feito",
   over:"FIM DE JOGO",bestLine:"Recorde",beat:"Supere ontem: {d}",again:"JOGAR DE NOVO",
   clear1:"LINHA!",clearN:"{n} LINHAS ×{m}!",reset:"tabuleiro reiniciado"},
ru:{score:"ОЧКИ",best:"РЕКОРД",combo:"КОМБО",daily:"📅 Ежедневный",dailyOn:"✅ Ежедневный пройден",
   over:"ИГРА ОКОНЧЕНА",bestLine:"Рекорд",beat:"Побит вчерашний: {d}",again:"ИГРАТЬ СНОВА",
   clear1:"ЛИНИЯ!",clearN:"{n} ЛИНИЙ ×{m}!",reset:"поле сброшено"},
ja:{score:"スコア",best:"ベスト",combo:"コンボ",daily:"📅 デイリー",dailyOn:"✅ デイリー達成",
   over:"ゲームオーバー",bestLine:"ベスト",beat:"昨日を超えた：{d}",again:"もう一度プレイ",
   clear1:"ライン消去！",clearN:"{n} ライン ×{m}！",reset:"盤面をリセット"},
ko:{score:"점수",best:"최고",combo:"콤보",daily:"📅 일일",dailyOn:"✅ 일일 완료",
   over:"게임 오버",bestLine:"최고",beat:"어제를 넘음: {d}",again:"다시 플레이",
   clear1:"한 줄 제거!",clearN:"{n}줄 ×{m}!",reset:"보드 초기화됨"},
de:{score:"PUNKTE",best:"REKORD",combo:"COMBO",daily:"📅 Tagesaufgabe",dailyOn:"✅ Tagesaufgabe erledigt",
   over:"GAME OVER",bestLine:"Rekord",beat:"Gestern geschlagen: {d}",again:"NOCHMAL SPIELEN",
   clear1:"REIHE GELEERT!",clearN:"{n} REIHEN ×{m}!",reset:"Brett zurückgesetzt"},
fr:{score:"POINTS",best:"RECORD",combo:"COMBO",daily:"📅 Quotidien",dailyOn:"✅ Quotidien fait",
   over:"PARTIE TERMINÉE",bestLine:"Record",beat:"Hier battu : {d}",again:"REJOUER",
   clear1:"LIGNE !",clearN:"{n} LIGNES ×{m} !",reset:"grille réinitialisée"},
id:{score:"SKOR",best:"TERBAIK",combo:"KOMBO",daily:"📅 Harian",dailyOn:"✅ Harian selesai",
   over:"PERMAINAN SELESAI",bestLine:"Terbaik",beat:"Kalahkan kemarin: {d}",again:"MAIN LAGI",
   clear1:"BARIS BERSIH!",clearN:"{n} BARIS ×{m}!",reset:"papan direset"}};"""

JOBS["neon-block-jam/play.html"] = """var L={
en:{level:"LEVEL",moves:"MOVES",undo:"↩ Undo",reset:"↻ Reset",clear:"CLEAR!",allClear:"ALL LEVELS CLEAR!",
  replay:"↻ Replay",next:"Next →",mvUnit:"moves",parLbl:"par"},
zh:{level:"关卡",moves:"步数",undo:"↩ 撤销",reset:"↻ 重置",clear:"通关！",allClear:"全部通关！",
  replay:"↻ 重玩",next:"下一关 →",mvUnit:"步",parLbl:"目标"},
es:{level:"NIVEL",moves:"JUGADAS",undo:"↩ Deshacer",reset:"↻ Reiniciar",clear:"¡NIVEL!",allClear:"¡TODOS LOS NIVELES!",
  replay:"↻ Repetir",next:"Siguiente →",mvUnit:"jugadas",parLbl:"par"},
pt:{level:"NÍVEL",moves:"JOGADAS",undo:"↩ Desfazer",reset:"↻ Reiniciar",clear:"NÍVEL!",allClear:"TODOS OS NÍVEIS!",
  replay:"↻ Repetir",next:"Próximo →",mvUnit:"jogadas",parLbl:"par"},
ru:{level:"УРОВЕНЬ",moves:"ХОДЫ",undo:"↩ Отмена",reset:"↻ Сброс",clear:"ПРОЙДЕНО!",allClear:"ВСЕ УРОВНИ ПРОЙДЕНЫ!",
  replay:"↻ Заново",next:"Дальше →",mvUnit:"ходов",parLbl:"норма"},
ja:{level:"レベル",moves:"手数",undo:"↩ 元に戻す",reset:"↻ リセット",clear:"クリア！",allClear:"全レベルクリア！",
  replay:"↻ リプレイ",next:"次へ →",mvUnit:"手",parLbl:"目標"},
ko:{level:"레벨",moves:"이동",undo:"↩ 되돌리기",reset:"↻ 초기화",clear:"클리어!",allClear:"모든 레벨 클리어!",
  replay:"↻ 다시 하기",next:"다음 →",mvUnit:"이동",parLbl:"목표"},
de:{level:"STUFE",moves:"ZÜGE",undo:"↩ Rückgängig",reset:"↻ Neustart",clear:"GELEERT!",allClear:"ALLE STUFEN!",
  replay:"↻ Wiederholen",next:"Weiter →",mvUnit:"Züge",parLbl:"Vorgabe"},
fr:{level:"NIVEAU",moves:"COUPS",undo:"↩ Annuler",reset:"↻ Réinitialiser",clear:"RÉSOLU !",allClear:"TOUS RÉSOLUS !",
  replay:"↻ Rejouer",next:"Suivant →",mvUnit:"coups",parLbl:"par"},
id:{level:"LEVEL",moves:"LANGKAH",undo:"↩ Urungkan",reset:"↻ Ulang",clear:"BERSIH!",allClear:"SEMUA LEVEL BERES!",
  replay:"↻ Main ulang",next:"Lanjut →",mvUnit:"langkah",parLbl:"target"}};"""

JOBS["brickstorm/play.html"] = """var L={
en:{classic:"CLASSIC",tagClassic:"endless waves",daily:"DAILY",tagDaily:"same board for everyone today",
   tapStart:"pick a mode to start",lvl:"⬆ LEVEL UP",choose:"Choose one upgrade",over:"💀 GAME OVER",
   score:"Score",wave:"Wave",best:"Best",todayBest:"Today's Best",
   comeBack:"Come back tomorrow for a new board",retry:"RETRY"},
zh:{classic:"经典模式",tagClassic:"无尽波次",daily:"每日挑战",tagDaily:"今日全球同题",
   tapStart:"选择模式开始",lvl:"⬆ 升级！",choose:"选择一个强化",over:"💀 游戏结束",
   score:"得分",wave:"波次",best:"最佳",todayBest:"今日最佳",
   comeBack:"明天再来挑战新棋盘吧",retry:"再来一局"},
es:{classic:"CLÁSICO",tagClassic:"oleadas sin fin",daily:"DIARIO",tagDaily:"mismo tablero hoy para todos",
   tapStart:"elige un modo para empezar",lvl:"⬆ SUBES DE NIVEL",choose:"Elige una mejora",over:"💀 FIN DEL JUEGO",
   score:"Puntos",wave:"Oleada",best:"Récord",todayBest:"Récord de hoy",
   comeBack:"Vuelve mañana para un tablero nuevo",retry:"REINTENTAR"},
pt:{classic:"CLÁSSICO",tagClassic:"ondas sem fim",daily:"DIÁRIO",tagDaily:"mesmo tabuleiro hoje para todos",
   tapStart:"escolha um modo para começar",lvl:"⬆ SUBIU DE NÍVEL",choose:"Escolha uma melhoria",over:"💀 FIM DE JOGO",
   score:"Pontos",wave:"Onda",best:"Recorde",todayBest:"Recorde de hoje",
   comeBack:"Volte amanhã para um tabuleiro novo",retry:"TENTAR DE NOVO"},
ru:{classic:"КЛАССИКА",tagClassic:"бесконечные волны",daily:"ЕЖЕДНЕВНЫЙ",tagDaily:"сегодня поле одно для всех",
   tapStart:"выберите режим, чтобы начать",lvl:"⬆ НОВЫЙ УРОВЕНЬ",choose:"Выберите улучшение",over:"💀 ИГРА ОКОНЧЕНА",
   score:"Очки",wave:"Волна",best:"Рекорд",todayBest:"Рекорд дня",
   comeBack:"Загляните завтра за новым полем",retry:"ЕЩЁ РАЗ"},
ja:{classic:"クラシック",tagClassic:"エンドレスウェーブ",daily:"デイリー",tagDaily:"今日は全員同じ盤面",
   tapStart:"モードを選んでスタート",lvl:"⬆ レベルアップ",choose:"アップグレードを1つ選択",over:"💀 ゲームオーバー",
   score:"スコア",wave:"ウェーブ",best:"ベスト",todayBest:"今日のベスト",
   comeBack:"新しい盤面はまた明日",retry:"リトライ"},
ko:{classic:"클래식",tagClassic:"끝없는 웨이브",daily:"일일",tagDaily:"오늘은 모두 같은 보드",
   tapStart:"모드를 골라 시작하세요",lvl:"⬆ 레벨 업",choose:"업그레이드 하나를 선택하세요",over:"💀 게임 오버",
   score:"점수",wave:"웨이브",best:"최고",todayBest:"오늘의 최고",
   comeBack:"새 보드는 내일 다시 도전!",retry:"재도전"},
de:{classic:"KLASSIK",tagClassic:"endlose Wellen",daily:"TAGESAUFGABE",tagDaily:"heute dasselbe Brett für alle",
   tapStart:"Modus wählen zum Starten",lvl:"⬆ STUFE AUF",choose:"Wähle ein Upgrade",over:"💀 GAME OVER",
   score:"Punkte",wave:"Welle",best:"Rekord",todayBest:"Rekord des Tages",
   comeBack:"Morgen gibt es ein neues Brett",retry:"NOCHMAL"},
fr:{classic:"CLASSIQUE",tagClassic:"vagues sans fin",daily:"QUOTIDIEN",tagDaily:"même grille aujourd'hui pour tous",
   tapStart:"choisis un mode pour commencer",lvl:"⬆ NIVEAU SUPÉRIEUR",choose:"Choisis une amélioration",over:"💀 PARTIE TERMINÉE",
   score:"Points",wave:"Vague",best:"Record",todayBest:"Record du jour",
   comeBack:"Reviens demain pour une nouvelle grille",retry:"RÉESSAYER"},
id:{classic:"KLASIK",tagClassic:"gelombang tanpa akhir",daily:"HARIAN",tagDaily:"papan yang sama hari ini untuk semua",
   tapStart:"pilih mode untuk mulai",lvl:"⬆ NAIK LEVEL",choose:"Pilih satu peningkatan",over:"💀 PERMAINAN SELESAI",
   score:"Skor",wave:"Gelombang",best:"Terbaik",todayBest:"Terbaik Hari Ini",
   comeBack:"Kembali besok untuk papan baru",retry:"COBA LAGI"}};"""

ok = 0
for rel, block in JOBS.items():
    p = BASE + "\\" + rel.replace("/", "\\")
    src = io.open(p, encoding="utf-8").read()
    i = src.find("var L={")
    if i < 0:
        i = src.find("var L=\n{")
    assert i >= 0, rel + ": L not found"
    j = src.index("{", i)
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
print("batch2 done:", ok)
