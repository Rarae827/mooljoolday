// MooljoolDay - 오디오 엔진
// 음원 파일 없이 Web Audio로 피아노 / 기타 / 바이올린 / 베이스 / 가벼운 퍼커션을 직접 합성합니다.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ksCache = new Map();
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });

    // iOS 잠금 해제용 무음 재생
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    silent.connect(ctx.destination);
    silent.start(0);

    this.setup(ctx);
  }

  // 오디오 그래프 구성 (실시간 재생과 파일 렌더링(OfflineAudioContext)이 공통으로 사용)
  setup(ctx) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;

    this.master = ctx.createGain();
    // 자동 테스트 전용: 주소에 ?mute 가 붙으면 전체 음소거 (일반 접속에는 영향 없음)
    this.muted = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute') && !(ctx instanceof (window.OfflineAudioContext || Object));
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6);
    const rvOut = ctx.createGain();
    rvOut.gain.value = 0.8;
    this.reverb.connect(rvOut);
    rvOut.connect(this.music);

    this.buses = {};
    const mk = (name, level, send, pan) => {
      const g = ctx.createGain();
      g.gain.value = level;
      let out = g;
      if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        out = p;
      }
      out.connect(this.music);
      const s = ctx.createGain();
      s.gain.value = send;
      out.connect(s);
      s.connect(this.reverb);
      this.buses[name] = g;
    };
    mk('piano', 0.6, 0.32, 0.05);
    mk('guitar', 0.55, 0.22, -0.28);
    mk('violin', 0.5, 0.5, 0.3);
    mk('bass', 0.75, 0.04, 0);
    mk('drums', 0.5, 0.1, 0);

    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.newRun();
  }

  // 판마다 새 입력 버스를 만들어, 다시 시작할 때 예약돼 있던 음을 즉시 끊습니다
  newRun() {
    if (!this.ctx) return;
    if (this.rb) for (const k in this.rb) { try { this.rb[k].disconnect(); } catch (e) { /* 무시 */ } }
    this.rb = {};
    for (const k in this.buses) {
      const g = this.ctx.createGain();
      g.connect(this.buses[k]);
      this.rb[k] = g;
    }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  get latency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }

  makeImpulse(sec) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
      }
    }
    return buf;
  }

  // 곡에 쓰이는 기타 음을 미리 만들어 둡니다 (Karplus-Strong 현 합성)
  prepare(song) {
    for (const e of song.events) if (e.type === 'guitar') this.ksBuffer(e.midi);
  }

  ksBuffer(midi) {
    if (this.ksCache.has(midi)) return this.ksCache.get(midi);
    const sr = this.ctx.sampleRate;
    const f = mtof(midi);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * 2.4);
    const out = new Float32Array(len);
    const line = new Float32Array(N);
    for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;
    for (let p = 0; p < 3; p++) for (let i = 0; i < N; i++) line[i] = (line[i] + line[(i + 1) % N]) * 0.5;
    const d = Math.pow(0.001, 1 / (f * 2.2));
    let idx = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      const nxt = line[(idx + 1) % N];
      out[i] = cur;
      if (Math.abs(cur) > peak) peak = Math.abs(cur);
      line[idx] = d * 0.5 * (cur + nxt);
      idx = (idx + 1) % N;
    }
    const norm = peak > 0 ? 0.8 / peak : 1;
    const buf = this.ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = out[i] * norm;
    this.ksCache.set(midi, buf);
    return buf;
  }

  play(e, t, spb) {
    const d = e.dur * spb;
    switch (e.type) {
      case 'piano': return this.piano(t, e.midi, e.vel, d);
      case 'guitar': return this.guitar(t, e.midi, e.vel);
      case 'violin': return this.violin(t, e.midi, e.vel, d);
      case 'bass': return this.bass(t, e.midi, e.vel, d);
      case 'kick': return this.kick(t, e.vel);
      case 'snap': return this.snap(t, e.vel);
      case 'shaker': return this.shaker(t, e.vel);
    }
  }

  // ---------- 악기 ----------
  piano(t, midi, vel, dur) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(9000, f * 7);
    out.connect(lp);
    lp.connect(this.rb.piano);
    const rel = t + Math.max(dur, 0.2);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vel, t + 0.004);
    out.gain.setTargetAtTime(vel * 0.4, t + 0.004, 0.3);
    out.gain.setTargetAtTime(0, rel, 0.16);
    const partials = [[1, 1], [2, 0.38], [3, 0.12], [4, 0.06]];
    for (const [h, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * h;
      o.detune.value = (Math.random() - 0.5) * 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.setTargetAtTime(amp * 0.15, t, 1.0 / h);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(rel + 1.2);
    }
  }

  guitar(t, midi, vel) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.ksBuffer(midi);
    const g = ctx.createGain();
    g.gain.value = vel;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.rb.guitar);
    src.start(t);
  }

  violin(t, midi, vel, dur) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    const end = t + dur;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.09, t + 0.22);
    g.gain.setValueAtTime(vel * 0.09, end);
    g.gain.linearRampToValueAtTime(0, end + 0.45);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 220;
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 1100;
    body.gain.value = 5;
    g.connect(hp);
    hp.connect(body);
    body.connect(lp);
    lp.connect(this.rb.violin);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.4;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.0065, t + 0.45);
    vib.connect(vg);
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      vg.connect(o.frequency);
      o.connect(g);
      o.start(t);
      o.stop(end + 0.5);
    }
    vib.start(t);
    vib.stop(end + 0.5);
  }

  bass(t, midi, vel, dur) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.008);
    g.gain.setTargetAtTime(vel * 0.2, t + 0.01, 0.25);
    g.gain.setTargetAtTime(0, t + dur, 0.08);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    g.connect(lp);
    lp.connect(this.rb.bass);
    for (const [type, mul, amp] of [['triangle', 1, 1], ['sine', 2, 0.35]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + dur + 0.5);
    }
  }

  kick(t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g);
    g.connect(this.rb.drums);
    o.start(t);
    o.stop(t + 0.3);
  }

  snap(t, vel) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.rb.drums);
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.1);
  }

  shaker(t, vel) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.rb.drums);
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.07);
  }

  // ---------- 효과음 ----------
  blip(t, f0, f1, dur, vol, type = 'sine') {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  sfxCatch(midi) {
    if (!this.ctx) return;
    const t = this.now;
    const f = mtof(midi + 12);
    this.blip(t, f * 0.7, f, 0.16, 0.16);
  }

  sfxMiss() {
    if (!this.ctx) return;
    const t = this.now;
    this.blip(t, 260, 90, 0.3, 0.3, 'triangle');
  }

  sfxPop() {
    if (!this.ctx) return;
    const t = this.now;
    this.blip(t, 380, 1300, 0.22, 0.32);
    this.blip(t + 0.09, 900, 1700, 0.14, 0.14);
  }

  sfxHide() {
    if (!this.ctx) return;
    const t = this.now;
    this.blip(t, 1200, 420, 0.22, 0.24);
    [79, 83, 86].forEach((m, i) => this.blip(t + 0.06 + i * 0.06, mtof(m), mtof(m), 0.25, 0.08));
  }

  sfxClear() {
    if (!this.ctx) return;
    const t = this.now;
    [74, 78, 81, 86].forEach((m, i) => this.blip(t + i * 0.08, mtof(m), mtof(m), 0.35, 0.14));
  }

  sfxOver() {
    if (!this.ctx) return;
    const t = this.now;
    [71, 67, 62].forEach((m, i) => this.blip(t + 0.2 + i * 0.28, mtof(m), mtof(m) * 0.97, 0.5, 0.16, 'triangle'));
  }

  fadeOutMusic(sec) {
    if (!this.ctx) return;
    const g = this.music.gain;
    g.cancelScheduledValues(this.now);
    g.setValueAtTime(g.value, this.now);
    g.linearRampToValueAtTime(0, this.now + sec);
  }

  resetMusic() {
    if (!this.ctx) return;
    const g = this.music.gain;
    g.cancelScheduledValues(this.now);
    g.setValueAtTime(1, this.now);
  }
}

window.AudioEngine = AudioEngine;
window.mtof = mtof;
