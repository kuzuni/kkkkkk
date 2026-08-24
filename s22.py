from PIL import Image
import numpy as np
ref=Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')
cap=Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')
rc=ref.crop((90,700,990,1660))   # 900x960
cc=cap.crop((90,490,990,1450))   # 900x960
canvas=Image.new('RGB',(1820,960),(30,30,30))
canvas.paste(rc,(0,0)); canvas.paste(cc,(920,0))
canvas.save('cmp.png')
print('saved',rc.size,cc.size)
