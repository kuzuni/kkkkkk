from PIL import Image
ref=Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')
cap=Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')
# header band
rc=ref.crop((150,1045,930,1110)).resize((780,65))
cc=cap.crop((150,835,930,900)).resize((780,65))
from PIL import Image as I
c=I.new('RGB',(780,150),(20,20,20)); c.paste(rc,(0,0)); c.paste(cc,(0,75)); c.save('hdr.png')
# Lv pill
rc2=ref.crop((295,940,475,1010))
cc2=cap.crop((295,730,475,800))
c2=I.new('RGB',(180,150),(20,20,20)); c2.paste(rc2,(0,0)); c2.paste(cc2,(0,75)); c2.save('lv.png')
print('ok')
