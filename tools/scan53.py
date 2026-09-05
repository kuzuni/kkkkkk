import sys
from pydep937 import Image
im = Image.open('docs/ref/53-가방팝업.jpg').convert('RGB')
W,H = im.size
px = im.load()
def hx(c): return '#%02X%02X%02X'%c
mode = sys.argv[1]
if mode=='row':
    y=int(sys.argv[2]); x0=int(sys.argv[3]); x1=int(sys.argv[4]); th=int(sys.argv[5]) if len(sys.argv)>5 else 18
    segs=[]; s=x0; prev=px[x0,y]
    for x in range(x0+1,x1+1):
        c=px[x,y]
        if max(abs(c[i]-prev[i]) for i in range(3))>th:
            segs.append((s,x-1,prev)); s=x
        prev=c
    segs.append((s,x1,prev))
    for a,b,c in segs: print(f"{a}..{b} ({b-a+1}) {hx(c)}")
elif mode=='col':
    x=int(sys.argv[2]); y0=int(sys.argv[3]); y1=int(sys.argv[4]); th=int(sys.argv[5]) if len(sys.argv)>5 else 18
    segs=[]; s=y0; prev=px[x,y0]
    for y in range(y0+1,y1+1):
        c=px[x,y]
        if max(abs(c[i]-prev[i]) for i in range(3))>th:
            segs.append((s,y-1,prev)); s=y
        prev=c
    segs.append((s,y1,prev))
    for a,b,c in segs: print(f"{a}..{b} ({b-a+1}) {hx(c)}")
elif mode=='rect':
    x0,y0,x1,y1=map(int,sys.argv[2:6])
    from collections import Counter
    cnt=Counter()
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]; cnt[(c[0]//8*8,c[1]//8*8,c[2]//8*8)]+=1
    t=sum(cnt.values())
    for c,n in cnt.most_common(12): print(f"{hx(c)} {n*100/t:.1f}%")
elif mode=='rowsum':
    # mean brightness per row
    x0=int(sys.argv[2]); x1=int(sys.argv[3]); y0=int(sys.argv[4]); y1=int(sys.argv[5])
    prev=None
    for y in range(y0,y1+1):
        s=sum(sum(px[x,y]) for x in range(x0,x1+1))/(3*(x1-x0+1))
        if prev is None or abs(s-prev)>6:
            print(f"y{y} {s:.1f}")
            prev=s
