export function createAudio() {
  let context = null;
  let engineGain = null;
  let engineOscA = null;
  let engineOscB = null;
  let engineFilter = null;
  let muted = false;
  function start() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineOscA = context.createOscillator();
    engineOscA.type = 'sawtooth';
    engineOscA.frequency.value = 48;
    engineOscB = context.createOscillator();
    engineOscB.type = 'square';
    engineOscB.frequency.value = 24;
    const oscBGain = context.createGain();
    oscBGain.gain.value = 0.5;
    engineOscA.connect(engineFilter);
    engineOscB.connect(oscBGain);
    oscBGain.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(context.destination);
    engineOscA.start();
    engineOscB.start();
  }
  function tone(freq, at, dur, type = 'sine', vol = 0.16) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
  return {
    start,
    update(throttle, speed, running) {
      if (!context) return;
      const t = context.currentTime;
      const target = muted || !running ? 0 : 0.028 + throttle * 0.075;
      engineGain.gain.setTargetAtTime(target, t, 0.12);
      const freq = 42 + throttle * 58 + speed * 0.22;
      engineOscA.frequency.setTargetAtTime(freq, t, 0.1);
      engineOscB.frequency.setTargetAtTime(freq / 2, t, 0.1);
      engineFilter.frequency.setTargetAtTime(240 + throttle * 620, t, 0.15);
    },
    chime() {
      if (!context) return;
      const t = context.currentTime;
      tone(1318, t, 0.22, 'sine', 0.15);
      tone(1760, t + 0.07, 0.3, 'sine', 0.13);
    },
    shutter() {
      if (!context) return;
      const t = context.currentTime;
      tone(2100, t, 0.05, 'square', 0.1);
      tone(1250, t + 0.08, 0.07, 'square', 0.09);
    },
    thud(hardness) {
      if (!context || muted) return;
      const t = context.currentTime;
      const dur = 0.14 + hardness * 0.3;
      const buffer = context.createBuffer(1, context.sampleRate * dur, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160 + hardness * 120;
      const gain = context.createGain();
      gain.gain.value = 0.12 + hardness * 0.3;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(t);
    },
    fanfare() {
      if (!context) return;
      const t = context.currentTime;
      tone(523, t, 0.3, 'triangle', 0.16);
      tone(659, t + 0.11, 0.3, 'triangle', 0.16);
      tone(784, t + 0.22, 0.5, 'triangle', 0.18);
    },
    fail() {
      if (!context) return;
      const t = context.currentTime;
      tone(392, t, 0.3, 'triangle', 0.15);
      tone(262, t + 0.16, 0.55, 'triangle', 0.15);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
