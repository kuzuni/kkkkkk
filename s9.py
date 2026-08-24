from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
Image.fromarray(ref[710:810,470:610].astype('uint8')).resize((420,300),Image.NEAREST).save('t_ref.png')
Image.fromarray(cap[500:610,470:610].astype('uint8')).resize((420,330),Image.NEAREST).save('t_cap.png')
# histogram of brightness in title region
for name,img,y0,y1 in [('ref',ref,720,800),('cap',cap,510,600)]:
    reg=img[y0:y1,485:590].reshape(-1,3); b=reg.mean(axis=1)
    print(name,'brightness pct: <40',round((b<40).mean(),3),'40-100',round(((b>=40)&(b<100)).mean(),3),'100-170',round(((b>=100)&(b<170)).mean(),3),'>170',round((b>170).mean(),3))
