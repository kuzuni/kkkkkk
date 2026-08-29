/* 370 재현 — `tools/verify125.js` A1 1건 실패(«소스에 남은 화폐 이모지»)가
 * ⓐ 제품 결함인가 ⓑ 게이트 부패인가를 «가설» 이 아니라 **찍힌 값**으로 가른다 (338 규칙).
 *
 *   node tools/probe370.js
 *
 * 재는 것 —
 *   [1] A1 스캐너를 그대로 돌려 «남은 줄» 이 정말 그 한 줄뿐인지          (등재문 대조)
 *   [2] 그 줄이 만드는 토스트의 **찍힌 DOM** — 🎫 는 몇 개이고, 재화는 무엇으로 나가는가
 *       (125 규약은 «화폐 하나에 이미지 하나» 다. 재화가 curIc() 로 나가면 이 줄은 화폐 표시가 아니다)
 *   [3] 🎫 가 이 게임에서 무엇의 글리프인가 — ▦ 메뉴 «패스» 칸(`data-mn="pass"`, A1 이 이미 면제한 아트 자리)
 *   [4] ⓐ(«문구를 curIc('ticket…') 로 갈아 끼운다») 를 따르면 무엇이 붙는가 — 5종 입장권 아이콘의 실제 용처
 *   [5] 곁다리: F2(«화면 텍스트에 순수 화폐 이모지 0건»)가 ▦ 메뉴를 열면 어떻게 되는가
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* verify125 [A] 와 **같은 전처리·같은 집합**을 쓴다 — 다른 잣대로 재면 재현이 아니다 */
const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
const PURE = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'];
const ART_SLOT = /\b(?:ic|art)\s*:\s*'[^'\s]{1,8}'/g;
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
                            .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));

let pass = 0, fail = 0;
const ok = (b, name, detail) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : '')); b ? pass++ : fail++; };

