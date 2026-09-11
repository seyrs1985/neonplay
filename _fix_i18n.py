p = 'engine/assets/i18n.js'
src = open(p, encoding='utf-8').read()

# 1) cut the three stray id keys out of the runtime function
start = src.index('\n "game.neon-block-blast.title":"Neon Block Blast"')
end = src.index('"Seret dengan mouse atau sentuhan. Papan tombol: Tab pilih bentuk, panah memindahkan, Enter meletakkan."')
end = src.index('\n', end)
stray = src[start:end]
src = src[:start] + src[end:]

# 2) insert them into the id dict after its alchemy.controls line
anchor = '"game.neon-alchemy.controls":"Ketuk atau klik dua chip unsur untuk menggabungkan. Papan tombol: Tab + Enter juga bisa."'
i = src.index(anchor)
line_end = src.index('\n', i)
ins = stray.lstrip('\n')
if not ins.endswith(','):
    ins += ','
src = src[:line_end] + '\n' + ins.rstrip(',') + src[line_end:]
open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('moved id keys; stray preview:', stray[:60].strip())
