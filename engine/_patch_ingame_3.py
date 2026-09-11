# -*- coding: utf-8 -*-
"""Batch 3: 10-language L dicts for the 4 directory-style games
(idle-neon-breaker, neon-alchemy, word-hive, neon-tide).
neon-tide also gets its inline zh/en ternary replaced by the shared npLang()."""
import io
import re

BASE = r"I:\BaiduSyncdisk\Drill\数据报告\game-arcade\engine\assets\games"

JOBS = {}

JOBS["idle-neon-breaker/play/js/game.js"] = """var L = {
  en: { ball: "Ball +1", dmg: "Damage +1", spd: "Speed +10%", cnt: "Coins +25%",
        max: "MAX", lv: "Lv", welcome: "Welcome back!", away: "You earned while away",
        claim: "Claim", afford: "", mergeIn: "next merge",
        note: "No forced ads · unlimited offline earnings · autosaves in your browser" },
  zh: { ball: "弹球 +1", dmg: "伤害 +1", spd: "弹速 +10%", cnt: "金币 +25%",
        max: "已满级", lv: "级", welcome: "欢迎回来！", away: "你不在的时候也在赚钱",
        claim: "收下", afford: "", mergeIn: "下次合并",
        note: "零强制广告 · 离线收益无上限 · 浏览器自动存档" },
  es: { ball: "Bola +1", dmg: "Daño +1", spd: "Velocidad +10%", cnt: "Monedas +25%",
        max: "MÁX", lv: "Nv", welcome: "¡Bienvenido de nuevo!", away: "Ganaste mientras no estabas",
        claim: "Recoger", afford: "", mergeIn: "próxima fusión",
        note: "Sin anuncios forzosos · ganancias sin conexión ilimitadas · autoguardado en tu navegador" },
  pt: { ball: "Bola +1", dmg: "Dano +1", spd: "Velocidade +10%", cnt: "Moedas +25%",
        max: "MÁX", lv: "Nv", welcome: "Bem-vindo de volta!", away: "Você ganhou enquanto estava fora",
        claim: "Pegar", afford: "", mergeIn: "próxima fusão",
        note: "Sem anúncios forçados · ganhos offline ilimitados · salvamento automático no navegador" },
  ru: { ball: "Мяч +1", dmg: "Урон +1", spd: "Скорость +10%", cnt: "Монеты +25%",
        max: "МАКС", lv: "Ур", welcome: "С возвращением!", away: "Вы заработали, пока вас не было",
        claim: "Забрать", afford: "", mergeIn: "следующее слияние",
        note: "Без принудительной рекламы · безграничный офлайн-доход · автосохранение в браузере" },
  ja: { ball: "ボール +1", dmg: "ダメージ +1", spd: "スピード +10%", cnt: "コイン +25%",
        max: "最大", lv: "Lv", welcome: "おかえりなさい！", away: "不在の間も稼いでいました",
        claim: "受け取る", afford: "", mergeIn: "次のマージまで",
        note: "強制広告なし · オフライン収益は無限 · ブラウザに自動セーブ" },
  ko: { ball: "공 +1", dmg: "데미지 +1", spd: "속도 +10%", cnt: "코인 +25%",
        max: "최대", lv: "Lv", welcome: "다시 오셨네요!", away: "자리를 비운 동안 벌었어요",
        claim: "받기", afford: "", mergeIn: "다음 합병",
        note: "강제 광고 없음 · 오프라인 수익 무제한 · 브라우저 자동 저장" },
  de: { ball: "Ball +1", dmg: "Schaden +1", spd: "Tempo +10%", cnt: "Münzen +25%",
        max: "MAX", lv: "St", welcome: "Willkommen zurück!", away: "Du hast verdient, während du weg warst",
        claim: "Abholen", afford: "", mergeIn: "nächstes Verschmelzen",
        note: "Keine erzwungene Werbung · unbegrenzter Offline-Verdienst · Autospeichern im Browser" },
  fr: { ball: "Balle +1", dmg: "Dégâts +1", spd: "Vitesse +10%", cnt: "Pièces +25%",
        max: "MAX", lv: "Nv", welcome: "Bon retour !", away: "Tu as gagné pendant ton absence",
        claim: "Récupérer", afford: "", mergeIn: "prochaine fusion",
        note: "Aucune pub forcée · gains hors ligne illimités · sauvegarde auto dans le navigateur" },
  id: { ball: "Bola +1", dmg: "Kerusakan +1", spd: "Kecepatan +10%", cnt: "Koin +25%",
        max: "MAKS", lv: "Lv", welcome: "Selamat datang kembali!", away: "Kamu menghasilkan selama pergi",
        claim: "Ambil", afford: "", mergeIn: "penggabungan berikutnya",
        note: "Tanpa iklan paksa · penghasilan luring tanpa batas · tersimpan otomatis di browser" }
};
function T(k) { return npT(L, k); }"""