(async () => {
  /* ── [1] A1 스캐너 재현 ─────────────────────────────────────────────── */
  const BARE = stripComments(SRC);
  const hits = [];
  BARE.split('\n').forEach((ln, i) => {
    if (!CUR_EMOJI.some(e => ln.indexOf(e) >= 0)) return;
    if (!CUR_EMOJI.some(e => ln.replace(ART_SLOT, '').indexOf(e) >= 0)) return;   /* 아트 자리 */
    hits.push({ n: i + 1, t: ln.trim() });
  });
  console.log('[1] 아트 자리 밖에서 화폐 이모지가 남은 줄 ' + hits.length + '개');
  hits.forEach(h => console.log('    ' + h.n + ': ' + h.t.slice(0, 96)));
  const target = hits.filter(h => h.t.indexOf('\u{1F3AB} <b>일괄 받기</b>') >= 0);
  ok(target.length === 1, '[1] 등재문의 그 줄(302 패스 [일괄 받기] 토스트)이 실재한다',
     target.length ? target[0].n + '행' : '없음');

  /* ── 런타임 ────────────────────────────────────────────────────────── */
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 60 })]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ── [2] 그 줄이 찍는 토스트 ──────────────────────────────────────── */
  const toast = await p.evaluate(() => {
    S.pass.got = {}; passTab = 'stage'; openPass('stage');
    const n = (typeof passReadyN === 'function') ? 0 : 0;
    passClaimAll();
    const el = document.querySelector('.fx-toast, .fxtoast, #fxL .toast') ||
               [...document.querySelectorAll('#fxL *')].find(e => (e.textContent || '').indexOf('일괄 받기') >= 0);
    if (!el) return { found: false, layer: document.getElementById('fxL') ? 'fxL 있음' : 'fxL 없음' };
    const html = el.innerHTML, txt = el.innerText || el.textContent || '';
    const cic = [...el.querySelectorAll('img.cic')].map(im => im.dataset.curIc + ':' + im.getAttribute('src'));
    const emo = [];
    for (const e of ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'])
      { let c = 0, k = -1; while ((k = txt.indexOf(e, k + 1)) >= 0) c++; if (c) emo.push(e + '×' + c); }
    return { found: true, txt: txt.replace(/\s+/g, ' ').trim(), html: html.slice(0, 300), cic, emo };
  });
  console.log('[2] 토스트 텍스트: ' + (toast.found ? toast.txt : '(못 찾음 · ' + toast.layer + ')'));
  console.log('    cic 이미지: ' + (toast.cic || []).join(' · '));
  console.log('    남은 이모지: ' + ((toast.emo || []).join(' · ') || '없음'));
  ok(toast.found, '[2] 302 [일괄 받기] 토스트가 실제로 뜬다');
  ok(toast.found && (toast.cic || []).length > 0,
     '[2] 토스트의 **재화**는 curIc() 이미지로 나간다(125 규약 준수)', (toast.cic || []).length + '종');
  ok(toast.found && (toast.emo || []).join('') === '\u{1F3AB}×1',
     '[2] 남은 이모지는 머리글자 🎫 하나뿐(화폐 표시가 아니다)', (toast.emo || []).join(' · '));

  /* ── [3] 🎫 는 «패스» 기능의 글리프다 ──────────────────────────────── */
  const mn = await p.evaluate(() => {
    const i = document.querySelector('[data-mn="pass"] .mn-i');
    const l = document.querySelector('[data-mn="pass"] .mn-l');
    return { ic: i ? i.textContent.trim() : null, label: l ? l.textContent.trim() : null };
  });
  console.log('[3] ▦ 메뉴 «패스» 칸: 아이콘 ' + JSON.stringify(mn.ic) + ' · 라벨 ' + JSON.stringify(mn.label));
  ok(mn.ic === '\u{1F3AB}' && mn.label === '패스',
     '[3] 🎫 = 패스 기능 글리프(A1 이 data-mn="pass" 로 이미 면제한 아트 자리)', mn.ic + ' / ' + mn.label);

  /* ── [4] ⓐ 를 따르면 붙는 것 — 입장권 아이콘의 실제 용처 ───────────
     ⚠ 402 이후 권종은 «계열 5종» 이 아니라 **던전마다 한 장**이다. 목록을 손으로 적으면
       던전이 늘 때마다 뒤처지므로 `DUNGEONS` 에서 뽑는다(`tkRelic` 은 그때 사라진 이름이다). */
  const tk = await p.evaluate(() => {
    const out = {};
    for (const k of DUNGEONS.map(d => dunTk(d.id))) {
      const d = document.createElement('div'); d.innerHTML = curIc(k);
      const im = d.querySelector('img'); out[k] = im ? im.getAttribute('src') : null;
    }
    const dun = (typeof DUNGEONS !== 'undefined' ? DUNGEONS : []).map(d => d.id + ':' + (d.cur || d.k || '?'));
    return { out, dun };
  });
  console.log('[4] curIc 입장권 ' + Object.keys(tk.out).length + '종: ' + Object.entries(tk.out).map(([k, v]) => k + '→' + v).join(' · '));
  console.log('    던전 권종: ' + tk.dun.join(' · '));
  ok(Object.values(tk.out).every(v => v && /cur-ticket-/.test(v)),
     '[4] ⓐ 가 붙일 아이콘은 전부 «던전 입장권» 자산이다(패스 토스트에 쓰면 오표기 — 289·211 판정 계열)',
     Object.values(tk.out).length + '종');

  /* ── [5] 곁다리 — F2 는 ▦ 메뉴를 안 본다 ──────────────────────────── */
  const f2 = await p.evaluate((PURE) => {
    const shut = () => ['closePass', 'closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    shut();
    /* [2] 가 띄운 토스트가 아직 살아 있으면 그것이 자기 🎫 를 다시 읽히게 한다 — 재는 대상은 «메뉴» 다 */
    document.querySelectorAll('.fx-toast').forEach(t => t.remove());
    const who = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const o = [];
      let n; while ((n = w.nextNode())) { if (PURE.some(e => n.nodeValue.indexOf(e) >= 0)) {
        const el = n.parentElement, r = el.getBoundingClientRect();
        o.push(el.tagName + '.' + (el.className || el.id || '?') + '[' + Math.round(r.width) + '×' + Math.round(r.height) + ']'); } } return o; };
    const before = [];
    for (const e of PURE) if ((document.body.innerText || '').indexOf(e) >= 0) before.push(e);
    const beforeWho = who();
    const mb = document.getElementById('menub'); if (mb) mb.click();
    const open = document.getElementById('mnw') && document.getElementById('mnw').classList.contains('on');
    const after = [];
    for (const e of PURE) if ((document.body.innerText || '').indexOf(e) >= 0) after.push(e);
    const afterWho = who();
    if (mb) mb.click();
    return { before, after, open, beforeWho, afterWho };
  }, PURE);
  console.log('[5] ▦ 메뉴 닫힘: ' + (f2.before.join(',') || '0건') + ' ' + JSON.stringify(f2.beforeWho)
    + ' · 열림(' + f2.open + '): ' + (f2.after.join(',') || '0건') + ' ' + JSON.stringify(f2.afterWho));
  ok(f2.before.length === 0, '[5] 메뉴가 닫혀 있으면 F2 대상 이모지 0건(현행 verify125 가 초록인 이유)');

  await b.close();
  console.log('\nPROBE370 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
