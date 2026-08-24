from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def near(A,c,t=26):
    return (np.abs(A-np.array(c)).sum(axis=2)<=t)
HDR=(82,62,61); RIM=(91,70,67); CREAM=(240,217,186); PANEL=(197,176,149)
def bbox(m,label):
    ys,xs=np.where(m)
    if len(ys)==0: print(label,"EMPTY"); return None
    b=(xs.min(),xs.max(),ys.min(),ys.max())
    print(f"{label}: x {b[0]}..{b[1]} (w {b[1]-b[0]+1}) y {b[2]}..{b[3]} (h {b[3]-b[2]+1})  px={m.sum()}")
    return b
print("=== 1. CROSS-CHECK ===")
for nm,A,off in (("REF",ref,0),("CAP",cap,-DY)):
    sub=A[700+off:1700+off,180:900]
    hdr=near(sub,HDR,20)
    # keep largest component rows/cols by column sums
    b=bbox(hdr,f"{nm} header-fill(82,62,61)")
    if b: print(f"   -> abs x {b[0]+180}..{b[1]+180} y {b[2]+700+off}..{b[3]+700+off}")
    cr=near(sub,CREAM,18)
    colsum=cr.sum(axis=0); rowsum=cr.sum(axis=1)
    xs=np.where(colsum>50)[0]; ys=np.where(rowsum>50)[0]
    print(f"   {nm} cream fill: x {xs.min()+180}..{xs.max()+180} (w {xs.max()-xs.min()+1}) y {ys.min()+700+off}..{ys.max()+700+off} (h {ys.max()-ys.min()+1})")
    rm=near(sub,RIM,16)
    b2=bbox(rm,f"{nm} rim(91,70,67)")
    if b2: print(f"   -> abs x {b2[0]+180}..{b2[1]+180} y {b2[2]+700+off}..{b2[3]+700+off}")

print("\n=== precise edges via column/row profiles inside popup band ===")
def prof(A,label,y_hdr,ytop,ybot):
    # horizontal scan across header mid row
    row=A[y_hdr]
    def cls(p):
        if abs(p[0]-82)+abs(p[1]-62)+abs(p[2]-61)<=22: return 'H'
        if abs(p[0]-91)+abs(p[1]-70)+abs(p[2]-67)<=16: return 'R'
        if p.sum()<60: return 'K'
        return '.'
    s=''.join(cls(row[x]) for x in range(230,850))
    print(label,"row",y_hdr,"x230+:",s[:120])
    print(label,"           x730+:",''.join(cls(row[x]) for x in range(730,850)))
for A,ys in ((ref,(800,835,870)),(cap,(590,625,660))):
    nm = "REF" if A is ref else "CAP"
    for y in ys: prof(A,nm,y,0,0)