JOBS["neon-alchemy/play/js/game.js"] = """var L = {
  en: { free: "Free Craft", daily: "Daily Puzzle", target: "Target", pool: "pool",
    discovered: "discovered!", already: "Already discovered — no double count",
    noRx: "No reaction…", dailyDone: "Today's board cleared!",
    share: "Share result", close: "Close", wall: "Collection", recipes: "Recipe log",
    reset: "Reset collection", confirm: "Reset EVERYTHING? Tap again to confirm.",
    dailyTag: "same board for everyone today", poolNote: "combine within the pool only",
    shareText: "Neon Alchemy Daily #%d %s %d/%d combos" },
  zh: { free: "自由合成", daily: "每日合成", target: "今日目标", pool: "元素池",
    discovered: "发现新元素！", already: "已发现过——不重复计数",
    noRx: "没有反应……", dailyDone: "今日合成完成！",
    share: "分享战绩", close: "关闭", wall: "元素图鉴", recipes: "配方图谱",
    reset: "重置图鉴", confirm: "确定清空全部进度？再点一次确认。",
    dailyTag: "今日全球同题", poolNote: "只能用池内元素合成",
    shareText: "Neon Alchemy 每日合成 #%d %s %d/%d" },
  es: { free: "Creación libre", daily: "Puzle diario", target: "Objetivo", pool: "conjunto",
    discovered: "¡descubierto!", already: "Ya descubierto — no cuenta doble",
    noRx: "Sin reacción…", dailyDone: "¡Tablero de hoy completado!",
    share: "Compartir resultado", close: "Cerrar", wall: "Colección", recipes: "Registro de recetas",
    reset: "Reiniciar colección", confirm: "¿Borrar TODO? Toca otra vez para confirmar.",
    dailyTag: "mismo tablero hoy para todos", poolNote: "combina solo dentro del conjunto",
    shareText: "Neon Alchemy Diario #%d %s %d/%d combinaciones" },
  pt: { free: "Criação livre", daily: "Quebra-cabeça diário", target: "Alvo", pool: "conjunto",
    discovered: "descoberto!", already: "Já descoberto — não conta em dobro",
    noRx: "Nenhuma reação…", dailyDone: "Tabuleiro de hoje concluído!",
    share: "Compartilhar resultado", close: "Fechar", wall: "Coleção", recipes: "Registro de receitas",
    reset: "Zerar coleção", confirm: "Apagar TUDO? Toque de novo para confirmar.",
    dailyTag: "mesmo tabuleiro hoje para todos", poolNote: "combine apenas dentro do conjunto",
    shareText: "Neon Alchemy Diário #%d %s %d/%d combinações" },
  ru: { free: "Свободный синтез", daily: "Ежедневная головоломка", target: "Цель", pool: "набор",
    discovered: "открыто!", already: "Уже открыто — повторно не считается",
    noRx: "Без реакции…", dailyDone: "Поле на сегодня пройдено!",
    share: "Поделиться результатом", close: "Закрыть", wall: "Коллекция", recipes: "Журнал рецептов",
    reset: "Сбросить коллекцию", confirm: "Удалить ВСЁ? Нажмите ещё раз для подтверждения.",
    dailyTag: "сегодня поле одно для всех", poolNote: "смешивайте только внутри набора",
    shareText: "Neon Alchemy Ежедневка #%d %s %d/%d комбинаций" },
  ja: { free: "フリークラフト", daily: "デイリーパズル", target: "ターゲット", pool: "プール",
    discovered: "発見！", already: "発見済み — 二重カウントなし",
    noRx: "反応なし……", dailyDone: "今日の盤面クリア！",
    share: "結果をシェア", close: "閉じる", wall: "コレクション", recipes: "レシピ記録",
    reset: "コレクションをリセット", confirm: "すべて消去する？もう一度タップで確認。",
    dailyTag: "今日は全員同じ盤面", poolNote: "プール内の要素だけで合成",
    shareText: "Neon Alchemy デイリー #%d %s %d/%d コンボ" },
  ko: { free: "자유 조합", daily: "일일 퍼즐", target: "목표", pool: "요소 모음",
    discovered: "발견!", already: "이미 발견함 — 중복 계산 안 됨",
    noRx: "반응 없음…", dailyDone: "오늘의 보드 클리어!",
    share: "결과 공유", close: "닫기", wall: "컬렉션", recipes: "레시피 기록",
    reset: "컬렉션 초기화", confirm: "전부 지울까요? 한 번 더 눌러 확인하세요.",
    dailyTag: "오늘은 모두 같은 보드", poolNote: "모음 안의 요소로만 조합",
    shareText: "Neon Alchemy 일일 #%d %s %d/%d 콤보" },
  de: { free: "Freies Handwerk", daily: "Tagesrätsel", target: "Ziel", pool: "Vorrat",
    discovered: "entdeckt!", already: "Schon entdeckt — keine Doppelzählung",
    noRx: "Keine Reaktion…", dailyDone: "Heutiges Brett geschafft!",
    share: "Ergebnis teilen", close: "Schließen", wall: "Sammlung", recipes: "Rezept-Log",
    reset: "Sammlung zurücksetzen", confirm: "WIRKLICH alles löschen? Nochmal tippen zum Bestätigen.",
    dailyTag: "heute dasselbe Brett für alle", poolNote: "nur innerhalb des Vorrats kombinieren",
    shareText: "Neon Alchemy Tagesrätsel #%d %s %d/%d Kombos" },
  fr: { free: "Fabrication libre", daily: "Énigme du jour", target: "Cible", pool: "réserve",
    discovered: "découvert !", already: "Déjà découvert — pas de double comptage",
    noRx: "Aucune réaction…", dailyDone: "Grille du jour terminée !",
    share: "Partager le résultat", close: "Fermer", wall: "Collection", recipes: "Journal des recettes",
    reset: "Réinitialiser la collection", confirm: "Tout EFFACER ? Retappe pour confirmer.",
    dailyTag: "même grille aujourd'hui pour tous", poolNote: "combine uniquement dans la réserve",
    shareText: "Neon Alchemy Quotidien #%d %s %d/%d combos" },
  id: { free: "Kerajinan bebas", daily: "Teka-teki harian", target: "Target", pool: "kumpulan",
    discovered: "ditemukan!", already: "Sudah ditemukan — tidak dihitung ganda",
    noRx: "Tidak ada reaksi…", dailyDone: "Papan hari ini selesai!",
    share: "Bagikan hasil", close: "Tutup", wall: "Koleksi", recipes: "Catatan resep",
    reset: "Reset koleksi", confirm: "Hapus SEMUA? Ketuk lagi untuk konfirmasi.",
    dailyTag: "papan yang sama hari ini untuk semua", poolNote: "gabungkan hanya di dalam kumpulan",
    shareText: "Neon Alchemy Harian #%d %s %d/%d kombo" }
};
function T(k) { return npT(L, k); }"""

