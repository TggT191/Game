(function() {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let bgmNode = null;
  let muted = false;
  let musicVolume = 0.55;
  let sfxVolume = 1.0;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : musicVolume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, type, duration, volume, startDelay, attack) {
    if (muted) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    const vol = (volume || 0.3) * sfxVolume;
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime + (startDelay || 0));
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + (startDelay || 0) + (attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (startDelay || 0) + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(c.currentTime + (startDelay || 0));
    osc.stop(c.currentTime + (startDelay || 0) + duration);
  }

  function playNoise(duration, volume, startDelay, filterFreq) {
    if (muted) return;
    const c = getCtx();
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 800;
    filter.Q.value = 0.5;
    const gain = c.createGain();
    const vol = (volume || 0.15) * sfxVolume;
    gain.gain.setValueAtTime(vol, c.currentTime + (startDelay || 0));
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (startDelay || 0) + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(c.currentTime + (startDelay || 0));
    src.stop(c.currentTime + (startDelay || 0) + duration);
  }

  function arpeggio(notes, type, noteDur, gap, volume) {
    notes.forEach((freq, i) => {
      playTone(freq, type, noteDur, volume || 0.25, i * gap, 0.005);
    });
  }

  const SFX = {
    menuMove() {
      playTone(440, 'square', 0.07, 0.18, 0, 0.005);
    },
    menuConfirm() {
      arpeggio([523, 659, 784], 'square', 0.08, 0.07, 0.2);
    },
    menuBack() {
      arpeggio([523, 392], 'square', 0.08, 0.07, 0.15);
    },
    battleStart() {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3 * sfxVolume, c.currentTime);
      gain.gain.setValueAtTime(0.3 * sfxVolume, c.currentTime + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.75);
      [220, 330, 440].forEach((f, i) => playTone(f, 'sawtooth', 0.25, 0.15, 0.65 + i * 0.02));
    },
    rpsWin() {
      arpeggio([523, 659, 784, 1047], 'square', 0.09, 0.075, 0.25);
    },
    rpsLose() {
      arpeggio([523, 440, 349], 'square', 0.1, 0.085, 0.2);
    },
    rpsTie() {
      playTone(440, 'square', 0.15, 0.2);
      playTone(440, 'square', 0.15, 0.2, 0.2);
    },
    playCard(element) {
      const sounds = {
        Fire:      () => { playNoise(0.15, 0.2, 0, 1200); playTone(220, 'sawtooth', 0.2, 0.25, 0.05); },
        Water:     () => { arpeggio([523, 659, 784], 'sine', 0.1, 0.06, 0.2); },
        Grass:     () => { arpeggio([392, 494, 587], 'triangle', 0.12, 0.07, 0.18); },
        Lightning: () => { playNoise(0.05, 0.3, 0, 3000); playTone(880, 'square', 0.12, 0.3, 0.04); playTone(1760, 'square', 0.06, 0.2, 0.1); },
        Earth:     () => { playNoise(0.25, 0.25, 0, 200); playTone(110, 'sawtooth', 0.3, 0.3, 0.05); },
        Wind:      () => { playNoise(0.2, 0.12, 0, 2000); arpeggio([659, 784, 988], 'sine', 0.09, 0.055, 0.15); },
        Light:     () => { arpeggio([784, 988, 1175, 1568], 'sine', 0.1, 0.06, 0.2); },
        Dark:      () => { playTone(55, 'sawtooth', 0.4, 0.3, 0); playNoise(0.3, 0.2, 0.05, 300); },
      };
      (sounds[element] || sounds.Fire)();
    },
    hit(heavy) {
      if (heavy) {
        playNoise(0.08, 0.35, 0, 600);
        playTone(110, 'square', 0.15, 0.3, 0.03);
      } else {
        playNoise(0.06, 0.22, 0, 800);
        playTone(220, 'square', 0.1, 0.2, 0.02);
      }
    },
    crit() {
      playNoise(0.04, 0.3, 0, 2500);
      arpeggio([880, 1175, 1568], 'square', 0.07, 0.055, 0.3);
    },
    heal() {
      arpeggio([523, 659, 784, 1047], 'sine', 0.12, 0.08, 0.18);
    },
    buff() {
      arpeggio([392, 523, 659, 784], 'triangle', 0.1, 0.07, 0.2);
    },
    status() {
      playTone(349, 'sawtooth', 0.1, 0.2);
      playTone(330, 'sawtooth', 0.1, 0.2, 0.12);
    },
    drawCard() {
      playTone(523, 'square', 0.06, 0.15, 0, 0.005);
      playTone(659, 'square', 0.06, 0.12, 0.065, 0.005);
    },
    shuffle() {
      for (let i = 0; i < 5; i++) {
        playTone(400 + Math.random() * 200, 'square', 0.05, 0.12, i * 0.055);
      }
    },
    item() {
      arpeggio([659, 784, 988, 1175], 'triangle', 0.08, 0.06, 0.2);
    },
    yourTurn() {
      playTone(523, 'square', 0.07, 0.2, 0);
      playTone(659, 'square', 0.07, 0.18, 0.09);
    },
    oppTurn() {
      playTone(349, 'square', 0.07, 0.15, 0);
      playTone(330, 'square', 0.07, 0.12, 0.09);
    },
    roundWin() {
      const melody = [523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523];
      melody.forEach((f, i) => {
        if (f > 0) playTone(f, 'square', 0.12, 0.22, i * 0.1, 0.005);
      });
    },
    gameOver() {
      const melody = [784, 698, 659, 587, 523, 494, 440, 392];
      melody.forEach((f, i) => {
        playTone(f, 'square', 0.2, 0.18, i * 0.14, 0.01);
      });
    },
    victory() {
      const fanfare = [
        [523, 0], [659, 0.1], [784, 0.2], [784, 0.35],
        [698, 0.5], [784, 0.6], [0, 0.7],
        [523, 0.75], [784, 0.85], [1047, 0.95]
      ];
      fanfare.forEach(([f, t]) => {
        if (f > 0) playTone(f, 'square', 0.18, 0.28, t, 0.005);
      });
    },
    stun() {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, c.currentTime);
      osc.frequency.setValueAtTime(440, c.currentTime + 0.05);
      osc.frequency.setValueAtTime(220, c.currentTime + 0.1);
      osc.frequency.setValueAtTime(110, c.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25 * sfxVolume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.25);
    },
    superEffective() {
      playNoise(0.04, 0.2, 0, 2000);
      arpeggio([659, 988, 1319], 'square', 0.07, 0.055, 0.28);
    },
    notEffective() {
      playTone(392, 'square', 0.12, 0.15);
      playTone(349, 'square', 0.12, 0.12, 0.1);
    },
    pause() {
      arpeggio([523, 392], 'square', 0.08, 0.08, 0.16);
    },
    resume() {
      arpeggio([392, 523], 'square', 0.08, 0.08, 0.16);
    },
  };

  function playBattleBGM() {
    if (muted) return;
    stopBGM();

    const c = getCtx();
    bgmGain = c.createGain();
    bgmGain.gain.value = 0.10 * musicVolume;
    bgmGain.connect(masterGain);

    const BPM = 155;
    const beat = 60 / BPM;
    const bar = beat * 4;

    const melody = [
      [523, beat*0],   [659, beat*0.5], [784, beat*1],   [659, beat*1.5],
      [523, beat*2],   [880, beat*2.5], [784, beat*3],   [659, beat*3.5],
      [698, bar+beat*0],   [784, bar+beat*0.5], [880, bar+beat*1],   [784, bar+beat*1.5],
      [698, bar+beat*2],   [659, bar+beat*2.5], [587, bar+beat*3],   [523, bar+beat*3.5],
      [440, bar*2+beat*0], [523, bar*2+beat*0.5],[659, bar*2+beat*1], [784, bar*2+beat*1.5],
      [880, bar*2+beat*2], [784, bar*2+beat*2.5],[659, bar*2+beat*3], [523, bar*2+beat*3.5],
      [494, bar*3+beat*0], [587, bar*3+beat*0.5],[698, bar*3+beat*1], [784, bar*3+beat*1.5],
      [880, bar*3+beat*2], [784, bar*3+beat*2.5],[698, bar*3+beat*3], [659, bar*3+beat*3.5],
      [784, bar*4+beat*0], [880, bar*4+beat*0.5],[988, bar*4+beat*1], [880, bar*4+beat*1.5],
      [784, bar*4+beat*2], [698, bar*4+beat*2.5],[659, bar*4+beat*3], [587, bar*4+beat*3.5],
      [659, bar*5+beat*0], [784, bar*5+beat*0.5],[880, bar*5+beat*1], [988, bar*5+beat*1.5],
      [1047,bar*5+beat*2], [988, bar*5+beat*2.5],[880, bar*5+beat*3], [784, bar*5+beat*3.5],
      [523, bar*6+beat*0], [587, bar*6+beat*0.5],[659, bar*6+beat*1], [698, bar*6+beat*1.5],
      [784, bar*6+beat*2], [880, bar*6+beat*2.5],[784, bar*6+beat*3], [698, bar*6+beat*3.5],
      [659, bar*7+beat*0], [587, bar*7+beat*0.5],[523, bar*7+beat*1], [494, bar*7+beat*1.5],
      [523, bar*7+beat*2], [587, bar*7+beat*2.5],[659, bar*7+beat*3], [784, bar*7+beat*3.5],
    ];

    const bass = [
      [131, 0],          [131, beat*2],
      [165, bar],        [165, bar+beat*2],
      [110, bar*2],      [110, bar*2+beat*2],
      [123, bar*3],      [123, bar*3+beat*2],
      [147, bar*4],      [147, bar*4+beat*2],
      [165, bar*5],      [165, bar*5+beat*2],
      [131, bar*6],      [131, bar*6+beat*2],
      [110, bar*7],      [123, bar*7+beat*2],
    ];

    const loopDur = bar * 8;

    function scheduleMelody(offset) {
      melody.forEach(([freq, t]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, c.currentTime + offset + t);
        g.gain.linearRampToValueAtTime(0.3, c.currentTime + offset + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + beat * 0.45);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(c.currentTime + offset + t);
        osc.stop(c.currentTime + offset + t + beat * 0.5);
      });
      bass.forEach(([freq, t]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.5, c.currentTime + offset + t);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + beat * 1.8);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(c.currentTime + offset + t);
        osc.stop(c.currentTime + offset + t + beat * 2);
      });
    }

    scheduleMelody(0);
    scheduleMelody(loopDur);

    let looped = 2;
    const interval = setInterval(() => {
      if (muted || !bgmGain) { clearInterval(interval); return; }
      scheduleMelody(loopDur * looped);
      looped++;
    }, loopDur * 1000);

    bgmNode = { interval };
  }

  function playBossBGM() {
    if (muted) return;
    stopBGM();

    const c = getCtx();
    bgmGain = c.createGain();
    bgmGain.gain.value = 0.12 * musicVolume;
    bgmGain.connect(masterGain);

    const BPM = 175;
    const beat = 60 / BPM;
    const bar = beat * 4;

    const melody = [
      [220, beat*0],   [277, beat*0.5], [330, beat*1],   [370, beat*1.5],
      [440, beat*2],   [370, beat*2.5], [330, beat*3],   [277, beat*3.5],
      [294, bar+beat*0],   [370, bar+beat*0.5], [440, bar+beat*1],   [494, bar+beat*1.5],
      [523, bar+beat*2],   [494, bar+beat*2.5], [440, bar+beat*3],   [370, bar+beat*3.5],
      [330, bar*2+beat*0], [415, bar*2+beat*0.5],[494, bar*2+beat*1], [554, bar*2+beat*1.5],
      [587, bar*2+beat*2], [554, bar*2+beat*2.5],[494, bar*2+beat*3], [415, bar*2+beat*3.5],
      [370, bar*3+beat*0], [440, bar*3+beat*0.5],[523, bar*3+beat*1], [587, bar*3+beat*1.5],
      [659, bar*3+beat*2], [587, bar*3+beat*2.5],[523, bar*3+beat*3], [440, bar*3+beat*3.5],
      [494, bar*4+beat*0], [587, bar*4+beat*0.5],[659, bar*4+beat*1], [698, bar*4+beat*1.5],
      [784, bar*4+beat*2], [698, bar*4+beat*2.5],[659, bar*4+beat*3], [587, bar*4+beat*3.5],
      [523, bar*5+beat*0], [440, bar*5+beat*0.5],[370, bar*5+beat*1], [330, bar*5+beat*1.5],
      [294, bar*5+beat*2], [330, bar*5+beat*2.5],[370, bar*5+beat*3], [440, bar*5+beat*3.5],
      [494, bar*6+beat*0], [523, bar*6+beat*0.5],[587, bar*6+beat*1], [659, bar*6+beat*1.5],
      [698, bar*6+beat*2], [659, bar*6+beat*2.5],[587, bar*6+beat*3], [523, bar*6+beat*3.5],
      [440, bar*7+beat*0], [370, bar*7+beat*0.5],[330, bar*7+beat*1], [294, bar*7+beat*1.5],
      [220, bar*7+beat*2], [247, bar*7+beat*2.5],[277, bar*7+beat*3], [330, bar*7+beat*3.5],
    ];

    const bass = [
      [55,  0],          [55,  beat*2],
      [73,  bar],        [73,  bar+beat*2],
      [82,  bar*2],      [82,  bar*2+beat*2],
      [92,  bar*3],      [92,  bar*3+beat*2],
      [110, bar*4],      [110, bar*4+beat*2],
      [98,  bar*5],      [82,  bar*5+beat*2],
      [73,  bar*6],      [73,  bar*6+beat*2],
      [55,  bar*7],      [62,  bar*7+beat*2],
    ];

    const percussion = [];
    for (let b = 0; b < 8; b++) {
      for (let s = 0; s < 4; s++) {
        percussion.push(bar * b + beat * s);
      }
    }

    const loopDur = bar * 8;

    function scheduleBoss(offset) {
      melody.forEach(([freq, t]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, c.currentTime + offset + t);
        g.gain.linearRampToValueAtTime(0.28, c.currentTime + offset + t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + beat * 0.42);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(c.currentTime + offset + t);
        osc.stop(c.currentTime + offset + t + beat * 0.5);
      });

      bass.forEach(([freq, t]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.55, c.currentTime + offset + t);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + beat * 1.6);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(c.currentTime + offset + t);
        osc.stop(c.currentTime + offset + t + beat * 2);
      });

      percussion.forEach(t => {
        const bufSize = Math.floor(c.sampleRate * 0.06);
        const buf = c.createBuffer(1, bufSize, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        const src = c.createBufferSource();
        src.buffer = buf;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 200;
        filter.Q.value = 0.8;
        const g = c.createGain();
        g.gain.setValueAtTime(0.18, c.currentTime + offset + t);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + 0.06);
        src.connect(filter);
        filter.connect(g);
        g.connect(bgmGain);
        src.start(c.currentTime + offset + t);
        src.stop(c.currentTime + offset + t + 0.07);
      });
    }

    scheduleBoss(0);
    scheduleBoss(loopDur);

    let looped = 2;
    const interval = setInterval(() => {
      if (muted || !bgmGain) { clearInterval(interval); return; }
      scheduleBoss(loopDur * looped);
      looped++;
    }, loopDur * 1000);

    bgmNode = { interval };
  }

  function playMenuBGM() {
    if (muted) return;
    stopBGM();

    const c = getCtx();
    bgmGain = c.createGain();
    bgmGain.gain.value = 0.08 * musicVolume;
    bgmGain.connect(masterGain);

    const BPM = 120;
    const beat = 60 / BPM;

    const theme = [
      [523, 0],        [659, beat*0.5], [784, beat*1],
      [880, beat*1.5], [784, beat*2],   [659, beat*2.5],
      [523, beat*3],   [659, beat*3.5],
      [523, beat*4],   [494, beat*4.5], [523, beat*5],
      [659, beat*5.5], [784, beat*6],   [880, beat*6.5],
      [988, beat*7],   [784, beat*7.5],
    ];

    const loopDur = beat * 8;

    function scheduleTheme(offset) {
      theme.forEach(([freq, t]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.25, c.currentTime + offset + t);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + t + beat * 0.42);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(c.currentTime + offset + t);
        osc.stop(c.currentTime + offset + t + beat * 0.5);
      });
    }

    scheduleTheme(0);
    scheduleTheme(loopDur);

    let looped = 2;
    const interval = setInterval(() => {
      if (muted || !bgmGain) { clearInterval(interval); return; }
      scheduleTheme(loopDur * looped);
      looped++;
    }, loopDur * 1000);

    bgmNode = { interval };
  }

  function stopBGM() {
    if (bgmNode && bgmNode.interval) clearInterval(bgmNode.interval);
    if (bgmGain) {
      try { bgmGain.gain.exponentialRampToValueAtTime(0.001, getCtx().currentTime + 0.5); } catch(e) {}
    }
    bgmNode = null;
    bgmGain = null;
  }

  function setMusicVolume(value) {
    musicVolume = Math.max(0, Math.min(1, value));
    localStorage.setItem('wcMusicVolume', musicVolume);
    if (!muted && masterGain) {
      masterGain.gain.value = musicVolume;
    }
    if (bgmGain && !muted) {
      bgmGain.gain.value = 0.10 * musicVolume;
    }
  }

  function setSfxVolume(value) {
    sfxVolume = Math.max(0, Math.min(1, value));
    localStorage.setItem('wcSfxVolume', sfxVolume);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      stopBGM();
      if (masterGain) masterGain.gain.value = 0;
    } else {
      if (masterGain) masterGain.gain.value = musicVolume;
    }
    localStorage.setItem('wcMuted', muted ? '1' : '0');
    return muted;
  }

  function ensureStarted() {
    getCtx();
  }

  document.addEventListener('click', ensureStarted, { once: true });
  document.addEventListener('keydown', ensureStarted, { once: true });

  if (localStorage.getItem('wcMuted') === '1') {
    muted = true;
  }

  const savedMusic = parseFloat(localStorage.getItem('wcMusicVolume'));
  if (!isNaN(savedMusic)) musicVolume = savedMusic;

  const savedSfx = parseFloat(localStorage.getItem('wcSfxVolume'));
  if (!isNaN(savedSfx)) sfxVolume = savedSfx;

  window.WCA = {
    sfx: SFX,
    playBattleBGM,
    playBossBGM,
    playMenuBGM,
    stopBGM,
    toggleMute,
    isMuted: () => muted,
    setMusicVolume,
    setSfxVolume,
    getMusicVolume: () => musicVolume,
    getSfxVolume: () => sfxVolume,
  };
})();
