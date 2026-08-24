from PIL import Image
ref=Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')
cap=Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')
# buttons: ref y1540-1740, cap y1330-1530  (offset210)
rc=ref.crop((220,1540,800,1750))
cc=cap.crop((220,1330,800,1540))
from PIL import Image as I
canvas=I.new('RGB',(580,430),(20,20,20))
canvas.paste(rc,(0,0)); canvas.paste(cc,(0,215))
canvas.save('btn.png'); print('ok',rc.size,cc.size)
