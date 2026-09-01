import io,re,sys
p='docs/PROGRESS.md'; s=io.open(p,encoding='utf-8').read()
m=re.search(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n', s, re.S)
if not m: print('no conflict'); sys.exit(0)
theirs, mine = m.group(1), m.group(2)
assert 'verify668` [H2]' in mine, mine[:80]
s = s[:m.start()] + theirs + '\n' + mine + '\n' + s[m.end():]
ids=[int(x) for x in re.findall(r'^\| (\d+) \|', s, re.M)]
old=int(re.match(r'\| (\d+) \|', mine).group(1))
new=max(ids)+1
s=s.replace(mine, re.sub(r'^\| \d+ \|', '| %d |'%new, mine), 1)
io.open(p,'w',encoding='utf-8').write(s)
for f in ['docs/review/713-배수토글자리정정.md','docs/PROGRESS.md']:
    t=io.open(f,encoding='utf-8').read()
    t=t.replace('**%d 등재'%old,'**%d 등재'%new).replace('PROGRESS %d 행'%old,'PROGRESS %d 행'%new).replace('곁다리 등재 **%d**'%old,'곁다리 등재 **%d**'%new)
    io.open(f,'w',encoding='utf-8').write(t)
print('renumbered', old, '->', new)
