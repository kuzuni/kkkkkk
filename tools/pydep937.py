# -*- coding: utf-8 -*-
"""작업 937 — 파이썬 자의 공용 의존 부트스트랩 (913 `tools/png913.js` 의 파이썬 짝)

왜 있는가 — 928 회귀 스윕에서 `node tools/verify895.js` 가 **점수 줄 없이 즉사**했다:

    ModuleNotFoundError: No module named 'numpy'   (tools/scan895.py 33행)

`pip3 install pillow numpy` 한 줄 뒤 그 자리에서 **VERIFY895 18/18 PASS** 였다 —
**코드 결함이 아니라 환경 준비**다. 913 이 pngjs 에서 찍은 얼굴과 **글자 그대로 같다**:

  - 날 `import numpy as np` 는 잡히지 않은 예외로 죽어 **종료 코드 1**(= claim.js 규약의 «오류»)에
    스택 트레이스만 남긴다. 점수 줄(`VERIFY895 n/n`)이 **한 줄도 안 나오므로**
    회귀 스윕은 이 자를 «빨강» 이 아니라 **«없는 자»** 로 지나간다.
  - 110 `pwlaunch.pw()`(playwright) 와 913 `png913.js`(pngjs) 는 이미 그 길을 닫아 뒀다 —
    «<모듈> 없음 — <할 일>» 한 줄과 **종료 코드 2**(«환경에 없음», «오류» 와 구분되는 신호)로 답한다.

⇒ 파이썬 쪽도 **같은 말투로** 답하게 한다. 이 파일이 하는 일은 그것뿐이고,
   어떤 자의 측정 로직·점수·판정도 건드리지 않는다.

쓰는 법 (한 줄 치환):
    import numpy as np            →  from pydep937 import np
    from PIL import Image         →  from pydep937 import Image
    from PIL import Image, ImageDraw → from pydep937 import Image, ImageDraw
    from scipy import ndimage     →  from pydep937 import ndimage      (938)
    import soundfile as sf        →  from pydep937 import sf           (938)

`tools/` 안에서 `python3 tools/<자>.py` 로 돌리면 sys.path[0] 이 `tools/` 라 그냥 import 된다.
남이 **모듈로 import 하는 자**(`scan813e` 가 `scan887` 을 읽는다)도 안전하다 —
아래 `__getattr__` 이 **쓰이는 순간에만** 실제 import 를 하기 때문이다(PEP 562).
즉 numpy 만 쓰는 자는 pillow 가 없어도 안 죽고, 그 반대도 같다.

⚠ **913 의 «한 번에» 경고는 여기로 옮기지 마라.** `npm i --no-save` 는 `package.json` 이 없는
   이 저장소에서 따로 부르면 앞 패키지를 지우지만, `pip3 install` 은 그런 함정이 없다 —
   `pillow` 와 `numpy` 는 나눠 깔아도 안전하다(등재 937 의 ⚠ 그대로).
   ⚑ **938 은 그 «나눠 깔아도 안전하다» 위에 서 있다** — 함정이 없으니 무거운 두 의존
   (`scipy`·`soundfile`)을 상시 준비 줄에서 빼고 **부딪히는 자리에서 한 줄로** 깔게 할 수 있다.

약속을 이름으로 지키는 자는 `tools/verify937.js` 다.

⚑ **939 — 종료 코드는 한 가지만 가리켜야 한다.** 937 이 코드 2 를 «환경에 없음» 으로 못 박은 뒤,
   자기 실패(측정 실패·사용법)에도 `sys.exit(2)` 를 쓰던 자 셋(`scan885e`·`scan122`·`scan892`)이
   그 신호를 둘로 갈라 놓고 있었다 — 그 자를 `py()` 로 부르면 **«측정이 안 됐다» 가
   «환경에 없음» 으로 읽힌다**(913 이 경계한 «진짜 오류를 환경 탓으로 삼킨다» 의 얼굴 그대로).
   ⇒ 사전을 여기 한 벌로 둔다(아래 `EX_*`). 자는 자기 실패를 **코드 3** 으로 낸다.

       0 = 통과 · 1 = 오류/FAIL(게이트 판정 포함)
       2 = 환경에 없음 — **이 부트스트랩만** 낸다
       3 = 자가 못 쟀다(측정 실패 · 사용법 · 입력 없음) — 자가 낸다

   ⚠ 코드 3 도 «조용히» 죽으면 안 된다 — `fail()` 은 **무엇이 안 됐는지 + 할 일**을 stderr 에
     한 줄로 적는다(937-② 의 세 번째 축 = «할 일» 은 자리마다 다르다).
"""
import importlib
import sys

