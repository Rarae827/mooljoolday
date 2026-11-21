// 곡 데이터 → 재생 이벤트 + 물방울 채보 변환
// 멜로디 표기: "음이름:박자" 를 공백으로 나열. r = 쉼표. 예) "r:.5 A4:.5 D5:1"
// 코드 표기: 한 마디에 "C" 처럼 하나, 또는 "F C" 처럼 여러 개(마디를 균등 분할)

window.SONGS = window.SONGS || {};

const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

// b: 베이스음, v: 기타 보이싱(낮은 음 → 높은 음)
const COMMON_CHORDS = {
  C: { b: 36, v: [48, 55, 60, 64, 67] },
  F: { b: 41, v: [53, 57, 60, 65, 69] },
  G: { b: 43, v: [55, 59, 62, 67, 71] },
  G7: { b: 43, v: [55, 59, 62, 65, 71] },
  Am: { b: 45, v: [57, 60, 64, 69, 72] },
  Dm: { b: 38, v: [50, 57, 62, 65, 69] },
  Em: { b: 40, v: [52, 59, 64, 67, 71] },
  E: { b: 40, v: [52, 56, 59, 64, 68] },
  D: { b: 38, v: [50, 57, 62, 66, 69] },
  D7: { b: 38, v: [50, 57, 60, 66, 69] },
  A: { b: 45, v: [57, 61, 64, 69, 73] },
  Bm: { b: 35, v: [47, 54, 59, 62, 66] },
  'F#m': { b: 42, v: [54, 57, 61, 66, 69] },
};

function noteToMidi(s) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error('잘못된 음 표기: ' + s);
  return 12 * (Number(m[2]) + 1) + NOTE_IDX[m[1]];
}

function parseLine(str) {
  const notes = [];
  let beat = 0;
  for (const tok of (str || '').trim().split(/\s+/).filter(Boolean)) {
    const [n, d] = tok.split(':');
    const dur = parseFloat(d);
    if (n !== 'r') notes.push({ beat, dur, midi: noteToMidi(n) });
    beat += dur;
  }
  return { notes, len: beat };
}

const ARP = [0, 2, 3, 4, 3, 2, 1, 2];

