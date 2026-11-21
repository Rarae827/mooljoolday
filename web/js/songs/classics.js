// 저작권이 끝난 클래식 · 민요 · 동요 멜로디
// 멜로디만 원곡을 따르고, 반주(기타/베이스/바이올린/퍼커션)는 자동 편곡됩니다.

(function () {
  // ---------- 작은 별 ----------
  const twinkle = [
    ['C', 'C5:1 C5:1 G5:1 G5:1'],
    ['F C', 'A5:1 A5:1 G5:2'],
    ['F C', 'F5:1 F5:1 E5:1 E5:1'],
    ['G C', 'D5:1 D5:1 C5:2'],
    ['C G', 'G5:1 G5:1 F5:1 F5:1'],
    ['C G', 'E5:1 E5:1 D5:2'],
    ['C G', 'G5:1 G5:1 F5:1 F5:1'],
    ['C G', 'E5:1 E5:1 D5:2'],
    ['C', 'C5:1 C5:1 G5:1 G5:1'],
    ['F C', 'A5:1 A5:1 G5:2'],
    ['F C', 'F5:1 F5:1 E5:1 E5:1'],
    ['G C', 'D5:1 D5:1 C5:2'],
  ];
  SONGS.twinkle = {
    id: 'twinkle', title: '작은 별', subtitle: '반짝반짝 작은 별 · 프랑스 민요', level: 1, bpm: 100,
    sections: [
      { feel: 'intro', chart: false, bars: [['C', 'r:4'], ['G7', 'r:4']] },
      { feel: 'verse', bars: twinkle },
      { feel: 'chorus', bars: twinkle },
      { feel: 'outro', bars: [['C', 'C5:4']] },
    ],
  };

  // ---------- 나비야 ----------
  const butterfly = [
    ['C', 'G5:1 E5:1 E5:2'],
    ['G7', 'F5:1 D5:1 D5:2'],
    ['C', 'C5:1 D5:1 E5:1 F5:1'],
    ['C', 'G5:1 G5:1 G5:2'],
    ['C', 'G5:1 E5:1 E5:1 E5:1'],
    ['G7', 'F5:1 D5:1 D5:1 D5:1'],
    ['C', 'C5:1 E5:1 G5:1 G5:1'],
    ['C', 'E5:1 E5:1 E5:2'],
    ['G7', 'D5:1 D5:1 D5:1 D5:1'],
    ['G7', 'D5:1 E5:1 F5:2'],
    ['C', 'E5:1 E5:1 E5:1 E5:1'],
    ['C G7', 'E5:1 F5:1 G5:2'],
    ['C', 'G5:1 E5:1 E5:2'],
    ['G7', 'F5:1 D5:1 D5:2'],
    ['C', 'C5:1 E5:1 G5:1 G5:1'],
    ['C', 'C5:4'],
  ];
  SONGS.butterfly = {
    id: 'butterfly', title: '나비야', subtitle: '독일 민요', level: 1, bpm: 108,
    sections: [
      { feel: 'intro', chart: false, bars: [['C', 'r:4'], ['G7', 'r:4']] },
      { feel: 'verse', bars: butterfly },
      { feel: 'chorus', bars: butterfly },
      { feel: 'outro', chart: false, bars: [['C', 'r:4']] },
    ],
  };

  // ---------- 생일 축하합니다 (3/4) ----------
  const birthday = [
    ['C', 'r:2 G4:.75 G4:.25'],
    ['C', 'A4:1 G4:1 C5:1'],
    ['G', 'B4:2 G4:.75 G4:.25'],
    ['G7', 'A4:1 G4:1 D5:1'],
    ['C', 'C5:2 G4:.75 G4:.25'],
    ['C', 'G5:1 E5:1 C5:1'],
    ['F', 'B4:1 A4:1 F5:.75 F5:.25'],
    ['C G7', 'E5:1 C5:1 D5:1'],
    ['C', 'C5:3'],
  ];
  SONGS.birthday = {
    id: 'birthday', title: '생일 축하합니다', subtitle: '밀드레드 & 패티 힐', level: 2, bpm: 104, beatsPerBar: 3,
    sections: [
      { feel: 'intro', chart: false, bars: [['C', 'r:3'], ['G7', 'r:3']] },
      { feel: 'verse', bars: birthday },
      { feel: 'chorus', bars: birthday },
      { feel: 'chorus', bars: birthday },
      { feel: 'outro', chart: false, bars: [['C', 'r:3']] },
    ],
  };

  // ---------- 징글벨 ----------
  const jingle = [
    ['C', 'E5:1 E5:1 E5:2'],
    ['C', 'E5:1 E5:1 E5:2'],
    ['C G', 'E5:1 G5:1 C5:1.5 D5:.5'],
    ['C', 'E5:4'],
    ['F', 'F5:1 F5:1 F5:1.5 F5:.5'],
    ['C', 'F5:1 E5:1 E5:1 E5:.5 E5:.5'],
    ['D7 G', 'E5:1 D5:1 D5:1 E5:1'],
    ['G', 'D5:2 G5:2'],
    ['C', 'E5:1 E5:1 E5:2'],
    ['C', 'E5:1 E5:1 E5:2'],
    ['C G', 'E5:1 G5:1 C5:1.5 D5:.5'],
    ['C', 'E5:4'],
    ['F', 'F5:1 F5:1 F5:1.5 F5:.5'],
    ['C', 'F5:1 E5:1 E5:1 E5:.5 E5:.5'],
    ['G7', 'G5:1 G5:1 F5:1 D5:1'],
    ['C', 'C5:4'],
  ];
  SONGS.jingle = {
    id: 'jingle', title: '징글벨', subtitle: '제임스 피어폰트', level: 2, bpm: 120,
    sections: [
      { feel: 'intro', chart: false, bars: [['C', 'r:4'], ['G7', 'r:4']] },
      { feel: 'verse', bars: jingle },
      { feel: 'chorus', bars: jingle },
      { feel: 'outro', chart: false, bars: [['C', 'r:4']] },
    ],
  };

  // ---------- 환희의 송가 ----------
  const ode = [
    ['D', 'F#5:1 F#5:1 G5:1 A5:1'],
    ['A', 'A5:1 G5:1 F#5:1 E5:1'],
    ['D', 'D5:1 D5:1 E5:1 F#5:1'],
    ['D A', 'F#5:1.5 E5:.5 E5:2'],
    ['D', 'F#5:1 F#5:1 G5:1 A5:1'],
    ['A', 'A5:1 G5:1 F#5:1 E5:1'],
    ['D', 'D5:1 D5:1 E5:1 F#5:1'],
    ['A D', 'E5:1.5 D5:.5 D5:2'],
    ['A', 'E5:1 E5:1 F#5:1 D5:1'],
    ['A', 'E5:1 F#5:.5 G5:.5 F#5:1 D5:1'],
    ['A', 'E5:1 F#5:.5 G5:.5 F#5:1 E5:1'],
    ['D A', 'D5:1 E5:1 A4:2'],
    ['D', 'F#5:1 F#5:1 G5:1 A5:1'],
    ['A', 'A5:1 G5:1 F#5:1 E5:1'],
    ['D', 'D5:1 D5:1 E5:1 F#5:1'],
    ['A D', 'E5:1.5 D5:.5 D5:2'],
  ];
  SONGS.ode = {
    id: 'ode', title: '환희의 송가', subtitle: '베토벤 · 교향곡 9번', level: 3, bpm: 116,
    sections: [
      { feel: 'intro', chart: false, bars: [['D', 'r:4'], ['A', 'r:4']] },
      { feel: 'verse', bars: ode },
      { feel: 'chorus', bars: ode },
      { feel: 'outro', chart: false, bars: [['D', 'r:4']] },
    ],
  };

  // ---------- 캐논 ----------
  const canon1 = [
    ['D A', 'F#5:2 E5:2'],
    ['Bm F#m', 'D5:2 C#5:2'],
    ['G D', 'B4:2 A4:2'],
    ['G A', 'B4:2 C#5:2'],
  ];
  const canon2 = [
    ['D A', 'D5:1 F#5:1 A5:1 G5:1'],
    ['Bm F#m', 'F#5:1 D5:1 F#5:1 E5:1'],
    ['G D', 'D5:1 B4:1 D5:1 A4:1'],
    ['G A', 'G4:1 B4:1 A4:1 G4:1'],
  ];
  SONGS.canon = {
    id: 'canon', title: '캐논', subtitle: '파헬벨', level: 1, bpm: 80, soft: true,
    sections: [
      { feel: 'intro', chart: false, bars: [['D A', 'r:4'], ['Bm F#m', 'r:4']] },
      { feel: 'verse', bars: [...canon1, ...canon2] },
      { feel: 'chorus', bars: [...canon1, ...canon2] },
      { feel: 'outro', bars: [['D', 'D5:4']] },
    ],
  };

  // ---------- 엘리제를 위하여 (3/8 → 3박 표기, 0.5박 = 16분음표) ----------
  const elise = [
    ['Am', 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5'],
    ['Am', 'A4:1 r:.5 C4:.5 E4:.5 A4:.5'],
    ['E', 'B4:1 r:.5 E4:.5 G#4:.5 B4:.5'],
    ['Am', 'C5:1 r:.5 E4:.5 E5:.5 D#5:.5'],
    ['Am', 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5'],
    ['Am', 'A4:1 r:.5 C4:.5 E4:.5 A4:.5'],
    ['E', 'B4:1 r:.5 E4:.5 C5:.5 B4:.5'],
  ];
  // 가운데 부분: 음이 한 계단씩 올라가는 밝은 프레이즈 (C → G → Am → E)
  const eliseRise = [
    ['C', 'E5:1.5 G4:.5 F5:.5 E5:.5'],
    ['G', 'D5:1.5 F4:.5 E5:.5 D5:.5'],
    ['Am', 'C5:1.5 E4:.5 D5:.5 C5:.5'],
    ['E', 'B4:1 r:.5 E4:.5 E5:.5 D#5:.5'],
  ];
  SONGS.elise = {
    id: 'elise', title: '엘리제를 위하여', subtitle: '베토벤', level: 3, bpm: 118, beatsPerBar: 3, soft: true,
    sections: [
      { feel: 'intro', chart: false, bars: [['Am', 'r:3'], ['E', 'r:3']] },
      // A: 익숙한 첫 멜로디
      { feel: 'verse', bars: [['Am', 'r:2 E5:.5 D#5:.5'], ...elise, ['Am', 'A4:2 E5:.5 D#5:.5']] },
      // A 반복 → 끝에서 시 도 레로 올라가며 다음 부분으로
      { feel: 'verse', bars: [...elise, ['Am', 'A4:1 r:.5 B4:.5 C5:.5 D5:.5']] },
      // B: 올라가는 부분 두 번
      { feel: 'chorus', bars: [...eliseRise, ...eliseRise] },
      // A로 돌아와 마무리
      { feel: 'chorus', bars: elise },
      { feel: 'outro', bars: [['Am', 'A4:3']] },
    ],
  };
})();

// 곡 선택 화면 순서
// 테마곡은 맨 위, 나머지는 쉬움 → 보통 → 어려움
window.SONG_ORDER = ['mooljoolday', 'twinkle', 'butterfly', 'canon', 'birthday', 'jingle', 'ode', 'elise'];