PIP = 'pip3 install pillow numpy'

#  ⚑ 939 — 종료 코드 사전(위 도크 참조). 노드 쪽 짝은 `tools/pydep937.js` 의 EX_ENV·EX_SELF 다.
EX_OK = 0
EX_ERR = 1
EX_ENV = 2       # 환경에 없음 — need() 만 낸다
EX_SELF = 3      # 자가 못 쟀다(측정 실패·사용법) — 자가 낸다

#  ⚑ 938 — «할 일» 은 모듈마다 다르다. 상시 준비 줄(PIP)로 낫는 것은 numpy·pillow 뿐이고,
#     그 줄을 무거운 두 의존에 물려 주면 워커는 **적힌 대로 해도 자가 계속 죽는** 자리에 선다
#     (사람이 읽을 문장과 기계가 읽을 코드를 같이 고치라는 937-② 의 세 번째 축 = «할 일» 이다).
SCIPY = 'pip3 install scipy'          # tools/scan885e.py 만 쓴다(885 6회차 셋째 자)
SNDF = 'pip3 install soundfile'       # tools/synth99.py 만 쓴다(99 시전음 합성기)

#  이름 → (실제 모듈 경로, 사람이 부르는 이름, 할 일)
_SPEC = {
    'np':        ('numpy',         'numpy',  PIP),
    'numpy':     ('numpy',         'numpy',  PIP),
    'Image':     ('PIL.Image',     'pillow', PIP),
    'ImageDraw': ('PIL.ImageDraw', 'pillow', PIP),
    'ImageFont': ('PIL.ImageFont', 'pillow', PIP),
    'ImageChops': ('PIL.ImageChops', 'pillow', PIP),
    'ImageFilter': ('PIL.ImageFilter', 'pillow', PIP),
    # ── 조건부(무거운) 의존 — 부르는 자가 한 자씩뿐이라 상시 준비 줄에 안 올린다(등재 938) ──
    'ndimage':   ('scipy.ndimage', 'scipy',      SCIPY),
    'scipy':     ('scipy',         'scipy',      SCIPY),
    'sf':        ('soundfile',     'soundfile',  SNDF),
    'soundfile': ('soundfile',     'soundfile',  SNDF),
}

HINT = {k: '%s 없음 — %s' % (v[1], v[2]) for k, v in _SPEC.items()}


def need(mod, label=None, todo=PIP):
    """모듈째 — 없으면 «환경에 없음»(코드 2)으로 끝낸다. 스택 트레이스가 아니라 할 일을 적는다."""
    try:
        return importlib.import_module(mod)
    except ImportError:
        sys.stderr.write('%s 없음 — %s\n' % (label or mod, todo))
        sys.stderr.flush()
        raise SystemExit(2)


def fail(what, todo=None, code=EX_SELF):
    """939 — «자가 못 쟀다» 를 한 줄로 적고 코드 3 으로 끝낸다.

    코드 2 를 쓰면 그 자를 부른 노드가 «환경에 없음» 으로 읽어 스윕이 «없는 자» 로 지나간다.
    `todo` 는 **이 자리에서 실제로 해야 할 일**이다(상시 준비 줄을 답으로 주지 마라 — 938-③).
    """
    sys.stderr.write('%s%s\n' % (what, (' — ' + todo) if todo else ''))
    sys.stderr.flush()
    raise SystemExit(code)


def available(name):
    """죽이지 않고 묻기만 한다 — 폴백을 가진 자와 `verify937` 이 쓴다."""
    spec = _SPEC.get(name)
    mod = spec[0] if spec else name
    try:
        importlib.import_module(mod)
        return True
    except ImportError:
        return False


def __getattr__(name):
    """PEP 562 — `from pydep937 import np` 가 여기로 온다. **쓰는 순간에만** 진짜 import 한다."""
    spec = _SPEC.get(name)
    if spec is None:
        raise AttributeError('pydep937 에 %r 은 없다 — need(<모듈>) 를 직접 불러라' % name)
    path, label, todo = spec
    mod = need(path, label, todo)
    globals()[name] = mod          # 두 번째부터는 이 함수를 안 지난다
    return mod
