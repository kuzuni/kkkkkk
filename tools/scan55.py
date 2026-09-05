import sys
from pydep937 import Image
import os
im = Image.open(os.environ.get("IMG","docs/ref/55-설정팝업.jpg")).convert("RGB")
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

elif mode=='bands':
    # detect horizontal bands inside a box: report rows where mean color changes
    x0,y0,x1,y1=map(int,sys.argv[2:6]); th=float(sys.argv[6]) if len(sys.argv)>6 else 8
    prev=None; start=y0
    for y in range(y0,y1+1):
        r=g=b=0; n=x1-x0+1
        for x in range(x0,x1+1):
            c=px[x,y]; r+=c[0]; g+=c[1]; b+=c[2]
        m=(r/n,g/n,b/n)
        if prev is None: prev=m; continue
        if max(abs(m[i]-prev[i]) for i in range(3))>th:
            print(f"y{start}..{y-1} ({y-start}) mean #%02X%02X%02X"%(int(prev[0]),int(prev[1]),int(prev[2])))
            start=y
        prev=m
    print(f"y{start}..{y1} ({y1-start+1}) mean #%02X%02X%02X"%(int(prev[0]),int(prev[1]),int(prev[2])))

elif mode=='dark':
    # rows whose dark-pixel count (lum<th) exceeds min
    x0,y0,x1,y1=map(int,sys.argv[2:6]); th=int(sys.argv[6]); mn=int(sys.argv[7])
    for y in range(y0,y1+1):
        n=0; a=None; b=None
        for x in range(x0,x1+1):
            c=px[x,y]
            if (c[0]*299+c[1]*587+c[2]*114)/1000 < th:
                n+=1
                if a is None: a=x
                b=x
        if n>=mn: print(f"y{y} n={n} x{a}..{b}")

elif mode=='map':
    x0,y0,x1,y1=map(int,sys.argv[2:6]); cw=int(sys.argv[6]); ch=int(sys.argv[7])
    import math
    ny=(y1-y0)//ch; nx=(x1-x0)//cw
    def cls(c):
        r,g,b=c; l=(r*299+g*587+b*114)/1000
        mx=max(r,g,b); mn=min(r,g,b)
        if mx-mn<28: return '#' if l<70 else ('+' if l<150 else ('.' if l<215 else ' '))
        if r>g and g>=b:
            return 'O' if l>140 else 'o'   # orange/brown
        if g>=r and g>b: return 'G' if l>140 else 'g'
        if b>=g and b>r: return 'B' if l>140 else 'b'
        return '?'
    for j in range(ny):
        row=''
        for i in range(nx):
            rr=gg=bb=0; n=0
            for y in range(y0+j*ch, y0+(j+1)*ch, 2):
                for x in range(x0+i*cw, x0+(i+1)*cw, 2):
                    c=px[x,y]; rr+=c[0]; gg+=c[1]; bb+=c[2]; n+=1
            row+=cls((rr//n,gg//n,bb//n))
        print(f"{y0+j*ch:5d} {row}")

elif mode=='bbox':
    # bbox of pixels satisfying a test: dark<th | light>th | hue
    x0,y0,x1,y1=map(int,sys.argv[2:6]); kind=sys.argv[6]; th=int(sys.argv[7])
    ax=ay=10**9; bx=by=-1; n=0
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)/1000
            ok=(l<th) if kind=='dark' else (l>th) if kind=='light' else False
            if kind=='green': ok = c[1]>c[0]+th and c[1]>c[2]+th
            if kind=='blue':  ok = c[2]>c[0]+th and c[2]>c[1]+th
            if ok:
                n+=1
                ax=min(ax,x); bx=max(bx,x); ay=min(ay,y); by=max(by,y)
    if bx<0: print('none')
    else: print(f"x{ax}..{bx} (w{bx-ax+1}) y{ay}..{by} (h{by-ay+1}) n={n}")

elif mode=='corner':
    # for a rect's top-left corner, report first non-bg x at each y
    x0,y0,w=int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]); th=int(sys.argv[5])
    for y in range(y0,y0+w):
        for x in range(x0,x0+w):
            c=px[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)/1000
            if l<th:
                print(f"y{y} firstdark x{x} (+{x-x0})"); break

elif mode=='corner2':
    x0,y0,w=int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]); th=int(sys.argv[5]); step=int(sys.argv[6]) if len(sys.argv)>6 else 1
    for y in range(y0,y0+w,step):
        hit=None
        for x in range(x0,x0+w):
            c=px[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)/1000
            if l>th: hit=x; break
        print(f"y{y} (+{y-y0}) firstlight {hit} (+{hit-x0 if hit else '-'})")

elif mode=='inkcols':
    x0,y0,x1,y1=map(int,sys.argv[2:6]); th=int(sys.argv[6]); gap=int(sys.argv[7]) if len(sys.argv)>7 else 6
    on=[]
    for x in range(x0,x1+1):
        n=0
        for y in range(y0,y1+1):
            c=px[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)/1000
            if l<th: n+=1
        on.append(n>0)
    runs=[]; s=None; last=None
    for i,v in enumerate(on):
        if v:
            if s is None: s=i
            last=i
        else:
            if s is not None and i-last>gap:
                runs.append((s+x0,last+x0)); s=None
    if s is not None: runs.append((s+x0,last+x0))
    for a,b in runs: print(f"x{a}..{b} (w{b-a+1})")

elif mode=='silh':
    x0,y0,x1,y1=map(int,sys.argv[2:6]); th=int(sys.argv[6]); step=int(sys.argv[7]) if len(sys.argv)>7 else 10
    for x in range(x0,x1+1,step):
        top=None; bot=None
        for y in range(y0,y1+1):
            c=px[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)/1000
            if l<th:
                if top is None: top=y
                bot=y
        print(f"x{x} y{top}..{bot} h={(bot-top+1) if top else 0}")

elif mode=='diff':
    # bbox of pixels differing from a given bg colour by > th (manhattan max-channel)
    x0,y0,x1,y1=map(int,sys.argv[2:6]); bg=tuple(int(sys.argv[6][i:i+2],16) for i in (0,2,4)); th=int(sys.argv[7])
    ax=ay=10**9; bx=by=-1
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]
            if max(abs(c[i]-bg[i]) for i in range(3))>th:
                ax=min(ax,x);bx=max(bx,x);ay=min(ay,y);by=max(by,y)
    print('none' if bx<0 else f"x{ax}..{bx} (w{bx-ax+1}) y{ay}..{by} (h{by-ay+1})")
