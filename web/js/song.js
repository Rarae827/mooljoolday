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
        if (sec.chart !== false) chart.push({ beat: bar0 + n.beat, midi: n.midi });
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

      bar0 += bpb;
    });
  });

  events.sort((a, b) => a.beat - b.beat);
  chart.sort((a, b) => a.beat - b.beat);

  // 음높이 → 5개 라인
  const pitches = [...new Set(chart.map((c) => c.midi))].sort((a, b) => a - b);
  const LANES = 5;
  chart.forEach((c) => {
    const rank = pitches.indexOf(c.midi);
    c.lane = Math.min(LANES - 1, Math.floor((rank * LANES) / pitches.length));
  });

  // 짧은 시간에 너무 멀리 움직여야 하는 구간 완화 (1배속 기준 초 단위)
  const spb = 60 / song.bpm;
  for (let i = 1; i < chart.length; i++) {
    const dt = (chart[i].beat - chart[i - 1].beat) * spb;
    const maxJump = dt < 0.2 ? 1 : dt < 0.36 ? 2 : 4;
    const diff = chart[i].lane - chart[i - 1].lane;
    if (Math.abs(diff) > maxJump) chart[i].lane = chart[i - 1].lane + Math.sign(diff) * maxJump;
  }

  return {
    id: song.id, title: song.title, subtitle: song.subtitle, level: song.level || 1, theme: !!song.theme,
    bpm: song.bpm, events, chart, totalBeats: bar0,
  };
}

window.buildSong = buildSong;