JOBS["word-hive/play/js/game.js"] = """var L = {
  en: { daily: "Daily", lib: "Library", zen: "Zen", hint: "💡 Hints", shuffle: "⇄ Shuffle",
    submit: "Submit", deselect: "Deselect", oneAway: "One away...", wrong: "Not quite",
    solvedAll: "Hive complete!", failed: "Out of lives", failedNote: "The board was revealed — retry any time (practice, unranked).",
    winNote: "{m} mistakes{h}. {b}", hintsUsed: ", used hints", share: "Copy result", retry: "Retry",
    close: "Close", left: "left", dailyDone: "Daily cleared ✓", guesses: "Guesses" },
  zh: { daily: "每日精选", lib: "图鉴", zen: "无尽禅", hint: "💡 提示", shuffle: "⇄ 洗牌",
    submit: "提交", deselect: "取消选择", oneAway: "就差一个……", wrong: "不对哦",
    solvedAll: "蜂巢全部点亮！", failed: "体力耗尽", failedNote: "谜底已揭示——随时重试同板（练习模式，不计战绩）。",
    winNote: "{m} 次失误{h}。{b}", hintsUsed: "，用了提示", share: "复制战绩", retry: "重试",
    close: "关闭", left: "剩余", dailyDone: "今日已完成 ✓", guesses: "猜测" },
  es: { daily: "Diario", lib: "Colección", zen: "Zen", hint: "💡 Pistas", shuffle: "⇄ Mezclar",
    submit: "Enviar", deselect: "Quitar selección", oneAway: "Casi…", wrong: "No exactamente",
    solvedAll: "¡Colmena completa!", failed: "Sin vidas", failedNote: "El tablero fue revelado — reintenta cuando quieras (práctica, sin rango).",
    winNote: "{m} errores{h}. {b}", hintsUsed: ", con pistas", share: "Copiar resultado", retry: "Reintentar",
    close: "Cerrar", left: "restantes", dailyDone: "Diario completado ✓", guesses: "Intentos" },
  pt: { daily: "Diário", lib: "Coleção", zen: "Zen", hint: "💡 Dicas", shuffle: "⇄ Embaralhar",
    submit: "Enviar", deselect: "Desmarcar", oneAway: "Quase…", wrong: "Não exatamente",
    solvedAll: "Colmeia completa!", failed: "Sem vidas", failedNote: "O tabuleiro foi revelado — tente quando quiser (prática, sem ranking).",
    winNote: "{m} erros{h}. {b}", hintsUsed: ", com dicas", share: "Copiar resultado", retry: "Tentar de novo",
    close: "Fechar", left: "restantes", dailyDone: "Diário concluído ✓", guesses: "Tentativas" },
  ru: { daily: "Ежедневный", lib: "Коллекция", zen: "Дзен", hint: "💡 Подсказки", shuffle: "⇄ Перемешать",
    submit: "Отправить", deselect: "Снять выбор", oneAway: "Почти…", wrong: "Не совсем",
    solvedAll: "Улей полностью освещён!", failed: "Жизни кончились", failedNote: "Поле раскрыто — переиграйте в любой момент (тренировка, без рейтинга).",
    winNote: "{m} ошибок{h}. {b}", hintsUsed: ", с подсказками", share: "Скопировать результат", retry: "Ещё раз",
    close: "Закрыть", left: "осталось", dailyDone: "Ежедневный пройден ✓", guesses: "Попытки" },
  ja: { daily: "デイリー", lib: "図鑑", zen: "禅モード", hint: "💡 ヒント", shuffle: "⇄ シャッフル",
    submit: "送信", deselect: "選択解除", oneAway: "あと1つ…", wrong: "違いました",
    solvedAll: "ハイブ完成！", failed: "ライフ切れ", failedNote: "盤面が公開されました — いつでも再挑戦できます（練習・ランキング外）。",
    winNote: "{m} ミス{h}。{b}", hintsUsed: "、ヒント使用", share: "結果をコピー", retry: "リトライ",
    close: "閉じる", left: "残り", dailyDone: "デイリー達成 ✓", guesses: "試行" },
  ko: { daily: "일일", lib: "도감", zen: "젠 모드", hint: "💡 힌트", shuffle: "⇄ 섞기",
    submit: "제출", deselect: "선택 해제", oneAway: "하나만 더…", wrong: "아니었네요",
    solvedAll: "벌집 완성!", failed: "목숨 소진", failedNote: "판이 공개되었습니다 — 언제든 다시 도전하세요(연습, 순위 없음).",
    winNote: "실수 {m}번{h}. {b}", hintsUsed: ", 힌트 사용", share: "결과 복사", retry: "재도전",
    close: "닫기", left: "남음", dailyDone: "일일 완료 ✓", guesses: "시도" },
  de: { daily: "Tagesaufgabe", lib: "Bibliothek", zen: "Zen", hint: "💡 Hinweise", shuffle: "⇄ Mischen",
    submit: "Abschicken", deselect: "Abwählen", oneAway: "Ganz nah…", wrong: "Nicht ganz",
    solvedAll: "Bienenstock komplett!", failed: "Keine Leben mehr", failedNote: "Das Brett wurde aufgedeckt — jederzeit erneut versuchen (Übung, ohne Rangliste).",
    winNote: "{m} Fehler{h}. {b}", hintsUsed: ", Hinweise genutzt", share: "Ergebnis kopieren", retry: "Nochmal",
    close: "Schließen", left: "übrig", dailyDone: "Tagesaufgabe geschafft ✓", guesses: "Versuche" },
  fr: { daily: "Quotidien", lib: "Collection", zen: "Zen", hint: "💡 Indices", shuffle: "⇄ Mélanger",
    submit: "Valider", deselect: "Désélectionner", oneAway: "Presque…", wrong: "Pas tout à fait",
    solvedAll: "Ruche complète !", failed: "Plus de vies", failedNote: "La grille a été révélée — réessaie quand tu veux (entraînement, non classé).",
    winNote: "{m} erreurs{h}. {b}", hintsUsed: ", indices utilisés", share: "Copier le résultat", retry: "Réessayer",
    close: "Fermer", left: "restants", dailyDone: "Quotidien terminé ✓", guesses: "Essais" },
  id: { daily: "Harian", lib: "Koleksi", zen: "Zen", hint: "💡 Petunjuk", shuffle: "⇄ Acak",
    submit: "Kirim", deselect: "Batal pilih", oneAway: "Tinggal satu…", wrong: "Belum tepat",
    solvedAll: "Sarang lengkap!", failed: "Kehabisan nyawa", failedNote: "Papan sudah dibuka — coba lagi kapan saja (latihan, tak berperingkat).",
    winNote: "{m} kesalahan{h}. {b}", hintsUsed: ", pakai petunjuk", share: "Salin hasil", retry: "Coba lagi",
    close: "Tutup", left: "sisa", dailyDone: "Harian selesai ✓", guesses: "Percobaan" }
};
function T(k) { return npT(L, k); }"""

ok = 0
for rel, block in JOBS.items():
    p = BASE + "\\" + rel.replace("/", "\\")
    src = io.open(p, encoding="utf-8").read()
    i = src.find("var L = {")
    if i < 0:
        i = src.find("var L={")
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
    # swallow the trailing "function T(k) { return npT(L, k); }" if present right after
    end = src.index(";", j) + 1
    tail = re.match(r"\s*function T\(k\) \{ return npT\(L, k\); \}", src[end:])
    if tail:
        end += tail.end()
    src = src[:i] + block + src[end:]
    io.open(p, "w", encoding="utf-8", newline="\n").write(src)
    ok += 1
    print("patched", rel)

# neon-tide: replace inline zh/en ternary T with 10-way npLang(); NP_L extended separately
p = BASE + r"\neon-tide\play\js\game.js"
src = io.open(p, encoding="utf-8").read()
old_t = re.search(r"const T = \(k\) =>[^\n]+\n", src)
assert old_t, "neon-tide T line not found"
src = src[:old_t.start()] + "const T = (k) => { var d = NP_L[npLang()] || NP_L.en; return d[k] || k; };\n" + src[old_t.end():]
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("patched neon-tide T()")
print("batch3 done:", ok)