function buildSong(song) {
  const bpb = song.beatsPerBar || 4;
  const chords = Object.assign({}, COMMON_CHORDS, song.chords || {});
  const events = [];
  const chart = [];
  const bars = [];
  let bar0 = 0;
  const push = (beat, type, midi, dur, vel) => events.push({ beat, type, midi, dur, vel });

  song.sections.forEach((sec) => {
    const feel = sec.feel;
    sec.bars.forEach(([chordStr, mel], bi) => {
      const names = chordStr.trim().split(/\s+/);
      names.forEach((n) => { if (!chords[n]) throw new Error(`[${song.id}] 코드 없음: ${n}`); });
      const seg = bpb / names.length;
      const chordAt = (b) => chords[names[Math.min(names.length - 1, Math.floor(b / seg + 1e-6))]];

      const { notes, len } = parseLine(mel);
      if (mel && Math.abs(len - bpb) > 1e-6) console.warn(`[${song.id}] ${feel} ${bi + 1}마디 길이 ${len}박 (기대 ${bpb})`);

      // 멜로디 (피아노)
      const mv = feel === 'intro' ? 0.3 : feel === 'chorus' ? 0.5 : 0.44;
      for (const n of notes) {
        push(bar0 + n.beat, 'piano', n.midi, n.dur, mv);
        if (feel === 'chorus') push(bar0 + n.beat, 'piano', n.midi - 12, n.dur, 0.14);
        if (sec.chart !== false) chart.push({ beat: bar0 + n.beat, midi: n.midi, dur: n.dur, feel });
      }

      // 기타 아르페지오
      const gv = feel === 'intro' ? 0.3 : feel === 'chorus' ? 0.48 : 0.38;
      for (let k = 0; k < bpb * 2; k++) {
        push(bar0 + k * 0.5, 'guitar', chordAt(k * 0.5).v[ARP[k % 8]], 1, gv * (k % 2 ? 0.72 : 1));
      }

      // 베이스
      if (feel !== 'intro') {
        let pat;
        if (bpb === 3) pat = feel === 'chorus' ? [[0, 1], [1, 1], [2, 1]] : [[0, 1.5], [1.5, 1.5]];
        else pat = feel === 'chorus'
          ? [[0, 1.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]]
          : [[0, 2], [2, 1.5], [3.5, 0.5]];
        pat.forEach(([b, d]) => push(bar0 + b, 'bass', chordAt(b).b, d, 0.8));
      }

      // 바이올린
      if (feel === 'pre') push(bar0, 'violin', chordAt(0).v[3], bpb - 0.2, 0.8);
      if (feel === 'chorus') {
        if (bpb === 4) {
          push(bar0, 'violin', chordAt(0).v[3], 1.9, 0.75);
          push(bar0 + 2, 'violin', chordAt(2).v[4], 1.9, 0.75);
        } else {
          push(bar0, 'violin', chordAt(0).v[3], bpb - 0.1, 0.75);
        }
      }
      if (feel === 'outro' && bi === sec.bars.length - 1) push(bar0, 'violin', chordAt(0).v[4], bpb, 0.7);

      // 퍼커션 (soft 곡은 쉐이커만)
      if (feel === 'verse') for (let k = 0; k < bpb; k++) push(bar0 + k + 0.5, 'shaker', 0, 0, 0.5);
      if (feel === 'pre') {
        if (!song.soft) push(bar0, 'kick', 0, 0, 0.35);
        for (let k = 0; k < bpb * 2; k++) push(bar0 + k * 0.5, 'shaker', 0, 0, k % 2 ? 0.6 : 0.35);
      }
      if (feel === 'chorus') {
        if (!song.soft) {
          (bpb === 3 ? [0] : [0, 1.5, 2]).forEach((b) => push(bar0 + b, 'kick', 0, 0, 0.5));
          (bpb === 3 ? [1, 2] : [1, 3]).forEach((b) => push(bar0 + b, 'snap', 0, 0, 0.55));
        }
        for (let k = 0; k < bpb * 2; k++) push(bar0 + k * 0.5, 'shaker', 0, 0, k % 2 ? 0.7 : 0.4);
      }

      bars.push({ start: bar0, feel, chordAt, charted: sec.chart !== false });
      bar0 += bpb;
    });
  });

  events.sort((a, b) => a.beat - b.beat);
  const { notes: finalChart, stats } = buildChart(song, chart, bars, bpb);

  return {
    id: song.id, title: song.title, subtitle: song.subtitle, level: song.level || 1, theme: !!song.theme,
    bpm: song.bpm, events, chart: finalChart, totalBeats: bar0,
    tier: stats.tier, diffLevel: stats.level, stats,
  };
}

// ---------- 채보 생성 ----------
// 난이도(tier)별로 멜로디 사이 빈 박에 반주 리듬 물방울을 채우고, 긴 음은 물뿌리개(롱노트)로 바꿉니다.
const TIERS = {
  // verse/chorus: 한 박 안에서 물방울을 채울 위치(박 단위) · holdMin: 이 박자 이상 긴 음은 물뿌리개
  // wide: 채움 물방울을 반대편으로 크게 튀게 (어려움)
  // 쉬움: 같은 줄 연속음을 물뿌리개로 묶어 '따라가며 머무르기' 위주 (Like a Dino! 느낌)
  // 어려움: 채움 물방울을 늘리고 좌우로 크게 튀게
  // 물방울은 멜로디(실제로 들리는 음)만 따라감 · 억지로 채우지 않음
  // 쉬움: 같은 줄 연속음은 물뿌리개로 묶기 / 보통·어려움: 길게 끄는 음만 물뿌리개
  1: { name: '쉬움', verse: [], chorus: [], mergeRun: 2, holdMin: 1.5, fall: 1.9, wide: false },
  2: { name: '보통', verse: [], chorus: [], mergeRun: 0, holdMin: 2, fall: 1.75, wide: false, twist: true, split: true },
  3: { name: '어려움', verse: [], chorus: [], mergeRun: 0, holdMin: 3, fall: 1.7, wide: false, twist: true, split: true, splitVerseMin: 1 },
};
const MIN_GAP_SEC = 0.12; // 물방울 사이 최소 간격 (1배속)

