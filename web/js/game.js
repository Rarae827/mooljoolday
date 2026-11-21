// MooljoolDay 리듬게임 메인
(() => {
  const W = 720, H = 1280;
  const LANES = [120, 240, 360, 480, 600];
  const CHAR_Y = 1180, CHAR_S = 0.92;
  const CATCH_Y = CHAR_Y - 150 * CHAR_S; // 화분 뚜껑 높이
  const SPAWN_Y = -60, GROUND_Y = 1186;
  const HIT = 66;                 // 좌우 판정 폭 (px)
  const WIN_EARLY = 0.07, WIN_LATE = 0.09;
  const BASE_FALL = 1.75;         // 1배속 낙하 시간 (초)
  const SPEEDS = [1, 1.2, 1.5, 1.8, 2.1, 2.4];
  const DRAG_SENS = 1.25;
  const SATISFY_COMBO = 10;       // 이 콤보에 도달하면 물방울이 쏙 들어감

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stageEl = document.getElementById('stage');
  const $ = (id) => document.getElementById(id);

  const engine = new AudioEngine();
  const BUILT = {};
  for (const id of SONG_ORDER) if (SONGS[id]) BUILT[id] = buildSong(SONGS[id]);
  let SONG = BUILT[SONG_ORDER[0]];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutBack = (x) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  const speedFor = (laps) => (laps < SPEEDS.length ? SPEEDS[laps] : SPEEDS[SPEEDS.length - 1] + 0.3 * (laps - SPEEDS.length + 1));
  const LEVEL = { 1: ['쉬움', 'lv1'], 2: ['보통', 'lv2'], 3: ['어려움', 'lv3'] };

  // ---------- 최고 기록 (곡별) ----------
  const BEST_KEY = 'mooljoolday.best.v2';
  let bests = {};
  try { bests = JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { bests = {}; }
  const bestOf = (id) => bests[id] || { score: 0, laps: 0 };
  function recordBest(id, score, laps) {
    const b = bestOf(id);
    bests[id] = { score: Math.max(b.score, score), laps: Math.max(b.laps, laps) };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) { /* 무시 */ }
  }

  // ---------- 화면 크기 ----------
  let view = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = window.innerWidth, ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const s = Math.min(cw / W, ch / H);
    view = { scale: s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, dpr, cw, ch };
    stageEl.style.left = view.ox + 'px';
    stageEl.style.top = view.oy + 'px';
    stageEl.style.width = W * s + 'px';
    stageEl.style.height = H * s + 'px';
    stageEl.style.setProperty('--u', s + 'px');
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 상태 ----------
  // state: title | select | intro | play | over
  const G = {
    state: 'title', time: 0,
    score: 0, combo: 0, maxCombo: 0, lives: 3, laps: 0, growth: 0, caught: 0,
    drops: [], lap: null, particles: [], puddles: [],
    banner: null, toast: null, introT: 0, overT: 0, popDone: false, hintA: 0, shake: 0, overShown: false,
    paused: false, resuming: false, resumeT: 0,
  };
  const char = { x: LANES[2], target: LANES[2], vx: 0, tilt: 0, squash: 0, face: 'idle', faceT: 0, walk: 0, pop: 0, popV: 0, popTarget: 0 };

  function setFace(f, sec) {
    char.face = f;
    char.faceT = sec;
  }

  // ---------- 화면(오버레이) 전환 ----------
  const PANELS = ['title', 'select', 'over', 'pause', 'dex'];
  function showPanel(name) {
    for (const p of PANELS) $(p).classList.toggle('show', p === name);
    stageEl.classList.toggle('playing', (G.state === 'play' || G.state === 'intro') && !G.paused);
  }

  // ---------- 입력 ----------
  let dragging = false, lastX = 0;
  const inputBlocked = () => G.paused && !G.resuming;
  const toLogicalX = (clientX) => (clientX - view.ox) / view.scale;
  const moveTarget = (x) => { if (!inputBlocked()) char.target = clamp(x, LANES[0], LANES[4]); };
  const nearestLane = (x) => {
    let bi = 0;
    LANES.forEach((lx, i) => { if (Math.abs(lx - x) < Math.abs(LANES[bi] - x)) bi = i; });
    return bi;
  };
  const isUI = (el) => el && el.closest && el.closest('button, .song-pager, .dex-list');

  window.addEventListener('pointerdown', (e) => {
    if (isUI(e.target)) return;
    dragging = true;
    lastX = e.clientX;
    if (e.pointerType === 'mouse') moveTarget(toLogicalX(e.clientX));
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      if (G.state === 'play' || G.state === 'intro' || dragging) moveTarget(toLogicalX(e.clientX));
      return;
    }
    if (!dragging) return;
    moveTarget(char.target + ((e.clientX - lastX) / view.scale) * DRAG_SENS);
    lastX = e.clientX;
  });
  const endDrag = () => { dragging = false; };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // 줄 키: D F (G·H) J K — e.code 기준이라 한/영 입력 상태와 무관하게 동작
  const LANE_KEYS = { KeyD: 0, KeyF: 1, KeyG: 2, KeyH: 2, KeyJ: 3, KeyK: 4 };
  const LANE_LABELS = ['D', 'F', 'G H', 'J', 'K'];
  const laneFlash = [0, 0, 0, 0, 0];
  let showKeys = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  window.addEventListener('keydown', (e) => {
    const k = e.key, code = e.code;
    if (k === 'Escape' || code === 'KeyP') {
      if (G.paused && !G.resuming) resumeGame();
      else pauseGame();
      return;
    }
    if (code in LANE_KEYS) {
      const lane = LANE_KEYS[code];
      showKeys = true;
      if (!e.repeat) laneFlash[lane] = 1;
      moveTarget(LANES[lane]);
      e.preventDefault();

    } else if (k === 'ArrowLeft') {
      moveTarget(LANES[clamp(nearestLane(char.target) - 1, 0, 4)]);
      e.preventDefault();
    } else if (k === 'ArrowRight') {
      moveTarget(LANES[clamp(nearestLane(char.target) + 1, 0, 4)]);
      e.preventDefault();
    } else if ((k === ' ' || k === 'Enter') && G.state === 'title') {
      showSelect();
    }
  });
  window.addEventListener('touchstart', () => { showKeys = false; }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (G.state === 'play' || G.state === 'intro') pauseGame();
      else engine.suspend();
    } else if (!G.paused) {
      engine.resume();
    }
  });

  // ---------- 식물 도감 ----------
  const PLANTS = Ddam.PLANTS;
  const plantFor = (s) => (s.theme ? 'dew' : ['basil', 'perilla', 'tomato'][clamp(s.level, 1, 3) - 1]);
  const DEX_KEY = 'mooljoolday.dex.v1';
  let dex = {};
  try { dex = JSON.parse(localStorage.getItem(DEX_KEY)) || {}; } catch (e) { dex = {}; }
  const dexStage = (p) => dex[p] || 0;
  function unlockDex(p, stage) {
    if (dexStage(p) >= stage) return false;
    dex[p] = stage;
    try { localStorage.setItem(DEX_KEY, JSON.stringify(dex)); } catch (e) { /* 무시 */ }
    return true;
  }

  // ---------- 곡 선택 (스크롤 + 위/아래 부드럽게 흐려짐) ----------
  function songCard(id, i) {
    const s = BUILT[id];
    const b = bestOf(id);
    const [lvText, lvClass] = LEVEL[s.level] || LEVEL[1];
    const p = plantFor(s);
    const btn = document.createElement('button');
    btn.className = 'song-card' + (s.theme ? ' theme' : '');
    btn.style.setProperty('--i', i);
    btn.innerHTML = `
      <canvas class="sc-icon" aria-label="${PLANTS[p].name}"></canvas>
      <span class="sc-main">
        <b>${s.title}${s.theme ? '<i>테마곡</i>' : ''}</b>
        <span>${s.subtitle || ''}</span>
      </span>
      <span class="sc-side">
        <em class="lv ${lvClass}">${lvText}</em>
        <small>${b.score > 0 ? `최고 ${b.score.toLocaleString()}<br>${b.laps}바퀴` : '기록 없음'}</small>
      </span>`;
    btn.addEventListener('click', () => startGame(id));
    return btn;
  }

  function renderSongList() {
    const list = $('songList');
    list.innerHTML = '';
    list.scrollTop = 0;
    SONG_ORDER.filter((id) => BUILT[id]).forEach((id, i) => list.appendChild(songCard(id, i)));
    list.classList.remove('enter');
    void list.offsetWidth;
    list.classList.add('enter');
    requestAnimationFrame(() => {
      list.querySelectorAll('.song-card').forEach((card) => {
        const id = SONG_ORDER.filter((x) => BUILT[x])[Number(card.style.getPropertyValue('--i'))];
        const cv = card.querySelector('.sc-icon');
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        const c = cv.getContext('2d');
        c.setTransform((dpr * r.width) / 100, 0, 0, (dpr * r.height) / 100, 0, 0);
        Ddam.drawPlantIcon(c, plantFor(BUILT[id]));
      });
      updateListFade();
    });
  }

  function updateListFade() {
    const list = $('songList');
    const top = list.scrollTop > 2;
    const bottom = list.scrollTop + list.clientHeight < list.scrollHeight - 2;
    list.classList.toggle('fade-top', top);
    list.classList.toggle('fade-bottom', bottom);
  }
  $('songList').addEventListener('scroll', updateListFade, { passive: true });
  window.addEventListener('resize', () => { if (G.state === 'select') updateListFade(); });

  // ---------- 도감 화면 ----------
  let dexReturn = 'title';
  function showDex(from) {
    dexReturn = from;
    G.state = 'dex';
    showPanel('dex');
    renderDex();
  }
  function closeDex() {
    if (dexReturn === 'select') showSelect();
    else goTitle();
  }

  function renderDex() {
    const list = $('dexList');
    list.innerHTML = '';
    let found = 0;
    for (const p of Ddam.PLANT_ORDER) {
      const pl = PLANTS[p];
      const open = dexStage(p) >= 1;
      if (open) found++;
      const lv = pl.level ? LEVEL[pl.level] : ['테마곡', 'lv0'];
      const card = document.createElement('div');
      card.className = 'dex-card' + (open ? '' : ' locked');
      card.dataset.plant = p;
      card.innerHTML = `<canvas></canvas><b>${open ? pl.stages[0] : '???'}</b><em class="lv ${lv[1]}">${pl.hint}</em>`;
      list.appendChild(card);
    }
    $('dexCount').textContent = `${found} / ${Ddam.PLANT_ORDER.length} 발견`;
    // 레이아웃이 잡힌 뒤 그림 그리기
    requestAnimationFrame(() => {
      list.querySelectorAll('.dex-card').forEach((card) => {
        const p = card.dataset.plant;
        const cv = card.querySelector('canvas');
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        const c = cv.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const open = dexStage(p) >= 1;
        const s = r.height / 300;
        if (!open) c.globalAlpha = 0.35;
        Ddam.drawDdam(c, { x: r.width / 2, y: r.height - 6, s, face: open ? 'happy' : 'idle', health: 1, growth: open ? 1 : 0, plant: p, time: 1 });
        c.globalAlpha = 1;
        if (!open) {
          c.font = `900 ${r.height * 0.26}px SUIT, sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = 'rgba(255,255,255,.95)';
          c.fillText('?', r.width / 2, r.height * 0.28);
        }
      });
    });
  }


  function showSelect() {
    G.state = 'select';
    G.paused = false;
    G.growth = 0;
    G.lives = 3;
    G.drops = [];
    G.lap = null;
    G.banner = null;
    G.toast = null;
    char.popTarget = 0;
    setFace('idle', 0);
    engine.newRun();
    renderSongList();
    showPanel('select');
  }

  function goTitle() {
    G.state = 'title';
    G.paused = false;
    G.growth = 0;
    G.lives = 3;
    G.drops = [];
    G.lap = null;
    G.banner = null;
    G.toast = null;
    char.popTarget = 0;
    setFace('idle', 0);
    engine.newRun();
    showPanel('title');
  }

  // ---------- 게임 흐름 ----------
  function startGame(id) {
    SONG = BUILT[id || SONG.id];
    engine.init();
    engine.newRun();
    engine.prepare(SONG);
    engine.resetMusic();
    Object.assign(G, {
      state: 'intro', score: 0, combo: 0, maxCombo: 0, lives: 3, laps: 0, growth: 0, caught: 0,
      drops: [], lap: null, banner: null, toast: null, introT: 0, overT: 0, popDone: false, hintA: 0, overShown: false,
      paused: false, resuming: false, resumeT: 0, holdHintShown: false,
    });
    char.pop = 0;
    char.popV = 0;
    char.popTarget = 0;
    setFace('idle', 0);
    showPanel(null);
  }

  function pauseGame() {
    if ((G.state !== 'play' && G.state !== 'intro') || (G.paused && !G.resuming)) return;
    G.paused = true;
    G.resuming = false;
    dragging = false;
    engine.suspend();
    $('pauseSong').textContent = SONG.title;
    showPanel('pause');
  }

  function resumeGame() {
    if (!G.paused) return;
    G.resuming = true;
    G.resumeT = 3;
    showPanel(null);
    stageEl.classList.remove('playing');
  }

  function beginLap(start, mult) {
    const spb = 60 / (SONG.bpm * mult);
    const fall = (SONG.stats ? SONG.stats.fall : BASE_FALL) / Math.pow(mult, 0.8);
    G.lap = { start, mult, spb, fall, evIdx: 0, end: start + SONG.totalBeats * spb };
    G.drops = G.drops.filter((d) => d.st !== 'gone');
    for (const c of SONG.chart) {
      const d = { time: start + c.beat * spb, lane: c.lane, midi: c.midi, x: LANES[c.lane], y: SPAWN_Y, st: 'wait', fall };
      if (c.hold) {
        d.hold = true;
        d.endTime = start + (c.beat + c.hold) * spb;
        d.ticks = (c.ticks || []).map((k) => ({ time: start + k.beat * spb, midi: k.midi }));
        d.tickIdx = 0;
      }
      G.drops.push(d);
    }
  }

  // 받침 유무에 따라 이/가
  const josa = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c % 28 ? '이' : '가'; };

  function lapClear() {
    G.laps++;
    G.growth = Math.min(1, G.laps); // 1바퀴에 꽃·열매가 열리고 이후엔 그대로
    const next = speedFor(G.laps);
    const p = plantFor(SONG);
    const got = PLANTS[p].stages[0];
    const isNew = G.laps === 1 && unlockDex(p, 1);
    G.banner = {
      t: 0,
      big: G.laps === 1 ? '완곡!' : `${G.laps}바퀴 완주!`,
      sub: G.laps === 1 ? `${got}${josa(got)} ${PLANTS[p].harvest === 'tomato' ? '열렸어요' : '피었어요'}!  다음은 x${next.toFixed(1)}` : `더 빠르게!  다음은 x${next.toFixed(1)}`,
      note: isNew ? `NEW  도감에 '${got}' 등록!` : '',
    };
    engine.sfxClear();
    setFace('happy', 1.4);
    char.squash = 1;
    burst(char.x, CHAR_Y - 230 * CHAR_S, 22, ['#FFB3C4', '#FFD45C', '#ffffff'], 520);
    beginLap(engine.now + 0.7, next);
  }

  // ---------- 물뿌리개 (롱노트) ----------
  // 물줄기가 판정선에 닿을 때 밑에 있으면 시작, 물줄기가 끝날 때까지 밑에 머무르면 성공
  function addCombo(points, L) {
    G.combo++;
    G.caught++;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.score = Math.round(G.score + points * (1 + Math.floor(G.combo / 10)) * L.mult);
    if (G.combo >= SATISFY_COMBO) quenched();
  }

  function updateHold(d, t, dt, L) {
    const tailY = CATCH_Y - ((d.endTime - t) / d.fall) * (CATCH_Y - SPAWN_Y);
    const under = Math.abs(d.x - char.x) < HIT * 1.15;
    if (d.st === 'fall') {
      if (!G.holdHintShown) {
        G.holdHintShown = true;
        G.toast = { text: '물뿌리개는 꾹! 따라가요', t: 0, color: '#FFE2B8' };
      }
      if (t >= d.time - WIN_EARLY) { d.st = 'pour'; d.away = 0; }
    }
    if (d.st === 'pour') {
      // 물줄기가 쏟아지는 동안: 밑에 있으면 받고, 벗어났다가 돌아와도 다시 이어서 받을 수 있음
      if (under) {
        if (!d.touched) {
          d.touched = true;
          addCombo(10, L);
          char.squash = 0.6;
          engine.sfxCatch(d.midi);
        } else if (!d.wasUnder) {
          char.squash = Math.max(char.squash, 0.4);
        }
        d.wasUnder = true;
        d.away = 0;
        if (char.face !== 'hurt') setFace('happy', 0.15);
        if (Math.random() < dt * 30) burst(d.x + (Math.random() - 0.5) * 20, CATCH_Y - 4, 1, ['#9CCBFF', '#ffffff'], 260);
      } else if (d.wasUnder) {
        d.away += dt;
        if (d.away > 0.2) {
          // 잠깐 벗어나면 콤보만 끊기고 목숨은 그대로
          d.wasUnder = false;
          G.combo = 0;
        }
      }
      // 물뿌리개 안의 멜로디 음마다 콤보 (노래에서 실제로 들리는 박자)
      while (d.tickIdx < d.ticks.length && t >= d.ticks[d.tickIdx].time) {
        if (under) {
          addCombo(5, L);
          char.squash = Math.max(char.squash, 0.3);
          engine.sfxCatch(d.ticks[d.tickIdx].midi);
        }
        d.tickIdx++;
      }
      if (t >= d.endTime) {
        if (!d.touched) {
          d.st = 'missed';
          loseLife();
          if (G.state !== 'play') return true;
        } else {
          d.st = 'gone';
          if (under) {
            addCombo(20, L);
            char.squash = 0.9;
            burst(char.x, CATCH_Y - 10, 14, ['#9CCBFF', '#FFE2B8', '#ffffff'], 520);
          }
        }
      }
    } else if (d.st === 'missed' && tailY >= GROUND_Y) {
      d.st = 'gone';
    }
    return false;
  }


  function drawHold(d, t) {
    const yOf = (time) => CATCH_Y - ((time - t) / d.fall) * (CATCH_Y - SPAWN_Y);
    const tailY = yOf(d.endTime);
    // 쏟아지는 중: 밑에 있으면 화분으로, 벗어나 있으면 바닥까지
    const headY = d.st === 'pour' ? (d.wasUnder ? CATCH_Y : Math.min(GROUND_Y, yOf(d.time))) : yOf(d.time);
    const dead = d.st === 'missed';
    ctx.save();
    ctx.globalAlpha = dead ? 0.35 : 1;
    // 물줄기
    const top = tailY + 8;
    if (headY > top) {
      const g = ctx.createLinearGradient(d.x - 14, 0, d.x + 14, 0);
      g.addColorStop(0, 'rgba(111,174,240,.55)');
      g.addColorStop(0.5, 'rgba(191,224,255,.95)');
      g.addColorStop(1, 'rgba(111,174,240,.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(d.x - 13, top, 26, headY - top, 13);
      else ctx.rect(d.x - 13, top, 26, headY - top);
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,108,191,.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 흐르는 물결 표시
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -G.time * 220;
      ctx.beginPath();
      ctx.moveTo(d.x, top + 6);
      ctx.lineTo(d.x, headY - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (d.st === 'fall') Ddam.drawWaterDrop(ctx, d.x, headY, 19, 1);
    Ddam.drawWateringCan(ctx, d.x, tailY);
    ctx.restore();
  }

  function thirsty() {
    if (char.popTarget === 1) return;
    char.popTarget = 1;
    G.toast = { text: '목말라요!', t: 0, color: '#CFE6FF' };
    engine.sfxPop();
  }

  function quenched() {
    if (char.popTarget === 0) return;
    char.popTarget = 0;
    G.toast = { text: '촉촉해요!', t: 0, color: '#FFF3C4' };
    engine.sfxHide();
    burst(char.x + 50 * CHAR_S, CATCH_Y, 10, ['#9CCBFF', '#ffffff'], 380);
  }

  function loseLife() {
    G.lives--;
    G.combo = 0;
    G.shake = 0.6;
    setFace('hurt', 0.55);
    engine.sfxMiss();
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(60); } catch (e) { /* 무시 */ }
    if (G.lives <= 0) gameOver();
    else thirsty();
  }

  function gameOver() {
    G.state = 'over';
    G.overT = 0;
    engine.fadeOutMusic(1.2);
    engine.sfxOver();
    setFace('dead', 9999);
    char.popTarget = 1;
    for (const d of G.drops) if (d.st === 'fall') burst(d.x, d.y, 5, ['#7DB3EA'], 200);
    G.drops = [];
    G.toast = null;
    recordBest(SONG.id, G.score, G.laps);
    stageEl.classList.remove('playing');
  }

  function showOverPanel() {
    $('rSong').textContent = SONG.title;
    $('rScore').textContent = G.score.toLocaleString();
    $('rLaps').textContent = G.laps;
    $('rCombo').textContent = G.maxCombo;
    $('rBest').textContent = bestOf(SONG.id).score.toLocaleString();
    showPanel('over');
  }

  // ---------- 파티클 ----------
  function burst(x, y, n, colors, power) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = power * (0.4 + Math.random() * 0.6);
      G.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 3 + Math.random() * 5, life: 0, max: 0.5 + Math.random() * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  // ---------- 업데이트 ----------
  function updateChar(dt) {
    const prev = char.x;
    char.x += (char.target - char.x) * (1 - Math.exp(-dt * 22));
    char.vx = (char.x - prev) / Math.max(dt, 1e-4);
    char.tilt += (clamp(char.vx * 0.00045, -0.22, 0.22) - char.tilt) * (1 - Math.exp(-dt * 12));
    if (Math.abs(char.vx) > 40) char.walk += dt * 18;
    char.squash *= Math.exp(-dt * 9);
    if (char.faceT > 0) {
      char.faceT -= dt;
      if (char.faceT <= 0 && G.state !== 'over') char.face = 'idle';
    }
    if (G.state !== 'intro') {
      // 물방울 스프링 (올라올 땐 통, 들어갈 땐 쏙)
      char.popV += ((char.popTarget - char.pop) * 260 - char.popV * 16) * dt;
      char.pop += char.popV * dt;
      if (char.pop < 0) { char.pop = 0; char.popV = 0; }
    }
  }

  function update(dt) {
    if (G.paused) {
      if (G.resuming) {
        updateChar(dt);
        G.resumeT -= dt;
        if (G.resumeT <= 0) {
          G.paused = false;
          G.resuming = false;
          engine.resume();
          stageEl.classList.add('playing');
        }
      }
      return;
    }

    G.time += dt;
    updateChar(dt);
    for (let i = 0; i < laneFlash.length; i++) laneFlash[i] *= Math.exp(-dt * 9);
    G.shake *= Math.exp(-dt * 8);

    for (const p of G.particles) {
      p.life += dt;
      p.vy += 1400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    G.particles = G.particles.filter((p) => p.life < p.max);
    for (const pd of G.puddles) pd.life += dt;
    G.puddles = G.puddles.filter((pd) => pd.life < 1.4);
    if (G.banner) {
      G.banner.t += dt;
      if (G.banner.t > 3.0) G.banner = null;
    }
    if (G.toast) {
      G.toast.t += dt;
      if (G.toast.t > 1.3) G.toast = null;
    }

    if (G.state === 'intro') updateIntro(dt);
    else if (G.state === 'play') updatePlay(dt);
    else if (G.state === 'over') {
      G.overT += dt;
      if (G.overT > 1.5 && !G.overShown) {
        G.overShown = true;
        showOverPanel();
      }
    }
    if (G.state === 'play' || G.state === 'over') G.introT += dt;
  }

  function updateIntro(dt) {
    G.introT += dt;
    const it = G.introT;
    if (it > 0.55 && !G.popDone) {
      G.popDone = true;
      engine.sfxPop();
      setFace('surprised', 1.5);
      char.squash = 0.9;
    }
    char.pop = it < 0.55 ? 0 : easeOutBack(Math.min(1, (it - 0.55) / 0.35));
    if (it > 2.6) {
      G.state = 'play';
      G.hintA = 1;
      char.popTarget = 1;
      char.popV = 0;
      stageEl.classList.add('playing');
      beginLap(engine.now + 0.12, 1);
    }
  }

  function updatePlay(dt) {
    const now = engine.now;
    const t = now - engine.latency;
    const L = G.lap;

    // 오디오 예약 (0.25초 앞까지)
    const ev = SONG.events;
    while (L.evIdx < ev.length) {
      const e = ev[L.evIdx];
      const time = L.start + e.beat * L.spb;
      if (time > now + 0.25) break;
      if (time >= now - 0.05) engine.play(e, time, L.spb);
      L.evIdx++;
    }

    // 물방울
    for (const d of G.drops) {
      if (d.st === 'gone') continue;
      if (d.st === 'wait') {
        if (t < d.time - d.fall) continue;
        d.st = 'fall';
        if (G.hintA > 0.99) G.hintA = 0.98;
      }
      d.y = CATCH_Y - ((d.time - t) / d.fall) * (CATCH_Y - SPAWN_Y);
      if (d.hold) {
        if (updateHold(d, t, dt, L)) return;
        continue;
      }
      if (d.st === 'fall') {
        if (t >= d.time - WIN_EARLY && Math.abs(d.x - char.x) < HIT) {
          d.st = 'gone';
          G.combo++;
          G.caught++;
          G.maxCombo = Math.max(G.maxCombo, G.combo);
          G.score = Math.round(G.score + 10 * (1 + Math.floor(G.combo / 10)) * L.mult);
          char.squash = 0.7;
          if (char.face !== 'hurt') setFace('happy', 0.3);
          burst(char.x, CATCH_Y - 6, 9, ['#9CCBFF', '#6FAEF0', '#ffffff'], 420);
          engine.sfxCatch(d.midi);
          if (G.combo >= SATISFY_COMBO) quenched();
        } else if (t > d.time + WIN_LATE) {
          d.st = 'miss';
          loseLife();
          if (G.state !== 'play') return;
        }
      } else if (d.st === 'miss' && d.y >= GROUND_Y) {
        d.st = 'gone';
        G.puddles.push({ x: d.x, y: GROUND_Y + 10, life: 0 });
        burst(d.x, GROUND_Y, 7, ['#7DB3EA', '#9B8A6A'], 260);
      }
    }

    if (G.hintA < 0.99) G.hintA = Math.max(0, G.hintA - dt * 0.8);

    if (t > L.end + 0.05 && G.drops.every((d) => d.st === 'gone')) lapClear();
  }

  // ---------- 그리기 ----------
  function bounds() {
    const { scale, ox, oy, cw, ch } = view;
    return { x0: -ox / scale, y0: -oy / scale, x1: (cw - ox) / scale, y1: (ch - oy) / scale };
  }

  const SHADOWS = [[120, 140, 90, 26, 0.6], [520, 90, 110, 30, -0.4], [650, 330, 80, 22, 0.9], [80, 520, 70, 20, -0.7], [600, 620, 90, 24, 0.3], [260, 300, 60, 18, 1.2]];

  function drawBackground() {
    const b = bounds();
    const t = G.time;
    ctx.fillStyle = '#9DB066';
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);

    ctx.fillStyle = '#2F5E3E';
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(520, b.y0);
    ctx.lineTo(520, 0);
    ctx.bezierCurveTo(610, 190, 570, 430, 410, 540);
    ctx.bezierCurveTo(270, 640, 120, 690, b.x0, 780);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#B7C67D';
    ctx.beginPath();
    ctx.moveTo(b.x1, 520);
    ctx.bezierCurveTo(640, 520, 560, 650, 600, 820);
    ctx.bezierCurveTo(630, 940, 690, 1010, b.x1, 1020);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(15,45,22,.09)';
    for (const [x, y, rx, ry, rot] of SHADOWS) {
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 0.5 + x) * 8, y, rx, ry, rot + Math.sin(t * 0.4 + y) * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    // 바닥
    ctx.fillStyle = '#3E6B49';
    ctx.beginPath();
    ctx.moveTo(b.x0, 1168);
    ctx.quadraticCurveTo(360, 1150, b.x1, 1168);
    ctx.lineTo(b.x1, b.y1);
    ctx.lineTo(b.x0, b.y1);
    ctx.closePath();
    ctx.fill();
    const moss = (x, y, r) => {
      ctx.fillStyle = '#5F8C42';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(x + (i - 2) * r * 0.55, y + Math.abs(i - 2) * r * 0.12, r * (0.7 - Math.abs(i - 2) * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7DA757';
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };
    moss(30, 1196, 34);
    moss(700, 1206, 30);
    const peb = (x, y, rx, ry, c) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    peb(560, 1250, 30, 14, '#8C8F86');
    peb(612, 1262, 22, 11, '#A9A79C');
    peb(150, 1258, 24, 11, '#9A9C92');
  }

  function drawKeyLabels() {
    if (!showKeys || !(G.state === 'intro' || G.state === 'play')) return;
    LANES.forEach((x, i) => {
      const lit = laneFlash[i];
      const w = i === 2 ? 76 : 50;
      ctx.fillStyle = `rgba(255,250,240,${0.18 + lit * 0.6})`;
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, 1222, w, 40, 10);
      else ctx.rect(x - w / 2, 1222, w, 40);
      ctx.fill();
      ctx.stroke();
      text(LANE_LABELS[i], x, 1243, 22, { weight: 800, shadow: false, color: lit > 0.3 ? '#2F5E3E' : '#fff' });
    });
  }

  function drawLanes() {
    for (let i = 0; i < LANES.length; i++) {
      const x = LANES[i];
      const g = ctx.createLinearGradient(0, 0, 0, CATCH_Y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(255,255,255,${0.12 + laneFlash[i] * 0.3})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 46, 0, 92, CATCH_Y + 10, 46);
      else ctx.rect(x - 46, 0, 92, CATCH_Y + 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.ellipse(x, CATCH_Y + 4, 38, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawDrops() {
    const t = engine.ctx ? engine.now - engine.latency : 0;
    for (const d of G.drops) if (d.hold && d.st !== 'wait' && d.st !== 'gone') drawHold(d, t);
    for (const d of G.drops) {
      if (d.hold || (d.st !== 'fall' && d.st !== 'miss')) continue;
      Ddam.drawWaterDrop(ctx, d.x, d.y, 19, d.st === 'miss' ? 0.6 : 1);
    }
    for (const pd of G.puddles) {
      ctx.fillStyle = `rgba(90,140,200,${0.45 * (1 - pd.life / 1.4)})`;
      ctx.beginPath();
      ctx.ellipse(pd.x, pd.y, 30 + pd.life * 16, 7 + pd.life * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of G.particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (opt.scale) ctx.scale(opt.scale, opt.scale);
    ctx.globalAlpha = opt.alpha == null ? 1 : opt.alpha;
    ctx.font = `${opt.weight || 800} ${size}px MJRound, SUIT, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = 'middle';
    if (opt.shadow !== false) {
      ctx.shadowColor = 'rgba(0,0,0,.22)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
    }
    ctx.fillStyle = opt.color || '#fff';
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  function drawStar(x, y, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawHUD() {
    if (G.state !== 'play' && G.state !== 'over' && G.state !== 'intro') return;
    text('SCORE', 40, 60, 22, { align: 'left', weight: 700, alpha: 0.85 });
    text(G.score.toLocaleString(), 40, 102, 50, { align: 'left', weight: 900 });

    for (let i = 0; i < 3; i++) Ddam.drawLeafIcon(ctx, 470 + i * 44, 92, 38, i < G.lives);

    const mult = G.lap ? G.lap.mult : 1;
    text(SONG.title, 300, 56, 22, { weight: 700, alpha: 0.85 });
    text(`x${mult.toFixed(1)}`, 300, 90, 28, { weight: 800, alpha: 0.9 });
    const n = Math.min(G.laps, 8);
    for (let i = 0; i < n; i++) drawStar(300 - (n - 1) * 13 + i * 26, 124, 11, '#FFD45C');

    if (G.combo >= 3) {
      const pulse = 1 + char.squash * 0.12;
      text(String(G.combo), 360, 310, 92, { weight: 900, alpha: 0.85, scale: pulse });
      text('COMBO', 360, 376, 26, { weight: 800, alpha: 0.8 });
    }
  }

  function drawTexts() {
    const it = G.introT;
    if (G.paused) {
      if (G.resuming) {
        const n = Math.ceil(G.resumeT);
        const f = G.resumeT - Math.floor(G.resumeT);
        text(String(n), 360, 560, 160, { weight: 900, scale: 0.8 + f * 0.4, alpha: 0.4 + f * 0.6 });
      }
      return;
    }
    if (it > 0 && it < 3.4 && (G.state === 'intro' || G.state === 'play')) {
      const fade = it < 2.5 ? 1 : Math.max(0, 1 - (it - 2.5) / 0.7);
      const pop = (start) => (it < start ? 0 : easeOutBack(Math.min(1, (it - start) / 0.35)));
      const s1 = pop(0.95), s2 = pop(1.1);
      if (s1 > 0) text('지금은', 360, 430, 46, { scale: s1, alpha: fade, weight: 700 });
      if (s2 > 0) text('MooljoolDay!', 360, 525, 96, { scale: s2, alpha: fade, weight: 900 });
    }
    if (G.state === 'play' && G.hintA > 0) {
      text('좌우로 움직여 물방울을 받아요!', 360, 760, 34, { alpha: G.hintA, weight: 700 });
    }
    if (G.banner) {
      const bt = G.banner.t;
      const s = easeOutBack(Math.min(1, bt / 0.4));
      const a = bt < 2.0 ? 1 : Math.max(0, 1 - (bt - 2.0) / 0.6);
      text(G.banner.big, 360, 520, 96, { scale: s, alpha: a, weight: 900 });
      text(G.banner.sub, 360, 610, 34, { alpha: a, weight: 700 });
      if (G.banner.note) text(G.banner.note, 360, 668, 30, { alpha: a, weight: 800, color: '#FFE7A3' });
    }
    if (G.toast) {
      const tt = G.toast.t;
      const s = easeOutBack(Math.min(1, tt / 0.25));
      const a = tt < 0.9 ? 1 : Math.max(0, 1 - (tt - 0.9) / 0.4);
      text(G.toast.text, clamp(char.x, 150, 570), CHAR_Y - 330 - tt * 30, 40, { scale: s, alpha: a, weight: 900, color: G.toast.color });
    }
    if (G.state === 'over' && !G.overShown) {
      text('식물이 죽었습니다...', 360, 520, 60, { alpha: Math.min(1, G.overT / 0.6), weight: 900 });
    }
  }

  function render() {
    const { dpr, scale, ox, oy, cw, ch } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#24432D';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    if (G.shake > 0.02 && !G.paused) ctx.translate((Math.random() - 0.5) * G.shake * 16, (Math.random() - 0.5) * G.shake * 16);

    drawBackground();
    if (G.state === 'intro' || G.state === 'play' || G.state === 'over') drawLanes();
    drawDrops();
    Ddam.drawDdam(ctx, {
      x: char.x, y: CHAR_Y, s: CHAR_S, tilt: char.tilt, squash: char.squash,
      face: char.face, health: G.lives / 3, growth: G.growth, pop: char.pop, plant: plantFor(SONG),
      walk: Math.abs(char.vx) > 40 ? char.walk : 0, time: G.time,
    });
    drawParticles();
    drawKeyLabels();
    drawHUD();
    drawTexts();
  }

  // ---------- 루프 ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  $('btnStart').addEventListener('click', showSelect);
  $('btnDex').addEventListener('click', () => showDex('title'));
  $('btnSelectDex').addEventListener('click', () => showDex('select'));
  $('btnDexBack').addEventListener('click', closeDex);
  // 캔버스용 둥근 한글 폰트 미리 불러오기
  if (document.fonts && document.fonts.load) ['700', '800', '900'].forEach((w) => document.fonts.load(`${w} 20px MJRound`, '가'));
  $('btnSelectBack').addEventListener('click', goTitle);
  $('btnPause').addEventListener('click', pauseGame);
  $('btnResume').addEventListener('click', resumeGame);
  $('btnPauseRetry').addEventListener('click', () => startGame());
  $('btnPauseSelect').addEventListener('click', showSelect);
  $('btnPauseHome').addEventListener('click', goTitle);
  $('btnRetry').addEventListener('click', () => startGame());
  $('btnOverSelect').addEventListener('click', showSelect);
  $('btnHome').addEventListener('click', goTitle);
  requestAnimationFrame(frame);

  // 디버그용 (콘솔에서 상태 확인 / 수동 진행)
  window.__mooljoolday = { G, char, BUILT, engine, get SONG() { return SONG; }, step: (dt) => { update(dt); render(); } };
})();
