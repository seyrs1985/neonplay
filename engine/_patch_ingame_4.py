# -*- coding: utf-8 -*-
"""neon-tide: extend NP_L to 10 languages (dive/howto/credit/best/paused/resume/
quit/score/over/pearls/newbest/retry/menu)."""
import io
import re

p = r"I:\BaiduSyncdisk\Drill\数据报告\game-arcade\engine\assets\games\neon-tide\play\js\game.js"
src = io.open(p, encoding="utf-8").read()

new_np_l = """const NP_L = {
  en: { dive: 'TAP  TO  DIVE', howto: 'hold to rise · release to dive', credit: 'an AI-built arcade · v1.0',
        best: 'BEST', paused: 'PAUSED', resume: 'RESUME', quit: 'QUIT', score: 'score', over: 'WIPED OUT',
        pearls: 'pearls', newbest: '★ NEW BEST ★', retry: 'TAP TO RETRY', menu: 'MENU' },
  zh: { dive: '点按 开始下潜', howto: '按住上浮 · 松开下潜', credit: 'AI 打造的街机 · v1.0',
        best: '最高', paused: '已暂停', resume: '继续', quit: '退出', score: '得分', over: '触礁了',
        pearls: '珍珠', newbest: '★ 新纪录 ★', retry: '点按重试', menu: '菜单' },
  es: { dive: 'TOCA PARA SUMERGIRTE', howto: 'mantén para subir · suelta para bajar', credit: 'un arcade hecho por IA · v1.0',
        best: 'RÉCORD', paused: 'EN PAUSA', resume: 'CONTINUAR', quit: 'SALIR', score: 'puntos', over: 'ARRASADO',
        pearls: 'perlas', newbest: '★ NUEVO RÉCORD ★', retry: 'TOCA PARA REINTENTAR', menu: 'MENÚ' },
  pt: { dive: 'TOQUE PARA MERGULHAR', howto: 'segure para subir · solte para descer', credit: 'um arcade feito por IA · v1.0',
        best: 'RECORDE', paused: 'PAUSADO', resume: 'CONTINUAR', quit: 'SAIR', score: 'pontos', over: 'NAUFRAGOU',
        pearls: 'pérolas', newbest: '★ NOVO RECORDE ★', retry: 'TOQUE PARA TENTAR DE NOVO', menu: 'MENU' },
  ru: { dive: 'ТАП — НЫРНУТЬ', howto: 'держи — всплытие · отпусти — погружение', credit: 'аркада от ИИ · v1.0',
        best: 'РЕКОРД', paused: 'ПАУЗА', resume: 'ДАЛЬШЕ', quit: 'ВЫХОД', score: 'очки', over: 'РАЗБИЛСЯ',
        pearls: 'жемчуг', newbest: '★ НОВЫЙ РЕКОРД ★', retry: 'ТАП — ЕЩЁ РАЗ', menu: 'МЕНЮ' },
  ja: { dive: 'タップでダイブ', howto: '押し続けで上昇 · 離すと降下', credit: 'AI が作ったアーケード · v1.0',
        best: 'ベスト', paused: '一時停止', resume: '再開', quit: '終了', score: 'スコア', over: '墜落…',
        pearls: 'パール', newbest: '★ 新記録 ★', retry: 'タップでリトライ', menu: 'メニュー' },
  ko: { dive: '탭해서 잠수', howto: '길게 누르면 상승 · 놓으면 하강', credit: 'AI가 만든 아케이드 · v1.0',
        best: '최고', paused: '일시정지', resume: '계속하기', quit: '나가기', score: '점수', over: '추락!',
        pearls: '진주', newbest: '★ 신기록 ★', retry: '탭해서 재도전', menu: '메뉴' },
  de: { dive: 'TIPPEN ZUM TAUCHEN', howto: 'halten = steigen · loslassen = sinken', credit: 'ein Arcade-Spiel aus KI-Hand · v1.0',
        best: 'REKORD', paused: 'PAUSIERT', resume: 'WEITER', quit: 'BEENDEN', score: 'Punkte', over: 'ZERSCHELLT',
        pearls: 'Perlen', newbest: '★ NEUER REKORD ★', retry: 'TIPPEN FÜR NEUE RUNDE', menu: 'MENÜ' },
  fr: { dive: 'TAPE POUR PLONGER', howto: 'maintiens pour monter · lâche pour plonger', credit: 'un arcade fabriqué par IA · v1.0',
        best: 'RECORD', paused: 'PAUSE', resume: 'REPRENDRE', quit: 'QUITTER', score: 'points', over: 'ÉCHOUFFONNÉ',
        pearls: 'perles', newbest: '★ NOUVEAU RECORD ★', retry: 'TAPE POUR REJOUER', menu: 'MENU' },
  id: { dive: 'KETUK UNTUK MENYELAM', howto: 'tahan untuk naik · lepas untuk turun', credit: 'arkade buatan AI · v1.0',
        best: 'TERBAIK', paused: 'DIJEDA', resume: 'LANJUT', quit: 'KELUAR', score: 'skor', over: 'TELANJANG',
        pearls: 'mutiara', newbest: '★ REKOR BARU ★', retry: 'KETUK UNTUK ULANG', menu: 'MENU' }
};"""

m = re.search(r"const NP_L = \{.*?\n\};", src, re.S)
assert m, "NP_L block not found"
src = src[:m.start()] + new_np_l + src[m.end():]
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("neon-tide NP_L extended")