function buildChart(song, melody, bars, bpb) {
  const tierNo = song.theme ? 2 : Math.max(1, Math.min(3, song.level || 1));
  // 곡별 미세 조정(song.pattern)이 있으면 덮어씀
  const T = Object.assign({}, TIERS[tierNo], song.pattern || {});
  // faithful 곡(테마곡·엘리제)은 멜로디 그대로: 줄 꼬기·박자 쪼개기 안 함
  if (song.faithful) { T.twist = false; T.split = false; }
  const LANES = 5;
  const spb = 60 / song.bpm;
  const chart = melody.slice().sort((a, b) => a.beat - b.beat);

  // 멜로디 음높이 → 5개 라인
  const pitches = [...new Set(chart.map((c) => c.midi))].sort((a, b) => a - b);
  chart.forEach((c) => {
    const rank = pitches.indexOf(c.midi);
    c.lane = Math.min(LANES - 1, Math.floor((rank * LANES) / pitches.length));
  });

  // 줄 순서 살짝 꼬기: 후렴은 좌우를 뒤집어서 같은 멜로디도 다르게 움직이게
  if (T.twist) {
    chart.forEach((c) => { if (c.feel === 'chorus') c.lane = LANES - 1 - c.lane; });
  }

  // 같은 줄에서 쉬지 않고 이어지는 음들 → 물뿌리개 하나로 묶기
  if (T.mergeRun) {
    const merged = [];
    let i = 0;
    while (i < chart.length) {
      let j = i;
      while (j + 1 < chart.length && chart[j + 1].lane === chart[i].lane
        && chart[j + 1].beat - (chart[j].beat + chart[j].dur) < 0.01) j++;
      if (j - i + 1 >= T.mergeRun) {
        const last = chart[j];
        const ticks = chart.slice(i + 1, j + 1).map((n) => ({ beat: n.beat, midi: n.midi }));
        merged.push(Object.assign({}, chart[i], { hold: Math.max(1, last.beat + last.dur - chart[i].beat - 0.4), ticks }));
      } else {
        for (let k = i; k <= j; k++) merged.push(chart[k]);
      }
      i = j + 1;
    }
    chart.length = 0;
    chart.push(...merged);
  }

  // 긴 음 → 물뿌리개 (꾹 머물기)
  if (T.holdMin) {
    chart.forEach((c) => {
      if (!c.hold && c.dur >= T.holdMin) c.hold = Math.max(1, c.dur - 0.5);
    });
  }

  // 박자 쪼개기: 한 박 이상 이어지는 음(물뿌리개 제외) 가운데에 옆 줄 물방울 하나
  // 반주가 치는 8분음표 자리에만, 후렴은 4분음표부터 / 그 외는 점4분음표 이상만
  const splits = [];
  if (T.split) {
    let side = 1;
    chart.forEach((c) => {
      if (c.hold) return;
      const minDur = c.feel === 'chorus' ? 1 : (T.splitVerseMin || 1.5);
      if (c.dur < minDur) return;
      const p = c.beat + Math.floor(c.dur) / 2 >= c.beat + 0.5 ? c.beat + Math.max(0.5, Math.floor(c.dur * 2 / 2) / 2) : null;
      if (p == null || p >= c.beat + c.dur - 1e-6) return;
      let lane = c.lane + side;
      if (lane < 0 || lane > LANES - 1) lane = c.lane - side;
      side = -side;
      splits.push({ beat: p, lane, midi: c.midi, split: true });
    });
    chart.push(...splits);
    chart.sort((a, b) => a.beat - b.beat);
  }

  // 빈 박 채우기 (반주 아르페지오 모양을 따라 물방울이 출렁이게)
  const barAt = (beat) => {
    for (let i = bars.length - 1; i >= 0; i--) if (beat >= bars[i].start - 1e-6) return bars[i];
    return bars[0];
  };
  const lastCharted = bars.filter((b) => b.charted).pop();
  const songEnd = lastCharted ? lastCharted.start + bpb : 0;
  const fills = [];
  const occupied = chart.map((c) => [c.beat, c.beat + (c.hold || 0)]);
  const free = (p) => occupied.every(([s0, e0]) => p < s0 - 0.24 || p > e0 + 0.24);
  const startBeat = chart.length ? chart[0].beat : 0;
  const endBeat = chart.length ? chart[chart.length - 1].beat + (chart[chart.length - 1].hold || 0) : 0;
  for (let beat = Math.floor(startBeat); beat < endBeat; beat++) {
    const b = barAt(beat);
    if (!b.charted) continue;
    const isChorus = b.feel === 'chorus';
    if (!isChorus && T.verseEvery && Math.round(beat - b.start) % T.verseEvery) continue;
    if (isChorus && T.chorusEvery && Math.round(beat - b.start) % T.chorusEvery) continue;
    const pat = isChorus ? T.chorus : T.verse;
    for (const off of pat) {
      if (Math.abs(off * 2 - Math.round(off * 2)) > 1e-6) continue; // 반주가 없는 16분 자리는 쓰지 않음
      const p = beat + off;
      if (p <= startBeat || p >= endBeat || !free(p)) continue;
      const rel = p - b.start;
      let lane = ARP[Math.floor(rel * 2 + 1e-6) % 8];
      fills.push({ beat: p, lane, midi: b.chordAt(rel).v[lane] + 12, fill: true });
    }
  }
  // 너무 촘촘한 채움 제거
  fills.sort((a, b) => a.beat - b.beat);
  const allBeats = chart.map((c) => c.beat);
  const kept = [];
  for (const f of fills) {
    const near = allBeats.concat(kept.map((k) => k.beat)).some((x) => Math.abs(x - f.beat) * spb < MIN_GAP_SEC);
    if (!near) kept.push(f);
  }
  fills.length = 0;
  fills.push(...kept);
  const notes = chart.concat(fills).sort((a, b) => a.beat - b.beat);
  if (T.wide) {
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].fill) notes[i].lane = notes[i - 1].lane <= 2 ? Math.min(4, notes[i - 1].lane + 2 + (i % 2)) : Math.max(0, notes[i - 1].lane - 2 - (i % 2));
    }
  }

  // 짧은 시간에 너무 멀리 움직여야 하는 구간 완화 (1배속 기준 초 단위)
  for (let i = 1; i < notes.length; i++) {
    const prevEnd = notes[i - 1].beat + (notes[i - 1].hold || 0);
    const dt = (notes[i].beat - prevEnd) * spb;
    const maxJump = dt < 0.16 ? 1 : dt < 0.3 ? 2 : dt < 0.45 ? 3 : 4;
    const diff = notes[i].lane - notes[i - 1].lane;
    if (Math.abs(diff) > maxJump) notes[i].lane = notes[i - 1].lane + Math.sign(diff) * maxJump;
  }

  // 체감 난이도 (프로젝트 세카이 레벨을 기준으로 한 대략적인 환산)
  const first = notes.length ? notes[0].beat : 0;
  const last = notes.length ? notes[notes.length - 1].beat + (notes[notes.length - 1].hold || 0) : 1;
  const sec = Math.max(1, (last - first) * spb);
  let move = 0;
  for (let i = 1; i < notes.length; i++) move += Math.abs(notes[i].lane - notes[i - 1].lane);
  const holds = notes.filter((n) => n.hold).length;
  const nps = notes.length / sec;
  const mps = move / sec;
  const level = Math.round(LEVEL_BASE + LEVEL_NPS * nps + LEVEL_MPS * mps + holds * 0.04 + (1.8 - T.fall) * 8);
  return { notes, stats: { tier: tierNo, fall: T.fall, level, nps: +nps.toFixed(2), mps: +mps.toFixed(2), holds, count: notes.length, sec: Math.round(sec) } };
}
const LEVEL_BASE = 10, LEVEL_NPS = 2.6, LEVEL_MPS = 1.3;

window.buildSong = buildSong;
window.TIERS = TIERS;
