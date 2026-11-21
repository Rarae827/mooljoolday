// 땀땀이 캐릭터 + 물방울 그리기 (캔버스 벡터)
// 기준점: 발바닥 가운데 (0,0). 화분 윗면(뚜껑)은 y = -150.

(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
  };

  const INK = '#3A382F';
  const OUTLINE = '#C9975E';

  function dropPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y - r * 1.75);
    c.bezierCurveTo(x + r * 0.35, y - r * 1.1, x + r, y - r * 0.55, x + r, y);
    c.arc(x, y, r, 0, Math.PI, false);
    c.bezierCurveTo(x - r, y - r * 0.55, x - r * 0.35, y - r * 1.1, x, y - r * 1.75);
    c.closePath();
  }

  function drawWaterDrop(c, x, y, r, alpha = 1) {
    c.save();
    c.globalAlpha = alpha;
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.6);
    g.addColorStop(0, '#BFE0FF');
    g.addColorStop(0.45, '#6FAEF0');
    g.addColorStop(1, '#3D7FD6');
    dropPath(c, x, y, r);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = Math.max(2, r * 0.12);
    c.strokeStyle = '#2E6CBF';
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath();
    c.ellipse(x - r * 0.38, y - r * 0.15, r * 0.16, r * 0.32, -0.35, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function leafPath(c, len, w) {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.2, -w * 1.15, len * 0.95, -w * 1.05, len, 0);
    c.bezierCurveTo(len * 0.95, w * 1.05, len * 0.2, w * 1.15, 0, 0);
    c.closePath();
  }

  // ---------- 식물 도감 데이터 ----------
  // 실제 MooljoolDay 키트 씨앗(바질·들깨·초소형 토마토) + 테마곡 전용 물방울꽃
  const PLANTS = {
    basil: {
      name: '바질', level: 1, hint: '쉬움 곡',
      flower: { petal: '#FFFFFF', edge: '#A39A86', center: '#F3E39A', n: 5, r: 12, type: 'spike' },
      harvest: 'basil', stages: ['바질꽃'],
    },
    perilla: {
      name: '들깨', level: 2, hint: '보통 곡',
      flower: { petal: '#E6CEF6', edge: '#9C78BF', center: '#FFF3D2', n: 5, r: 12, type: 'raceme' },
      harvest: 'perilla', stages: ['들깨꽃'],
    },
    tomato: {
      name: '초소형 토마토', level: 3, hint: '어려움 곡',
      flower: { petal: '#FFD84D', edge: '#DDA91C', center: '#F29A1F', n: 5, r: 10, type: 'star' },
      harvest: 'tomato', stages: ['방울토마토'],
    },
    dew: {
      name: '물방울꽃', level: 0, hint: 'MooljoolDay 테마곡',
      flower: { petal: '#A9D5FF', edge: '#5C9BE4', center: '#FFFFFF', n: 6, r: 11, type: 'drop' },
      harvest: 'dew', stages: ['물방울꽃'],
    },
  };
  const PLANT_ORDER = ['basil', 'perilla', 'tomato', 'dew'];

  function drawFlower(c, x, y, r, wilt, spec) {
    const f = spec || PLANTS.tomato.flower;
    const petal = mix(f.petal, '#C9A98A', wilt);
    const edge = mix(f.edge, '#9C7E60', wilt);
    const center = mix(f.center, '#B59A5A', wilt);
    const stem = mix('#5DAA5C', '#9C8A55', wilt);
    c.save();
    c.translate(x, y);
    c.lineWidth = Math.max(1.5, r * 0.22);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    if (f.type === 'spike') {
      // 바질꽃: 꼿꼿한 꽃대에 층층이 달린 작은 하얀 입술 모양 꽃
      c.strokeStyle = stem;
      c.beginPath();
      c.moveTo(0, r * 1.1);
      c.lineTo(0, -r * 2.05);
      c.stroke();
      // 떡잎에 겹치지 않도록 꽃은 꽃대 윗부분에만
      const tiers = [[-r * 0.1, 1], [-r * 0.85, 0.85], [-r * 1.55, 0.7]];
      for (const [ty, sc] of tiers) {
        for (const sx of [-1, 1]) {
          c.save();
          c.translate(sx * r * 0.42 * sc, ty);
          c.rotate(sx * 0.5);
          c.fillStyle = mix('#8BC47A', '#A88B4E', wilt);
          c.beginPath();
          c.ellipse(0, r * 0.18, r * 0.22 * sc, r * 0.2 * sc, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = petal;
          c.strokeStyle = edge;
          c.lineWidth = Math.max(1.2, r * 0.14);
          c.beginPath();
          c.ellipse(sx * r * 0.12, -r * 0.08, r * 0.38 * sc, r * 0.3 * sc, 0, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.beginPath();
          c.ellipse(sx * r * 0.28, r * 0.12, r * 0.2 * sc, r * 0.14 * sc, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      c.fillStyle = mix('#8BC47A', '#A88B4E', wilt);
      c.beginPath();
      c.ellipse(0, -r * 2.15, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
      c.fill();
    } else if (f.type === 'raceme') {
      // 들깨꽃: 휘어진 꽃대에 보라 꽃받침 + 연보라 종 모양 꽃이 조롱조롱
      c.strokeStyle = stem;
      c.beginPath();
      // 꽃대 시작점을 x=0 (아래 줄기와 같은 위치)에 맞춤
      c.moveTo(0, r * 1.0);
      c.bezierCurveTo(0, -r * 0.6, r * 0.2, -r * 1.3, r * 1.2, -r * 1.05);
      c.stroke();
      const calyx = mix('#7E5A9E', '#7A6436', wilt);
      for (let k = 0; k < 5; k++) {
        const t = 0.42 + k * 0.145;
        const u = 1 - t; const px = 3 * u * t * t * (r * 0.2) + t * t * t * (r * 1.2);
        const py = u * u * u * (r * 1.0) + 3 * u * u * t * (-r * 0.6) + 3 * u * t * t * (-r * 1.3) + t * t * t * (-r * 1.05);
        const s = 1 - k * 0.1;
        c.fillStyle = calyx;
        c.beginPath();
        c.ellipse(px, py + r * 0.12, r * 0.2 * s, r * 0.26 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = petal;
        c.strokeStyle = edge;
        c.lineWidth = Math.max(1.2, r * 0.13);
        c.beginPath();
        c.moveTo(px - r * 0.26 * s, py + r * 0.3);
        c.quadraticCurveTo(px, py + r * 0.95 * s, px + r * 0.26 * s, py + r * 0.3);
        c.closePath();
        c.fill();
        c.stroke();
      }
    } else if (f.type === 'drop') {
      // 물방울꽃: 꽃잎 하나하나가 물방울 모양, 가운데 반짝임
      for (let k = 0; k < f.n; k++) {
        const a = (k / f.n) * Math.PI * 2 - Math.PI / 2;
        c.save();
        c.rotate(a + Math.PI / 2);
        c.translate(0, -r * 0.95);
        const g = c.createRadialGradient(-r * 0.15, -r * 0.1, r * 0.05, 0, 0, r * 0.7);
        g.addColorStop(0, mix('#E6F3FF', '#D8C7A8', wilt));
        g.addColorStop(1, petal);
        c.beginPath();
        c.moveTo(0, r * 0.75);
        c.bezierCurveTo(r * 0.2, r * 0.45, r * 0.48, r * 0.15, r * 0.48, -r * 0.1);
        c.arc(0, -r * 0.1, r * 0.48, 0, Math.PI, true);
        c.bezierCurveTo(-r * 0.48, r * 0.15, -r * 0.2, r * 0.45, 0, r * 0.75);
        c.closePath();
        c.fillStyle = g;
        c.globalAlpha = 0.92;
        c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = edge;
        c.lineWidth = Math.max(1.2, r * 0.12);
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,.85)';
        c.beginPath();
        c.ellipse(-r * 0.16, -r * 0.22, r * 0.09, r * 0.15, -0.4, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.fillStyle = center;
      c.beginPath();
      c.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = mix('#FFE27A', '#B59A5A', wilt);
      c.lineWidth = Math.max(1.2, r * 0.1);
      c.beginPath();
      c.moveTo(0, -r * 0.2); c.lineTo(0, r * 0.2);
      c.moveTo(-r * 0.2, 0); c.lineTo(r * 0.2, 0);
      c.stroke();
    } else {
      // 토마토꽃: 뒤로 젖혀진 뾰족한 노란 별꽃 + 가운데 원뿔
      c.lineWidth = Math.max(1.2, r * 0.18);
      for (let k = 0; k < f.n; k++) {
        const a = (k / f.n) * Math.PI * 2 - Math.PI / 2;
        c.save();
        c.rotate(a);
        c.beginPath();
        c.moveTo(r * 0.2, -r * 0.3);
        c.quadraticCurveTo(r * 0.9, -r * 0.35, r * 1.35, 0);
        c.quadraticCurveTo(r * 0.9, r * 0.35, r * 0.2, r * 0.3);
        c.closePath();
        c.fillStyle = petal;
        c.fill();
        c.strokeStyle = edge;
        c.stroke();
        c.restore();
      }
      c.fillStyle = center;
      c.beginPath();
      c.moveTo(0, -r * 0.55);
      c.lineTo(r * 0.32, r * 0.25);
      c.lineTo(-r * 0.32, r * 0.25);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  // 큰 잎 (바질: 반들반들한 타원 / 들깨: 톱니 있는 하트형 깻잎)
  function drawBigLeaf(c, x, y, ang, kind, wilt) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const len = kind === 'perilla' ? 34 : 30;
    const w = kind === 'perilla' ? 19 : 14;
    c.beginPath();
    if (kind === 'perilla') {
      c.moveTo(0, 0);
      const steps = 7;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const hw = Math.sin(Math.PI * Math.min(1, t * 1.15)) * w * (s % 2 ? 1.08 : 0.92);
        c.lineTo(len * t, -hw);
      }
      for (let s = steps - 1; s >= 1; s--) {
        const t = s / steps;
        const hw = Math.sin(Math.PI * Math.min(1, t * 1.15)) * w * (s % 2 ? 1.08 : 0.92);
        c.lineTo(len * t, hw);
      }
      c.closePath();
    } else {
      leafPath(c, len, w);
    }
    const g = c.createLinearGradient(0, -w, 0, w);
    if (kind === 'perilla') {
      g.addColorStop(0, mix('#4FA35A', '#A88B4E', wilt));
      g.addColorStop(1, mix('#7E5A9E', '#7A6436', wilt));
    } else {
      g.addColorStop(0, mix('#A6E58F', '#CDB574', wilt));
      g.addColorStop(1, mix('#47A84F', '#A88B4E', wilt));
    }
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 2.6;
    c.strokeStyle = mix(kind === 'perilla' ? '#2F6E3A' : '#2F8A3E', '#7A6436', wilt);
    c.stroke();
    c.globalAlpha = 0.4;
    c.beginPath();
    c.moveTo(3, 0);
    c.lineTo(len * 0.8, 0);
    c.stroke();
    if (kind === 'basil') {
      c.globalAlpha = 0.55;
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(len * 0.45, -w * 0.4, len * 0.16, w * 0.14, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawHarvest(c, kind, wilt) {
    if (kind === 'tomato') {
      drawTomato(c, -27, 27, 9, wilt);
      drawTomato(c, 27, 27, 9, wilt);
    } else if (kind === 'basil' || kind === 'perilla') {
      drawBigLeaf(c, -6, 8, Math.PI - 0.15, kind, wilt);
      drawBigLeaf(c, 6, 8, 0.15, kind, wilt);
    } else if (kind === 'dew') {
      for (const sx of [-1, 1]) {
        c.strokeStyle = mix('#5FAE5E', '#9C8A55', wilt);
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(sx * 14, 6);
        c.quadraticCurveTo(sx * 26, 8, sx * 27, 22);
        c.stroke();
        drawWaterDrop(c, sx * 27, 36, 9, 1 - wilt * 0.5);
        c.fillStyle = 'rgba(255,255,255,.9)';
        c.beginPath();
        c.arc(sx * 27 + 5, 28, 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawTomato(c, x, y, r, wilt, unripe) {
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = mix(unripe ? '#9BCB5E' : '#EC5B4E', '#9A6B4C', wilt);
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = mix(unripe ? '#5E8F37' : '#B73D35', '#6E4E38', wilt);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath();
    c.ellipse(-r * 0.35, -r * 0.3, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#4E9E52';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      c.moveTo(0, -r * 0.9);
      c.lineTo(Math.cos(a) * r * 0.5, -r * 0.9 + Math.sin(a) * r * 0.3);
    }
    c.stroke();
    c.restore();
  }

  function bodyPath(c) {
    c.beginPath();
    c.moveTo(-80, -150);
    c.bezierCurveTo(-96, -122, -101, -62, -93, -36);
    c.bezierCurveTo(-87, -17, -60, -13, 0, -13);
    c.bezierCurveTo(60, -13, 87, -17, 93, -36);
    c.bezierCurveTo(101, -62, 96, -122, 80, -150);
    c.closePath();
  }

  // 휘어진 줄기에 방울토마토가 조롱조롱 매달림
  function drawTomatoVine(c, side, n, unripe, wilt, stemCol) {
    const P0 = [0, -3], P1 = [side * 4, -72], P2 = [side * 54, -56];
    const at = (t) => [
      (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
      (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
    ];
    c.strokeStyle = stemCol;
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(P0[0], P0[1]);
    c.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]);
    c.stroke();
    const pts = [];
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.7 : 0.4 + (k / (n - 1)) * 0.6;
      pts.push(at(t));
    }
    c.lineWidth = 2.5;
    c.beginPath();
    for (const [x, y] of pts) { c.moveTo(x, y); c.lineTo(x, y + 8); }
    c.stroke();
    pts.forEach(([x, y], k) => drawTomato(c, x, y + 17, 10.5 - k * 0.3, wilt, unripe));
  }

  function drawSprout(c, o, h) {
    const t = o.time || 0;
    const wilt = 1 - h;
    c.save();
    c.translate(0, -150);
    c.rotate(Math.sin(t * 1.8) * 0.05 - (o.tilt || 0) * 0.9 + wilt * 0.55);

    c.strokeStyle = mix('#5DAA5C', '#9C8A55', wilt);
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-4, -24, 0, -50);
    c.stroke();

    c.translate(0, -52);
    const f1 = mix('#93D683', '#CDB574', wilt);
    const f2 = mix('#5FAE5E', '#A88B4E', wilt);
    const st = mix('#3F8B46', '#7A6436', wilt);
    const droop = wilt * 0.55;
    const growth = o.growth || 0;
    // 잎은 어느 단계에서나 떡잎 2장
    const leaves = [
      [-0.38 + droop, 40, 21],
      [-Math.PI + 0.38 - droop, 40, 21],
    ];
    for (const [a, len, w] of leaves) {
      c.save();
      c.rotate(a);
      leafPath(c, len, w);
      const lg = c.createLinearGradient(0, -w, 0, w);
      lg.addColorStop(0, f1);
      lg.addColorStop(1, f2);
      c.fillStyle = lg;
      c.fill();
      c.lineWidth = 3.2;
      c.strokeStyle = st;
      c.stroke();
      c.globalAlpha = 0.35;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(5, 0);
      c.lineTo(len * 0.72, 0);
      c.stroke();
      c.restore();
    }

    const g = growth;
    const plant = PLANTS[o.plant] || PLANTS.tomato;
    const stemCol = mix('#4E9E52', '#9C8A55', wilt);
    if (plant.harvest === 'tomato') {
      // 토마토: 휘어진 줄기를 따라 토마토가 와다다
      if (g >= 1) drawTomatoVine(c, 1, 4, false, wilt, stemCol);
    } else if (g >= 1) {
      const fr = plant.flower.r;
      // 바질·들깨는 꽃대가 떡잎 마디에서 바로 시작 (따로 줄기 없음)
      const type = plant.flower.type;
      const fromKnot = type === 'raceme' || type === 'spike';
      const k0 = type === 'raceme' ? 2.5 : 2.1;
      const base = type === 'raceme' ? 1.0 : 1.1;
      const spots = fromKnot ? [[0, -3 - fr * k0 * base, k0]] : [[0, -46, 1.8]];
      c.strokeStyle = fromKnot ? 'transparent' : stemCol;
      c.lineWidth = 3.5;
      c.lineCap = 'round';
      c.beginPath();
      for (const [fx, fy] of spots) {
        c.moveTo(0, -3);
        c.quadraticCurveTo(fx * 0.35, fy * 0.9, fx, fy + fr * 0.6);
      }
      c.stroke();
      for (let i = spots.length - 1; i >= 0; i--) {
        const [fx, fy, k] = spots[i];
        drawFlower(c, fx, fy, fr * k, wilt, plant.flower);
      }
    }

    c.beginPath();
    c.arc(0, 0, 4.5, 0, Math.PI * 2);
    c.fillStyle = f2;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = st;
    c.stroke();
    c.restore();
  }

  function drawFace(c, o) {
    const t = o.time || 0;
    const face = o.face || 'idle';
    c.fillStyle = INK;
    c.strokeStyle = INK;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // 볼터치
    c.fillStyle = face === 'dead' ? 'rgba(220,170,160,.45)' : 'rgba(244,166,156,.85)';
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(sx * 52, -73, 13, 7.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = INK;

    if (face === 'happy') {
      c.lineWidth = 5;
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.arc(sx * 30, -86, 8, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(-13, -78);
      c.quadraticCurveTo(0, -56, 13, -78);
      c.closePath();
      c.fill();
      // 혀는 입 안쪽에만 보이도록 입 모양으로 잘라서 그림
      c.save();
      c.clip();
      c.fillStyle = '#F08E8E';
      c.beginPath();
      c.ellipse(0, -67, 6, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    } else if (face === 'hurt') {
      c.lineWidth = 4.5;
      c.beginPath();
      c.moveTo(-37, -99); c.lineTo(-25, -92); c.lineTo(-37, -85);
      c.moveTo(37, -99); c.lineTo(25, -92); c.lineTo(37, -85);
      c.stroke();
      c.beginPath();
      c.moveTo(-11, -74);
      c.quadraticCurveTo(-5.5, -80, 0, -74);
      c.quadraticCurveTo(5.5, -68, 11, -74);
      c.stroke();
    } else if (face === 'dead') {
      c.lineWidth = 4.5;
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.moveTo(sx * 30 - 7, -99); c.lineTo(sx * 30 + 7, -85);
        c.moveTo(sx * 30 + 7, -99); c.lineTo(sx * 30 - 7, -85);
        c.stroke();
      }
      c.beginPath();
      c.arc(0, -64, 11, Math.PI * 1.2, Math.PI * 1.8);
      c.stroke();
    } else if (face === 'surprised') {
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.arc(sx * 30, -92, 9.5, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#fff';
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.arc(sx * 30 - 3, -95, 3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = INK;
      c.beginPath();
      c.ellipse(0, -73, 6, 7.5, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      const blink = t % 3.7 < 0.12;
      c.lineWidth = 4.5;
      for (const sx of [-1, 1]) {
        if (blink) {
          c.beginPath();
          c.moveTo(sx * 30 - 7, -92);
          c.lineTo(sx * 30 + 7, -92);
          c.stroke();
        } else {
          c.beginPath();
          c.ellipse(sx * 30, -92, 7.5, 9.5, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      if (!blink) {
        c.fillStyle = '#fff';
        for (const sx of [-1, 1]) {
          c.beginPath();
          c.arc(sx * 30 - 2.5, -95, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.beginPath();
      c.arc(0, -86, 11, Math.PI * 0.2, Math.PI * 0.8);
      c.stroke();
    }
  }

  // o: { x, y, s, tilt, squash, face, health(0~1), growth, pop(0~1), walk, time }
  function drawDdam(c, o) {
    const t = o.time || 0;
    const h = o.health == null ? 1 : o.health;
    c.save();
    c.translate(o.x, o.y);

    // 그림자 (기울기와 무관)
    c.fillStyle = 'rgba(15,35,20,.28)';
    c.beginPath();
    c.ellipse(0, 2, 92 * o.s, 12 * o.s, 0, 0, Math.PI * 2);
    c.fill();

    c.rotate(o.tilt || 0);
    const sq = o.squash || 0;
    const br = Math.sin(t * 2.4) * 0.012;
    c.scale(o.s * (1 + sq * 0.1 - br * 0.5), o.s * (1 - sq * 0.1 + br));

    // 발
    // 발 2개 (걸을 때 번갈아 통통)
    const feet = [[-38, -12, 20], [38, -12, 20]];
    feet.forEach(([fx, fy, r], i) => {
      const lift = o.walk ? Math.max(0, Math.sin(o.walk + i * Math.PI)) * 7 : 0;
      const g = c.createLinearGradient(0, fy - r, 0, fy + r);
      g.addColorStop(0, '#EDC690');
      g.addColorStop(1, '#D7A465');
      c.beginPath();
      c.arc(fx, fy - lift, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = '#C08A52';
      c.stroke();
    });

    // 몸통
    bodyPath(c);
    const bg = c.createLinearGradient(0, -150, 0, -20);
    bg.addColorStop(0, '#FFFAF1');
    bg.addColorStop(1, '#F6E9D6');
    c.fillStyle = bg;
    c.fill();

    c.save();
    bodyPath(c);
    c.clip();
    c.beginPath();
    c.moveTo(-120, -64);
    c.quadraticCurveTo(0, -50, 120, -64);
    c.lineTo(120, 10);
    c.lineTo(-120, 10);
    c.closePath();
    const lg = c.createLinearGradient(0, -64, 0, -12);
    lg.addColorStop(0, '#F3D5A5');
    lg.addColorStop(1, '#E2B47A');
    c.fillStyle = lg;
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(-62, -112, 9, 24, -0.3, 0, Math.PI * 2);
    c.fill();
    c.restore();

    bodyPath(c);
    c.lineWidth = 5;
    c.strokeStyle = OUTLINE;
    c.stroke();

    // 뚜껑
    c.beginPath();
    c.ellipse(0, -150, 80, 14, 0, 0, Math.PI * 2);
    c.fillStyle = '#FCF5EA';
    c.fill();
    c.lineWidth = 4.5;
    c.strokeStyle = OUTLINE;
    c.stroke();
    c.beginPath();
    c.ellipse(0, -149, 64, 8.5, 0, 0, Math.PI * 2);
    c.lineWidth = 2.5;
    c.strokeStyle = '#E8D6B8';
    c.stroke();
    // 물방울 구멍
    c.beginPath();
    c.ellipse(50, -150, 11, 4.2, 0, 0, Math.PI * 2);
    c.fillStyle = '#D5BC95';
    c.fill();

    drawSprout(c, o, h);

    // 물방울 쏙 (제품의 물방울 알림)
    const pop = o.pop || 0;
    if (pop > 0.001) {
      c.save();
      c.beginPath();
      c.rect(-200, -600, 400, 450);
      c.ellipse(50, -150, 11, 4.2, 0, 0, Math.PI, false);
      c.clip();
      const dy = -150 + 26 - pop * 45.5; // 최대 높이: 이전(70)의 65%
      c.fillStyle = '#7DB3EA';
      c.strokeStyle = '#2E6CBF';
      c.lineWidth = 2.5;
      c.beginPath();
      c.rect(46, dy, 8, -150 - dy + 4);
      c.fill();
      c.stroke();
      drawWaterDrop(c, 50, dy - 4, 15);
      c.restore();
    }

    drawFace(c, o);
    c.restore();
  }

  function drawLeafIcon(c, x, y, size, alive) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.7);
    leafPath(c, size, size * 0.5);
    c.fillStyle = alive ? '#8FD47F' : 'rgba(160,140,95,.75)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = alive ? '#3F8B46' : 'rgba(110,90,55,.8)';
    c.stroke();
    c.restore();
  }

  // 곡 카드용 식물 아이콘 (100x100 좌표계)
  function drawPlantIcon(c, key) {
    const pl = PLANTS[key] || PLANTS.tomato;
    const stemCol = '#4E9E52';
    c.save();
    c.translate(50, 94);
    c.scale(0.62, 0.62);
    // 짧은 줄기 + 떡잎 2장 (게임 속 새싹과 같은 모양)
    c.strokeStyle = '#5DAA5C';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -40);
    c.stroke();
    c.translate(0, -40);
    for (const a of [-0.38, -Math.PI + 0.38]) {
      c.save();
      c.rotate(a);
      leafPath(c, 40, 21);
      const lg = c.createLinearGradient(0, -21, 0, 21);
      lg.addColorStop(0, '#93D683');
      lg.addColorStop(1, '#5FAE5E');
      c.fillStyle = lg;
      c.fill();
      c.lineWidth = 3.2;
      c.strokeStyle = '#3F8B46';
      c.stroke();
      c.restore();
    }
    if (pl.harvest === 'tomato') {
      drawTomatoVine(c, 1, 4, false, 0, stemCol);
    } else {
      const fr = pl.flower.r * (pl.flower.type === 'raceme' ? 2.6 : 2.2);
      if (pl.flower.type === 'raceme' || pl.flower.type === 'spike') {
        // 바질·들깨: 꽃대가 떡잎 마디에서 바로 이어지도록 아래에 배치
        drawFlower(c, 0, -3 - fr * (pl.flower.type === 'spike' ? 1.1 : 1.0), fr, 0, pl.flower);
      } else {
        c.strokeStyle = stemCol;
        c.lineWidth = 3.5;
        c.beginPath();
        c.moveTo(0, -3);
        c.lineTo(0, -40);
        c.stroke();
        drawFlower(c, 0, -52, fr, 0, pl.flower);
      }
    }
    c.restore();
  }

  // 물뿌리개: 주둥이 끝(x, tipY)에서 물줄기가 아래로 쏟아짐
  function drawWateringCan(c, x, tipY) {
    c.save();
    c.translate(x, tipY);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    // 주둥이
    c.strokeStyle = '#C77A35';
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(4, -6);
    c.lineTo(28, -30);
    c.stroke();
    c.strokeStyle = '#F2A65A';
    c.lineWidth = 6;
    c.stroke();
    // 물뿌리개 꼭지(로즈)
    c.save();
    c.rotate(-0.8);
    c.beginPath();
    c.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
    c.fillStyle = '#F6C08A';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = '#C77A35';
    c.stroke();
    c.fillStyle = '#C77A35';
    for (const px of [-5, 0, 5]) { c.beginPath(); c.arc(px, -2, 1.3, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // 손잡이
    c.strokeStyle = '#C77A35';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(56, -48, 16, Math.PI * 1.05, Math.PI * 0.05);
    c.stroke();
    // 몸통
    c.beginPath();
    c.moveTo(26, -60);
    c.lineTo(70, -60);
    c.quadraticCurveTo(76, -60, 75, -52);
    c.lineTo(72, -22);
    c.quadraticCurveTo(71, -14, 63, -14);
    c.lineTo(33, -14);
    c.quadraticCurveTo(25, -14, 24, -22);
    c.lineTo(21, -52);
    c.quadraticCurveTo(20, -60, 26, -60);
    c.closePath();
    const g = c.createLinearGradient(0, -60, 0, -14);
    g.addColorStop(0, '#F8BE7E');
    g.addColorStop(1, '#EA9447');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#C77A35';
    c.stroke();
    // 띠 + 물방울 마크
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.fillRect(23, -44, 51, 7);
    drawWaterDrop(c, 48, -27, 6.5, 1);
    c.restore();
  }

  window.Ddam = {
    drawWateringCan,
    drawPlantIcon, drawDdam, drawWaterDrop, drawLeafIcon, drawFlower, mix, PLANTS, PLANT_ORDER };
})();
