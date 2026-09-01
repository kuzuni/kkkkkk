import io,re,sys
p='docs/PROGRESS.md'; s=io.open(p,encoding='utf-8').read()
n=0
while True:
    m=re.search(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n', s, re.S)
    if not m: break
    theirs, mine = m.group(1), m.group(2)
    s = s[:m.start()] + theirs + '\n' + mine + '\n' + s[m.end():]
    n+=1
# 내 새 행 번호가 겹치면 최대+1 로 민다
ids=[int(x) for x in re.findall(r'^\| (\d+) \|', s, re.M)]
from collections import Counter
dup=[k for k,v in Counter(ids).items() if v>1]
for d in sorted(dup):
    rows=[l for l in s.split('\n') if l.startswith('| %d |'%d)]
    for r in rows:
        if 'sess-1628-10305' in r:
            new=max([int(x) for x in re.findall(r'^\| (\d+) \|', s, re.M)])+1
            s=s.replace(r, re.sub(r'^\| \d+ \|', '| %d |'%new, r), 1)
            for f in ['docs/review/713-배수토글자리정정.md','docs/review/735-배수토글기하고정.md','docs/UI-REFERENCE.md','docs/PROGRESS.md']:
                if f=='docs/PROGRESS.md': continue
                t=io.open(f,encoding='utf-8').read()
                t=t.replace('**%d 등재'%d,'**%d 등재'%new).replace('PROGRESS %d 행'%d,'PROGRESS %d 행'%new).replace('등재 **%d**'%d,'등재 **%d**'%new).replace('**%d**(×100'%d,'**%d**(×100'%new).replace('%d 로 등재'%d,'%d 로 등재'%new).replace('잔여 %d'%d,'잔여 %d'%new).replace('= **%d**('%d,'= **%d**('%new)
                io.open(f,'w',encoding='utf-8').write(t)
            print('renumber', d, '->', new)
            break
io.open(p,'w',encoding='utf-8').write(s)
print('conflicts resolved', n)
