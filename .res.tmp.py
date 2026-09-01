import io,re,sys
from collections import Counter
p=sys.argv[1]; s=io.open(p,encoding='utf-8').read()
n=0
while True:
    m=re.search(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n', s, re.S)
    if not m: break
    s = s[:m.start()] + m.group(1) + '\n' + m.group(2) + '\n' + s[m.end():]
    n+=1
if p.endswith('PROGRESS.md'):
    lines=s.split('\n')
    ids=[int(x) for x in re.findall(r'^\| (\d+) \|', s, re.M)]
    dup={k for k,v in Counter(ids).items() if v>1}
    keep={d:max([l for l in lines if l.startswith('| %d |'%d)],key=len) for d in dup}
    out=[];seen=set()
    for l in lines:
        m2=re.match(r'\| (\d+) \|', l)
        if m2 and int(m2.group(1)) in dup:
            d=int(m2.group(1))
            if d in seen: continue
            seen.add(d); out.append(keep[d]); continue
        out.append(l)
    s='\n'.join(out)
    print('dedup', sorted(dup))
io.open(p,'w',encoding='utf-8').write(s)
print('resolved',n,'in',p)
