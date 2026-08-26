"""120 15회차 — «넣었는데 안 보이는가» 를 재는 자.

LESSONS 120-(2) 1 («구조물을 넣었으면 대비 몇인가를 재라») 을 게이트로 만든 것.
이 작업에서 여덟 번 같은 실수를 했다 — 지표(24×24 std, 평면 비율)가 좋아진 것만 보고
«넣었다» 고 판단했는데 비평가는 매번 그 자리를 «요소 0개» 로 셌다.

그래서 재는 것을 비평가가 실제로 쓴 자와 똑같이 맞춘다:
  A. AH ① 의 자 — 계단 구간에서 «가로 600px 이 완전 단일 휘도인 행» 의 비율
                  (AH 실측 r15: 1600 67% · 1920 66% · 2280 91% · 2600 95%)
  B. AI ③ 의 자 — 같은 구간 행별 가로 표준편차 σx (AI 실측 r15: 0.00)
  C. 대비 — 챌면에 넣은 결이 «보이는 선» 하한(Δ12)을 넘는가, 벽 켜 줄눈(Δ23) 아래인가

실행: python3 tools/flat120.py docs/review/120-r16-2600.png [--json]
"""
import sys, json, zlib, struct

def read_png(path):
    d = open(path,'rb').read(); assert d[:8]==b'\x89PNG\r\n\x1a\n'
    i=8; w=h=bd=ct=None; idat=b''
    while i < len(d):
        ln=struct.unpack('>I',d[i:i+4])[0]; typ=d[i+4:i+8]; data=d[i+8:i+8+ln]; i+=12+ln
        if typ==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',data[:10])
        elif typ==b'IDAT': idat+=data
        elif typ==b'IEND': break
    raw=zlib.decompress(idat); nc={0:1,2:3,3:1,4:2,6:4}[ct]; bpp=nc*(bd//8); stride=w*bpp
    out=bytearray(h*stride); prev=bytearray(stride)
    p=0
    for y in range(h):
        f=raw[p]; p+=1; line=bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for x in range(bpp,stride): line[x]=(line[x]+line[x-bpp])&255
        elif f==2:
            for x in range(stride): line[x]=(line[x]+prev[x])&255
        elif f==3:
            for x in range(stride):
                a=line[x-bpp] if x>=bpp else 0
                line[x]=(line[x]+((a+prev[x])>>1))&255
        elif f==4:
            for x in range(stride):
                a=line[x-bpp] if x>=bpp else 0
                c=prev[x-bpp] if x>=bpp else 0
                b=prev[x]; pa=abs(b-c); pb=abs(a-c); pc=abs(a+b-2*c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        out[y*stride:(y+1)*stride]=line; prev=line
    return w,h,nc,bytes(out)

def lum_rows(path):
    w,h,nc,px=read_png(path); stride=w*nc
    rows=[]
    for y in range(h):
        base=y*stride; r=[]
        for x in range(w):
            o=base+x*nc
            r.append(0.299*px[o]+0.587*px[o+1]+0.114*px[o+2])
        rows.append(r)
    return w,h,rows

def stats(vals):
    n=len(vals); m=sum(vals)/n
    return m,(sum((v-m)**2 for v in vals)/n)**0.5

def main():
    path=sys.argv[1]; asjson='--json' in sys.argv
    w,h,rows=lum_rows(path)
    if len(sys.argv)>3 and sys.argv[2].isdigit():
        y0,y1=int(sys.argv[2]),int(sys.argv[3])
        single=0; sig=[]
        for y in range(y0,y1):
            seg=rows[y][260:820]; m,s2=stats(seg); sig.append(s2)
            if s2<0.05: single+=1
        n=y1-y0
        print(f"{path}  계단 구간 y{y0}..{y1} ({n}행)")
        print(f"  A. 단일값 행(가로 560px std<0.05) : {single}/{n} = {round(100*single/n,1)}%   (AH 자 · r15 목표 <= 35%)")
        print(f"  B. 행별 가로 sigma_x  중앙값 {round(sorted(sig)[n//2],2)} · 평균 {round(sum(sig)/n,2)}   (AI 자 · 목표 >= 4)")
        return
    # 계단 구간 = 접합선 밝은 띠(전폭 L>100) 아래 ~ 수반 상단(전폭에서 밝은 림) 사이.
    # 접합선을 찾는다: x20..1060 평균이 100 넘는 마지막 행(패널 하단 금테 위)
    seam=None
    for y in range(int(h*0.35), int(h*0.92)):
        m,_=stats(rows[y][240:840])
        if m>100: seam=y
    # 수반 상단 = seam 아래에서 폭 400 짜리 밝은 림이 나오는 첫 행
    basin=None
    if seam:
        for y in range(seam+20, h):
            m,_=stats(rows[y][360:720])
            if m>95: basin=y; break
    if not seam or not basin or basin-seam<30:
        print(json.dumps({'file':path,'err':'구간 검출 실패','seam':seam,'basin':basin})); return
    y0,y1=seam+16,basin-2
    single=0; sig=[]
    for y in range(y0,y1):
        seg=rows[y][240:840]; m,s=stats(seg)
        sig.append(s)
        if s<0.05: single+=1
    n=y1-y0
    res={'file':path,'구간':[y0,y1],'행수':n,
         '단일값행':single,'단일값행비율_%':round(100*single/n,1),
         'σx_중앙값':round(sorted(sig)[n//2],2),'σx_평균':round(sum(sig)/n,2),
         'σx_0인행_%':round(100*sum(1 for s in sig if s<0.05)/n,1)}
    if asjson: print(json.dumps(res,ensure_ascii=False))
    else:
        print(f"{path}  계단 구간 y{y0}..{y1} ({n}행)")
        print(f"  A. 단일값 행(가로 600px std<0.05) : {single}/{n} = {res['단일값행비율_%']}%   (AH 자 · 목표 ≤ 35%)")
        print(f"  B. 행별 가로 σx  중앙값 {res['σx_중앙값']} · 평균 {res['σx_평균']}        (AI 자 · 목표 ≥ 4)")
main()
