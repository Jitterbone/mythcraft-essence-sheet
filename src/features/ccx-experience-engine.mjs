/**
 * mythcraft-essence-sheet | src/features/ccx-experience-engine.mjs
 *
 * Premium AAA CRPG Visual & Audio Engine for the Character Creation & Level-Up Experience:
 *  1. Procedural WebAudio Arcane Soundscape (zero external audio dependencies)
 *  2. 60fps HTML5 Particle & Leyline Spark Canvas (ambient motes + click spark bursts)
 *  3. 3D Holographic Tarot / Collector Card Tilt & Foil Glare
 *  4. Live Animated SVG Attribute Radar & Rotating Arcane Rune Wheel
 *  5. Interactive 2D Astral Constellation Leyline Map ("The Astral Loom")
 *  6. Cinematic Stage Callout Banners & Hero Awakening / Ascension Finale Sequence
 */

import { getSetting, MODULE_ID } from "../settings.mjs";

/* ───────────────────────────────────────────────────────────────────────────
 *  1. PROCEDURAL WEBAUDIO ARCANE SOUNDSCAPE
 * ────────────────────────────────────────────────────────────────────────── */

class ArcaneSoundEngine {
  constructor() {
    this._ctx = null;
    this._lastHoverTime = 0;
  }

  isEnabled() {
    return Boolean(getSetting("ccxEnabled", true)) && Boolean(getSetting("ccxSoundEnabled", true));
  }

  getVolume() {
    const v = Number(getSetting("ccxSoundVolume", 0.45));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.45;
  }

  _getContext() {
    if (!this.isEnabled()) return null;
    if (!this._ctx) {
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) return null;
      this._ctx = new AudioCtx();
    }
    if (this._ctx.state === "suspended") {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  /** Subtle crystalline hover chime */
  playHover() {
    const nowMs = performance.now();
    if (nowMs - this._lastHoverTime < 55) return;
    this._lastHoverTime = nowMs;

    const ctx = this._getContext();
    if (!ctx) return;
    const vol = this.getVolume() * 0.12;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, t); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, t + 0.045); // E6

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** Crisp arcane-mechanical tick for +/- steppers */
  playStepTick(isPlus = true) {
    const ctx = this._getContext();
    if (!ctx) return;
    const vol = this.getVolume() * 0.22;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const startFreq = isPlus ? 523.25 : 440.0;
    const endFreq = isPlus ? 659.25 : 349.23;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.065);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /** Resonant golden rune-lock chord when selecting a card */
  playSelect() {
    const ctx = this._getContext();
    if (!ctx) return;
    const vol = this.getVolume() * 0.28;
    const t = ctx.currentTime;

    const freqs = [293.66, 440.0, 587.33]; // D4, A4, D5
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f, t + idx * 0.02);

      gain.gain.setValueAtTime(0.0001, t + idx * 0.02);
      gain.gain.linearRampToValueAtTime(vol / (idx + 1), t + idx * 0.02 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32 + idx * 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.02);
      osc.stop(t + 0.38 + idx * 0.04);
    });
  }

  /** Astral leyline camera fly-through whoosh + harmonic bell */
  playStagePan() {
    const ctx = this._getContext();
    if (!ctx) return;
    const vol = this.getVolume() * 0.32;
    const t = ctx.currentTime;

    // Low astral sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(146.83, t); // D3
    sweep.frequency.exponentialRampToValueAtTime(293.66, t + 0.35); // D4
    sweepGain.gain.setValueAtTime(0.0001, t);
    sweepGain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.08);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.5);

    // High harmonic shimmer
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(880.0, t + 0.08); // A5
    bell.frequency.exponentialRampToValueAtTime(1174.66, t + 0.42); // D6
    bellGain.gain.setValueAtTime(0.0001, t + 0.08);
    bellGain.gain.linearRampToValueAtTime(vol * 0.45, t + 0.14);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(t + 0.08);
    bell.stop(t + 0.58);
  }

  /** Triumphant celestial chord swell for Hero Awakening / Level-Up Ascension */
  playAwakenFinale() {
    const ctx = this._getContext();
    if (!ctx) return;
    const vol = this.getVolume() * 0.35;
    const t = ctx.currentTime;

    // D Major 9th Celestial Chord: D3, A3, D4, F#4, A4, E5, A5
    const chord = [146.83, 220.0, 293.66, 369.99, 440.0, 659.25, 880.0];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i < 2 ? "triangle" : "sine";
      const startOffset = i * 0.055;
      osc.frequency.setValueAtTime(freq, t + startOffset);

      gain.gain.setValueAtTime(0.0001, t + startOffset);
      gain.gain.linearRampToValueAtTime(vol / Math.sqrt(i + 1.5), t + startOffset + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + startOffset);
      osc.stop(t + 1.9);
    });
  }
}

export const CcxSound = new ArcaneSoundEngine();

/* ───────────────────────────────────────────────────────────────────────────
 *  2. HARDWARE-FRIENDLY HTML5 PARTICLE & LEYLINE SPARK CANVAS
 *     (Half-res internal buffer, 2 batched draw calls/frame, adaptive FPS)
 * ────────────────────────────────────────────────────────────────────────── */

const activeParticleSystems = new WeakMap();

export function setupCcxParticles(rootEl) {
  if (!rootEl) return null;
  const ccxEnabled = Boolean(getSetting("ccxEnabled", true));
  const density = String(getSetting("ccxParticleDensity", "high"));

  const prev = activeParticleSystems.get(rootEl);

  if (!ccxEnabled || density === "off") {
    if (prev?.destroy) prev.destroy();
    activeParticleSystems.delete(rootEl);
    return null;
  }

  // If already running on this window with the same density and connected canvas, keep it running seamlessly!
  if (prev && prev.density === density && prev.canvas?.isConnected) {
    return prev;
  }

  if (prev?.destroy) prev.destroy();

  // Mount canvas directly on rootEl (outside the Handlebars part replaced on render) so it never flashes or resets!
  let canvas = rootEl.querySelector(":scope > canvas.ccx-particle-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "ccx-particle-canvas";
    rootEl.insertBefore(canvas, rootEl.firstChild);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Render at 0.5x internal resolution (cuts GPU pixel fill-rate by 75% while keeping soft motes identical)
  const RENDER_SCALE = 0.5;
  const countMap = { low: 14, medium: 24, high: 36 };
  const targetCount = countMap[density] || 24;

  let cssWidth = rootEl.clientWidth || 1400;
  let cssHeight = rootEl.clientHeight || 860;
  let width = (canvas.width = Math.max(320, Math.round(cssWidth * RENDER_SCALE)));
  let height = (canvas.height = Math.max(200, Math.round(cssHeight * RENDER_SCALE)));

  const resizeObserver = new ResizeObserver(() => {
    if (!rootEl.isConnected) return;
    cssWidth = rootEl.clientWidth || 1400;
    cssHeight = rootEl.clientHeight || 860;
    width = canvas.width = Math.max(320, Math.round(cssWidth * RENDER_SCALE));
    height = canvas.height = Math.max(200, Math.round(cssHeight * RENDER_SCALE));
  });
  resizeObserver.observe(rootEl);

  const ambientParticles = Array.from({ length: targetCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -0.12 - Math.random() * 0.28,
    r: 0.9 + Math.random() * 1.3,
    isGold: Math.random() > 0.42,
  }));

  const burstSparks = [];

  const spawnBurst = (clientX, clientY, isGold = true) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (clientX - rect.left) * (width / rect.width);
    const y = (clientY - rect.top) * (height / rect.height);
    const sparkCount = density === "low" ? 8 : 14;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3;
      const speed = 1.0 + Math.random() * 2.4;
      burstSparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        r: 1.1 + Math.random() * 1.4,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03,
        isGold: i % 3 !== 0 ? isGold : !isGold,
      });
    }
  };

  let rafId = null;
  let running = true;
  let lastDrawTime = 0;

  const tick = (now = 0) => {
    if (!running || !canvas.isConnected) return;
    rafId = requestAnimationFrame(tick);

    if (document.hidden) return;

    // Adaptive FPS: 24 FPS (~41ms) for gentle ambient drift, 60 FPS (~16ms) during active click bursts
    const minInterval = burstSparks.length > 0 ? 16 : 41;
    if (now - lastDrawTime < minInterval) return;
    lastDrawTime = now;

    ctx.clearRect(0, 0, width, height);

    // 1. Batch-draw all gold and cyan ambient motes in just 2 draw calls total!
    ctx.fillStyle = "rgba(254, 235, 179, 0.48)";
    ctx.beginPath();
    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -6) {
        p.y = height + 6;
        p.x = Math.random() * width;
      }
      if (p.x < -6) p.x = width + 6;
      if (p.x > width + 6) p.x = -6;

      if (p.isGold) {
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    ctx.fillStyle = "rgba(56, 189, 248, 0.42)";
    ctx.beginPath();
    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];
      if (!p.isGold) {
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // 2. Draw interactive click burst sparks (zero shadowBlur for maximum integrated GPU speed)
    if (burstSparks.length > 0) {
      for (let i = burstSparks.length - 1; i >= 0; i--) {
        const s = burstSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy = s.vy * 0.94 + 0.03;
        s.life -= s.decay;

        if (s.life <= 0) {
          burstSparks.splice(i, 1);
          continue;
        }

        const r = s.r * s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = s.isGold
          ? `rgba(254, 235, 179, ${s.life.toFixed(2)})`
          : `rgba(56, 189, 248, ${s.life.toFixed(2)})`;
        ctx.fill();
      }
    }
  };

  rafId = requestAnimationFrame(tick);

  const controller = {
    density,
    canvas,
    spawnBurst,
    destroy() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.remove();
    },
  };

  activeParticleSystems.set(rootEl, controller);
  return controller;
}

/* ───────────────────────────────────────────────────────────────────────────
 *  3. 3D HOLOGRAPHIC TAROT / COLLECTOR CARDS & INTERACTION FX
 *     (Single delegated listener per window + RAF-throttled tilt, zero reflow)
 * ────────────────────────────────────────────────────────────────────────── */

const CARD_SELECTOR = [
  ".wizard-selection-card",
  ".bops-item-card",
  ".talent-choice-card",
  ".unique-feature-card",
  ".spell-select-card",
  ".srd-badge-node",
  ".ccx-pillar-card",
  ".hp-mode-option",
  ".hp-option-card",
  ".milestone-feature-card",
].join(", ");

const HOVER_SOUND_SELECTOR = `${CARD_SELECTOR}, .ccx-star-constellation-node, .ccx-nebula-parent-node-pod`;
const STEP_BTN_SELECTOR = ".step-btn, .sk-btn, .spin-btn";

export function attachCcxInteractiveEffects(rootEl, particleSystem = null) {
  if (!rootEl) return;
  const ccxEnabled = Boolean(getSetting("ccxEnabled", true));
  const holoEnabled = ccxEnabled && Boolean(getSetting("ccxHoloCards", true));

  rootEl.classList.toggle("ccx-classic-mode", !ccxEnabled);
  rootEl.classList.toggle("ccx-holo-enabled", holoEnabled);
  rootEl._ccxParticleSystem = particleSystem;
  rootEl._ccxHoloEnabled = holoEnabled;

  // Wire a SINGLE delegated listener set on rootEl once — zero querySelectorAll loops on re-render!
  if (rootEl.dataset.ccxDelegated === "true") return;
  rootEl.dataset.ccxDelegated = "true";

  let lastHoveredCard = null;
  let activeTiltEl = null;
  let activeTiltRect = null;
  let activeTiltIsSky = false;
  let moveRafId = null;
  let pendingClientX = 0;
  let pendingClientY = 0;

  rootEl.addEventListener("pointerover", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const hoverCard = target.closest(HOVER_SOUND_SELECTOR);
    if (hoverCard && hoverCard !== lastHoveredCard) {
      lastHoveredCard = hoverCard;
      CcxSound.playHover();
    } else if (!hoverCard) {
      lastHoveredCard = null;
    }

    if (!rootEl._ccxHoloEnabled) return;

    const tiltCandidate = target.closest(`${CARD_SELECTOR}, .ccx-constellation-sky-card`);
    if (tiltCandidate !== activeTiltEl) {
      if (activeTiltEl) {
        if (activeTiltIsSky) {
          activeTiltEl.style.setProperty("--sky-rx", "0deg");
          activeTiltEl.style.setProperty("--sky-ry", "0deg");
        } else {
          activeTiltEl.style.setProperty("--ccx-rx", "0deg");
          activeTiltEl.style.setProperty("--ccx-ry", "0deg");
        }
      }
      activeTiltEl = tiltCandidate;
      if (activeTiltEl) {
        activeTiltIsSky = activeTiltEl.classList.contains("ccx-constellation-sky-card");
        activeTiltRect = activeTiltEl.getBoundingClientRect();
      } else {
        activeTiltRect = null;
      }
    }
  }, { passive: true });

  rootEl.addEventListener("pointermove", (e) => {
    if (!rootEl._ccxHoloEnabled || !activeTiltEl || !activeTiltRect) return;
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;
    if (moveRafId) return;

    moveRafId = requestAnimationFrame(() => {
      moveRafId = null;
      if (!activeTiltEl || !activeTiltRect || !activeTiltRect.width || !activeTiltRect.height) return;
      const px = Math.max(0, Math.min(1, (pendingClientX - activeTiltRect.left) / activeTiltRect.width));
      const py = Math.max(0, Math.min(1, (pendingClientY - activeTiltRect.top) / activeTiltRect.height));
      if (activeTiltIsSky) {
        const rx = ((0.5 - py) * 6).toFixed(1);
        const ry = ((px - 0.5) * 6).toFixed(1);
        activeTiltEl.style.setProperty("--sky-rx", `${rx}deg`);
        activeTiltEl.style.setProperty("--sky-ry", `${ry}deg`);
        activeTiltEl.style.setProperty("--sky-gx", `${Math.round(px * 100)}%`);
        activeTiltEl.style.setProperty("--sky-gy", `${Math.round(py * 100)}%`);
      } else {
        const rx = ((0.5 - py) * 10).toFixed(1);
        const ry = ((px - 0.5) * 10).toFixed(1);
        activeTiltEl.style.setProperty("--ccx-rx", `${rx}deg`);
        activeTiltEl.style.setProperty("--ccx-ry", `${ry}deg`);
        activeTiltEl.style.setProperty("--ccx-gx", `${Math.round(px * 100)}%`);
        activeTiltEl.style.setProperty("--ccx-gy", `${Math.round(py * 100)}%`);
      }
    });
  }, { passive: true });

  rootEl.addEventListener("pointerleave", () => {
    if (activeTiltEl) {
      if (activeTiltIsSky) {
        activeTiltEl.style.setProperty("--sky-rx", "0deg");
        activeTiltEl.style.setProperty("--sky-ry", "0deg");
      } else {
        activeTiltEl.style.setProperty("--ccx-rx", "0deg");
        activeTiltEl.style.setProperty("--ccx-ry", "0deg");
      }
      activeTiltEl = null;
      activeTiltRect = null;
    }
    lastHoveredCard = null;
  }, { passive: true });

  rootEl.addEventListener("pointerdown", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const stepBtn = target.closest(STEP_BTN_SELECTOR);
    if (stepBtn) {
      if (stepBtn.disabled) return;
      const isPlus = stepBtn.classList.contains("plus") || stepBtn.classList.contains("inc-btn") || Number(stepBtn.dataset.delta) > 0;
      CcxSound.playStepTick(isPlus);
      rootEl._ccxParticleSystem?.spawnBurst(e.clientX, e.clientY, isPlus);
      return;
    }

    const interactiveCard = target.closest(HOVER_SOUND_SELECTOR);
    if (interactiveCard) {
      CcxSound.playSelect();
      rootEl._ccxParticleSystem?.spawnBurst(e.clientX, e.clientY, true);
    }
  }, { passive: true });
}

/* ───────────────────────────────────────────────────────────────────────────
 *  4. LIVE ANIMATED SVG ATTRIBUTE RADAR & ARCANE RUNE WHEEL
 * ────────────────────────────────────────────────────────────────────────── */

export function buildAttributeRadarSvg(attributesList = [], levelCap = 2) {
  if (!Boolean(getSetting("ccxEnabled", true)) || !Boolean(getSetting("ccxRadarWheel", true))) {
    return "";
  }
  const list = Array.isArray(attributesList) && attributesList.length >= 3
    ? attributesList
    : [
        { label: "STR", value: 0 },
        { label: "DEX", value: 0 },
        { label: "END", value: 0 },
        { label: "AWR", value: 0 },
        { label: "INT", value: 0 },
        { label: "CHA", value: 0 },
      ];

  const count = list.length;
  const cx = 160;
  const cy = 160;
  const maxRadius = 104;
  const minVal = -3;
  const maxVal = Math.max(levelCap + 1, 4);
  const range = maxVal - minVal;

  const getPoint = (idx, val, radiusOverride = null) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const norm = radiusOverride !== null
      ? radiusOverride
      : Math.max(0.14, Math.min(1, (Number(val || 0) - minVal) / range));
    const r = norm * maxRadius;
    return {
      x: +(cx + Math.cos(angle) * r).toFixed(1),
      y: +(cy + Math.sin(angle) * r).toFixed(1),
      angle,
    };
  };

  // Concentric web rings
  const ringLevels = [0.25, 0.5, 0.75, 1.0];
  const ringsSvg = ringLevels.map((norm, rIdx) => {
    const pts = list.map((_, idx) => {
      const p = getPoint(idx, 0, norm);
      return `${p.x},${p.y}`;
    }).join(" ");
    const isOuter = rIdx === ringLevels.length - 1;
    return `<polygon points="${pts}" fill="${isOuter ? "rgba(13, 28, 38, 0.45)" : "none"}" stroke="${isOuter ? "rgba(56, 189, 248, 0.4)" : "rgba(36, 105, 117, 0.35)"}" stroke-width="${isOuter ? "1.3" : "1"}" ${rIdx === 1 ? 'stroke-dasharray="3 3"' : ""} class="ccx-radar-ring-poly" />`;
  }).join("");

  // Axis spokes & outer rune labels
  const spokesSvg = list.map((attr, idx) => {
    const outer = getPoint(idx, 0, 1.0);
    const labelPt = getPoint(idx, 0, 1.27);
    const rawVal = Number(attr.value ?? attr.preview ?? 0);
    const sign = rawVal > 0 ? `+${rawVal}` : `${rawVal}`;
    const cls = rawVal > 0 ? "pos" : rawVal < 0 ? "neg" : "zero";
    const valColor = rawVal > 0 ? "#FEEBB3" : rawVal < 0 ? "#f87171" : "#94a3b8";
    const borderStroke = rawVal > 0 ? "rgba(254, 235, 179, 0.55)" : rawVal < 0 ? "rgba(248, 113, 113, 0.45)" : "rgba(36, 105, 117, 0.65)";
    return `
      <line x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" stroke="rgba(36, 105, 117, 0.45)" stroke-width="1" class="ccx-radar-spoke" />
      <g class="ccx-radar-label-group ${cls}" transform="translate(${labelPt.x}, ${labelPt.y})">
        <rect x="-24" y="-13" width="48" height="26" rx="5" fill="rgba(9, 16, 23, 0.92)" stroke="${borderStroke}" stroke-width="1" class="ccx-radar-label-bg" />
        <text x="0" y="-2" text-anchor="middle" fill="#cbd5e1" font-family="Cinzel, serif" font-size="9.5" font-weight="700" class="ccx-radar-label-k">${attr.label}</text>
        <text x="0" y="9" text-anchor="middle" fill="${valColor}" font-size="10" font-weight="800" class="ccx-radar-label-v">${sign}</text>
      </g>
    `;
  }).join("");

  // Active Attribute Polygon & Vertex Jewels
  const polyPoints = list.map((attr, idx) => {
    const rawVal = Number(attr.value ?? attr.preview ?? 0);
    return getPoint(idx, rawVal);
  });
  const polyPointsStr = polyPoints.map(p => `${p.x},${p.y}`).join(" ");
  const jewelsSvg = polyPoints.map((p, idx) => {
    const rawVal = Number(list[idx].value ?? list[idx].preview ?? 0);
    const fillCol = rawVal > 0 ? "#FEEBB3" : rawVal < 0 ? "#f87171" : "#38bdf8";
    const strokeCol = rawVal > 0 ? "#f59e0b" : rawVal < 0 ? "#ef4444" : "#0284c7";
    return `<circle cx="${p.x}" cy="${p.y}" r="${rawVal > 0 ? 4.5 : 3.5}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="1.5" class="ccx-radar-jewel ${rawVal > 0 ? "boosted" : ""}" />`;
  }).join("");

  return `
    <div class="ccx-radar-wheel-wrap">
      <svg viewBox="0 0 320 320" class="ccx-radar-svg" aria-label="Attribute Radar Wheel">
        <defs>
          <radialGradient id="ccxRadarFillGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.48" />
            <stop offset="65%" stop-color="#22c55e" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#FEEBB3" stop-opacity="0.62" />
          </radialGradient>
        </defs>

        <!-- Outer Arcane Rune Rings -->
        <g class="ccx-rune-ring-outer">
          <circle cx="${cx}" cy="${cy}" r="116" fill="none" stroke="rgba(254, 235, 179, 0.28)" stroke-width="1.4" stroke-dasharray="8 6 2 6" class="ccx-rune-circle-dashed" />
          <circle cx="${cx}" cy="${cy}" r="110" fill="none" stroke="rgba(56, 189, 248, 0.22)" stroke-width="1.1" stroke-dasharray="4 8" class="ccx-rune-circle-thin" />
        </g>

        <!-- Concentric Web Polygons -->
        ${ringsSvg}

        <!-- Axis Spokes & Labels -->
        ${spokesSvg}

        <!-- Morphing Attribute Polygon (Hardware-accelerated vector glow without feGaussianBlur) -->
        <polygon points="${polyPointsStr}" fill="none" stroke="rgba(254, 235, 179, 0.26)" stroke-width="6" stroke-linejoin="round" />
        <polygon points="${polyPointsStr}" fill="url(#ccxRadarFillGrad)" stroke="#FEEBB3" stroke-width="2" stroke-linejoin="round" class="ccx-radar-active-poly" />

        <!-- Vertex Jewels -->
        ${jewelsSvg}

        <!-- Center Core Sigil -->
        <circle cx="${cx}" cy="${cy}" r="3.5" fill="#FEEBB3" stroke="#38bdf8" stroke-width="1" class="ccx-radar-core-dot" />
      </svg>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────────────
 *  5. INTERACTIVE 2D ASTRAL CONSTELLATION LEYLINE MAP ("THE ASTRAL LOOM")
 * ────────────────────────────────────────────────────────────────────────── */

export function buildAstralConstellationSvg(currentStep = 1, maxUnlockedStep = 1, labels = []) {
  if (!Boolean(getSetting("ccxEnabled", true)) || !Boolean(getSetting("ccxConstellationPan", true))) {
    return "";
  }

  const labelArr = Array.isArray(labels) ? labels : [
    labels.lineage || "Lineage",
    labels.attrs || "Attributes",
    labels.vitality || "Stats & HP",
    labels.bops || "Past & Calling",
    labels.talent || "Talents & Magic",
    "Character Overview",
  ];

  const stars = [
    { step: 1, x: 90,  y: 42, title: "I. ORIGIN",     sub: labelArr[0] || "Lineage" },
    { step: 2, x: 255, y: 26, title: "II. MATRIX",    sub: labelArr[1] || "Attributes" },
    { step: 3, x: 420, y: 46, title: "III. VITALITY", sub: labelArr[2] || "Stats & HP" },
    { step: 4, x: 585, y: 24, title: "IV. CALLING",   sub: labelArr[3] || "Past & Calling" },
    { step: 5, x: 750, y: 44, title: "V. TALENTS",    sub: labelArr[4] || "Talents & Magic" },
    { step: 6, x: 910, y: 30, title: "VI. OVERVIEW",  sub: labelArr[5] || "Character Overview" },
  ];

  // Leyline segments between stars
  const linesSvg = [];
  for (let i = 0; i < stars.length - 1; i++) {
    const a = stars[i];
    const b = stars[i + 1];
    const isEnergized = currentStep > a.step;
    const isUnlocked = maxUnlockedStep > a.step;
    linesSvg.push(`
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
            stroke="rgba(36, 105, 117, 0.45)" stroke-width="2" stroke-dasharray="5 5"
            class="ccx-leyline-base ${isUnlocked ? "unlocked" : ""}" />
      ${isEnergized ? `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#FEEBB3" stroke-width="3" stroke-dasharray="10 5" class="ccx-leyline-energy" />` : ""}
    `);
  }

  const nodesSvg = stars.map(s => {
    const isActive = s.step === currentStep;
    const isDone = s.step < currentStep;
    const isUnlocked = s.step <= maxUnlockedStep;
    const stateCls = isActive ? "is-active" : isDone ? "is-done" : isUnlocked ? "is-unlocked" : "is-locked";
    const coreFill = isActive ? "rgba(180, 130, 35, 0.38)" : isDone ? "rgba(6, 78, 59, 0.92)" : "rgba(13, 25, 34, 0.95)";
    const coreStroke = isActive ? "#FEEBB3" : isDone ? "#34d399" : "rgba(56, 189, 248, 0.55)";
    const textFill = isActive ? "#FEEBB3" : isDone ? "#6ee7b7" : "#cbd5e1";

    return `
      <g class="ccx-constellation-star ${stateCls}" data-action="jumpToStep" data-step="${s.step}" transform="translate(${s.x}, ${s.y})">
        ${isActive ? `
          <circle cx="0" cy="0" r="21" fill="none" stroke="rgba(254, 235, 179, 0.65)" stroke-width="1.5" stroke-dasharray="5 4" class="ccx-star-orbit-ring" />
          <circle cx="0" cy="0" r="16" fill="rgba(254, 235, 179, 0.12)" stroke="rgba(56, 189, 248, 0.5)" stroke-width="1" class="ccx-star-pulse-halo" />
        ` : ""}
        <circle cx="0" cy="0" r="${isActive ? 12 : 10}" fill="${coreFill}" stroke="${coreStroke}" stroke-width="2" class="ccx-star-core" />
        <text x="0" y="3.5" text-anchor="middle" fill="${textFill}" font-family="Cinzel, serif" font-size="10.5" font-weight="800" class="ccx-star-num">${s.step}</text>
        <text x="0" y="${s.y < 34 ? 25 : -16}" text-anchor="middle" fill="${textFill}" font-family="Cinzel, serif" font-size="9.5" font-weight="700" class="ccx-star-title">${s.title}</text>
      </g>
    `;
  }).join("");

  return `
    <div class="ccx-astral-loom-bar">
      <svg viewBox="0 0 1000 72" preserveAspectRatio="xMidYMid meet" class="ccx-astral-svg">
        ${linesSvg.join("")}
        ${nodesSvg}
      </svg>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────────────
 *  6. CINEMATIC STAGE CALLOUT BANNERS & HERO AWAKENING FINALE
 * ────────────────────────────────────────────────────────────────────────── */

const STAGE_CALLOUT_TITLES = {
  1: { numeral: "STAGE I",   title: "ANCESTRAL ORIGIN",            sub: "Forge your lineage, sublineage, and ancestral traits" },
  2: { numeral: "STAGE II",  title: "THE ABILITY MATRIX",          sub: "Shape your core physical, mental, and metaphysical attributes" },
  3: { numeral: "STAGE III", title: "VITALITY & DEFENSES",         sub: "Anchor your Endurance threshold, Hit Points, and Action Points" },
  4: { numeral: "STAGE IV",  title: "PAST & CALLING",              sub: "Claim your background, skill masteries, and profession rank" },
  5: { numeral: "STAGE V",   title: "SPECIALIZATION & ARCANA",     sub: "Unlock your starting talent stack and magical disciplines" },
  6: { numeral: "STAGE VI",  title: "CHARACTER OVERVIEW",          sub: "Review your complete build hierarchy and awaken your hero" },
};

export function triggerStageCalloutBanner(rootEl, stepNumber) {
  if (!rootEl) return;
  if (!Boolean(getSetting("ccxEnabled", true)) || !Boolean(getSetting("ccxCinematicFinale", true))) return;

  const info = STAGE_CALLOUT_TITLES[stepNumber];
  if (!info) return;

  let existing = rootEl.querySelector(".ccx-stage-callout-overlay");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "ccx-stage-callout-overlay";
  banner.innerHTML = `
    <div class="ccx-callout-inner">
      <div class="ccx-callout-line left"></div>
      <div class="ccx-callout-text">
        <span class="ccx-callout-kicker">${info.numeral}</span>
        <h3 class="ccx-callout-title">${info.title}</h3>
        <span class="ccx-callout-sub">${info.sub}</span>
      </div>
      <div class="ccx-callout-line right"></div>
    </div>
  `;
  rootEl.appendChild(banner);
  setTimeout(() => banner.remove(), 3200);
}

/**
 * Plays a dramatic 2.9-second Hero Awakening / Level-Up Ascension convergence sequence.
 */
export async function playAwakeningFinaleSequence(rootEl, actor, headline = "HERO AWAKENED", subtitle = "Level 1 Adventurer Forged") {
  if (!rootEl || !Boolean(getSetting("ccxEnabled", true)) || !Boolean(getSetting("ccxCinematicFinale", true))) {
    return;
  }

  CcxSound.playAwakenFinale();

  const overlay = document.createElement("div");
  overlay.className = "ccx-awakening-finale-overlay";
  overlay.innerHTML = `
    <div class="ccx-finale-magic-circle outer"></div>
    <div class="ccx-finale-magic-circle inner"></div>
    <div class="ccx-finale-rays"></div>
    <div class="ccx-finale-centerpiece">
      <div class="ccx-finale-portrait-wrap">
        <img src="${actor?.img || "icons/svg/mystery-man.svg"}" alt="${actor?.name || "Hero"}" />
      </div>
      <span class="ccx-finale-kicker"><i class="fas fa-sparkles"></i> ${headline} <i class="fas fa-sparkles"></i></span>
      <h1 class="ccx-finale-actor-name">${actor?.name || "Hero"}</h1>
      <p class="ccx-finale-subtitle">${subtitle}</p>
    </div>
  `;

  rootEl.appendChild(overlay);
  await new Promise(resolve => setTimeout(resolve, 2900));
}

/* ───────────────────────────────────────────────────────────────────────────
 *  7. 3D ASTRAL CONSTELLATION TALENT TREE MAP ("YOUR CHARACTER" TAB)
 * ────────────────────────────────────────────────────────────────────────── */

function hashString(str = "") {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function cleanPrerequisiteName(raw = "") {
  return String(raw || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkNodes(list = [], maxPerRow = 3) {
  const chunks = [];
  for (let i = 0; i < list.length; i += maxPerRow) {
    chunks.push(list.slice(i, i + maxPerRow));
  }
  return chunks;
}

/**
 * Builds a clean, non-overlapping Constellation Graph for a single track:
 * - Row 0: The Parent Node (start of the track)
 * - Next Row(s): Talents already taken in this track (max 3 per row)
 * - Final Row(s): Next available talents in this track (max 3 per row)
 * - Zero locked/unavailable nodes!
 */
function buildFocusedConstellationGraph(parentNode, remainingTaken = [], availableNodes = [], trackKey = "") {
  const rows = [];
  if (parentNode) {
    rows.push([{ ...parentNode, isParentRoot: true }]);
  }

  // Group remaining taken nodes by tier, max 3 per row
  const takenByTier = new Map();
  for (const n of remainingTaken) {
    const tNum = n.tier || 2;
    if (!takenByTier.has(tNum)) takenByTier.set(tNum, []);
    takenByTier.get(tNum).push(n);
  }
  const sortedTakenTiers = Array.from(takenByTier.entries()).sort((a, b) => a[0] - b[0]);
  for (const [, tGroup] of sortedTakenTiers) {
    rows.push(...chunkNodes(tGroup, 3));
  }

  const lastTakenRowIndex = Math.max(0, rows.length - 1);

  // Add next available nodes, max 3 per row
  if (availableNodes.length > 0) {
    rows.push(...chunkNodes(availableNodes, 3));
  }

  const numRows = rows.length;
  const canvasHeight = Math.max(290, numRows * 168 + 64);

  const placedNodes = [];
  const rowPlacedGroups = [];
  const singleWaveSlots = [50, 36, 64, 38, 62, 44, 56];

  rows.forEach((rowNodes, rIdx) => {
    const count = rowNodes.length;
    const baseYPct = numRows <= 1
      ? 50
      : 13 + (rIdx / (numRows - 1)) * 73;

    const placedRow = [];
    rowNodes.forEach((node, nIdx) => {
      let xPct = 50;
      let yPct = baseYPct;

      if (rIdx === 0) {
        xPct = 50;
        yPct = baseYPct;
      } else if (count === 1) {
        xPct = singleWaveSlots[rIdx % singleWaveSlots.length];
      } else if (count === 2) {
        xPct = nIdx === 0 ? 28 : 72;
        yPct = baseYPct + (nIdx === 0 ? -1.8 : 1.8);
      } else {
        const slots = [18, 50, 82];
        xPct = slots[nIdx] ?? 50;
        yPct = baseYPct + (nIdx === 1 ? -2.2 : 1.8);
      }

      xPct = +Math.max(14, Math.min(86, xPct)).toFixed(2);
      yPct = +Math.max(11, Math.min(89, yPct)).toFixed(2);

      const starNode = {
        ...node,
        xPct,
        yPct,
        svgX: +(xPct * 10).toFixed(1),
        svgY: +(yPct * 10).toFixed(1),
        tierNumber: node.tier || (rIdx + 1),
      };

      placedNodes.push(starNode);
      placedRow.push(starNode);
    });

    rowPlacedGroups.push(placedRow);
  });

  // Build SVG constellation star-lines between Parent -> Taken -> Next Available
  const edges = [];
  const edgeKeys = new Set();

  const addEdge = (fromNode, toNode) => {
    if (!fromNode || !toNode || fromNode.id === toNode.id) return;
    const key = `${fromNode.id}->${toNode.id}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);

    const fromActive = Boolean(fromNode.isOwned || fromNode.isSelectedForLevelUp);
    const toActive = Boolean(toNode.isOwned || toNode.isSelectedForLevelUp);
    const isEnergized = fromActive && toActive;
    const isUnlockable = fromActive && Boolean(toNode.isAvailable) && !toActive;

    edges.push({
      x1: fromNode.svgX,
      y1: fromNode.svgY,
      x2: toNode.svgX,
      y2: toNode.svgY,
      midX: +((fromNode.svgX + toNode.svgX) / 2).toFixed(1),
      midY: +((fromNode.svgY + toNode.svgY) / 2).toFixed(1),
      isEnergized,
      isUnlockable,
      stroke: isEnergized ? "#FEEBB3" : "#38bdf8",
      strokeWidth: isEnergized ? "3.2" : "2.4",
      dashArray: isEnergized ? "" : "9 6",
      stateClass: isEnergized ? "edge-energized" : "edge-unlockable",
    });
  };

  const allTakenPlaced = rowPlacedGroups.slice(0, lastTakenRowIndex + 1).flat();
  const deepestTakenGroup = rowPlacedGroups[lastTakenRowIndex] || rowPlacedGroups[0] || [];

  for (let rIdx = 1; rIdx < rowPlacedGroups.length; rIdx++) {
    const currentGroup = rowPlacedGroups[rIdx];
    const earlierTaken = rowPlacedGroups.slice(0, Math.min(rIdx, lastTakenRowIndex + 1)).flat();

    for (const node of currentGroup) {
      const matchedParents = [];
      const candidateNames = [
        ...(Array.isArray(node.prerequisites) ? node.prerequisites : []),
        ...(Array.isArray(node.parentNames) ? node.parentNames : []),
      ];

      for (const reqRaw of candidateNames) {
        const cleanReq = cleanPrerequisiteName(reqRaw);
        const exactMatch = earlierTaken.find(
          en => cleanPrerequisiteName(en.name) === cleanReq || String(en.name || "").toLowerCase().trim() === String(reqRaw || "").toLowerCase().trim()
        );
        if (exactMatch && !matchedParents.includes(exactMatch)) {
          matchedParents.push(exactMatch);
        }
      }

      if (matchedParents.length === 0) {
        const baseStem = cleanPrerequisiteName(node.name).replace(/\b(ii|iii|iv|v|2|3|4|5)\b$/, "").trim();
        if (baseStem) {
          const stemParent = [...earlierTaken].reverse().find(en => {
            const enClean = cleanPrerequisiteName(en.name);
            return enClean === baseStem || enClean.startsWith(baseStem) || enClean.endsWith(baseStem);
          });
          if (stemParent) matchedParents.push(stemParent);
        }
      }

      if (matchedParents.length === 0) {
        if (node.isOwned || node.isSelectedForLevelUp) {
          const prevTakenGroup = rowPlacedGroups[rIdx - 1] || rowPlacedGroups[0] || [];
          const sorted = [...prevTakenGroup].sort((a, b) => Math.abs(a.xPct - node.xPct) - Math.abs(b.xPct - node.xPct));
          if (sorted[0]) matchedParents.push(sorted[0]);
        } else {
          // Available node: connect from nearest node in deepest taken row (or root parent star)
          const anchorPool = deepestTakenGroup.length > 0 ? deepestTakenGroup : allTakenPlaced;
          const sorted = [...anchorPool].sort((a, b) => Math.abs(a.xPct - node.xPct) - Math.abs(b.xPct - node.xPct));
          if (sorted[0]) matchedParents.push(sorted[0]);
        }
      }

      for (const parent of matchedParents) {
        addEdge(parent, node);
      }
    }
  }

  const bgStars = Array.from({ length: 14 }, (_, idx) => {
    const h = hashString(`${trackKey}:bgstar:${idx}`);
    const sx = 30 + (h % 940);
    const sy = 30 + ((h >>> 7) % 940);
    const sr = Math.max(1.0, 1 + ((h >>> 13) % 3) * 0.65);
    const isGold = idx % 3 === 0;
    const op = Math.max(0.15, Math.min(0.85, 0.18 + ((h % 5) * 0.08))).toFixed(2);
    return {
      cx: sx,
      cy: sy,
      r: sr.toFixed(1),
      fill: isGold ? `rgba(254, 235, 179, ${op})` : `rgba(56, 189, 248, ${op})`,
    };
  });

  return {
    canvasHeight,
    nodes: placedNodes,
    edges,
    bgStars,
  };
}

/**
 * Normalizes track titles so compendium spacing typos (e.g. "PSIONICMAGIC TRACK" vs "PSIONIC MAGIC TRACK")
 * merge cleanly into a single unified constellation star.
 */
function normalizeNebulaTrackTitle(rawTitle = "") {
  return String(rawTitle || "")
    .toUpperCase()
    .replace(/([A-Z])(MAGIC\b)/g, "$1 $2")
    .replace(/([A-Z])(TRACK\b)/g, "$1 $2")
    .replace(/\bMAGIC\s+MAGIC\b/g, "MAGIC")
    .replace(/\bCLASS\s+CLASS\b/g, "CLASS")
    .replace(/\bTRACK\s+TRACK\b/g, "TRACK")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSubclassDisplayName(rawTrackTitle = "", treeTitle = "") {
  let clean = normalizeNebulaTrackTitle(rawTrackTitle)
    .replace(/\bTRACK\b$/i, "")
    .replace(/\bSTACK\b$/i, "")
    .trim();
  if (!clean) clean = normalizeNebulaTrackTitle(treeTitle);
  return clean;
}

/**
 * Builds a multi-arm Subclass Constellation Graph for a Class or Magic Tree:
 * - Top Center: The Class / Discipline Root Star(s) (e.g. "Oracle Entry Talent").
 * - Radiating Subclass Branch Arms below the Root Star:
 *   - Started Subclasses (owned talents + next available in that subclass) appear first with energized gold lines.
 *   - Other Subclasses in the class that have unlocked/available talents get their own Subclass Branch Arms.
 *   - Locked/unavailable talents are never included.
 */
function buildBranchingSubclassConstellationGraph(parentNode, extraEntryNodes = [], subclassBranches = [], trackKey = "") {
  if (!subclassBranches || subclassBranches.length === 0) {
    return {
      ...buildFocusedConstellationGraph(parentNode, extraEntryNodes, [], trackKey),
      branchHeaders: [],
    };
  }

  // Raw pixel coordinates (converted to % of canvasHeight at the end so zero overlap is guaranteed)
  const rawNodes = [];
  const rawHeaders = [];
  const edgesRaw = [];

  // 1. Place Class Root Star(s) at the top center (yPx = 92)
  const rootY = 92;
  const allRootEntries = [
    ...(parentNode ? [{ ...parentNode, isParentRoot: true }] : []),
    ...extraEntryNodes.map(n => ({ ...n, isParentRoot: false })),
  ];

  const placedRootStars = allRootEntries.map((rNode, idx) => {
    const count = allRootEntries.length;
    const xPct = count === 1 ? 50 : +(34 + (idx / Math.max(1, count - 1)) * 32).toFixed(2);
    const star = {
      ...rNode,
      xPct,
      yPx: rootY,
      tierNumber: 1,
    };
    rawNodes.push(star);
    return star;
  });

  const primaryRootStar = placedRootStars[0] || null;
  for (let i = 1; i < placedRootStars.length; i++) {
    edgesRaw.push({
      from: primaryRootStar,
      to: placedRootStars[i],
      isEnergized: Boolean(placedRootStars[i].isOwned || placedRootStars[i].isSelectedForLevelUp),
    });
  }

  // 2. Partition Subclass Arms into balanced horizontal bands so arms never collide
  //    - Arms with <= 3 visible stars take 1 slot (up to 3 arms side-by-side per band)
  //    - Arms with 4..6 visible stars take 2 slots (up to 2 arms side-by-side)
  //    - Arms with >= 7 visible stars take 3 slots (full width band, 3 stars per row)
  const bands = [];
  let currentBand = [];
  let currentSlots = 0;

  for (const branch of subclassBranches) {
    const totalStars = branch.takenNodes.length + branch.availableNodes.length;
    if (totalStars === 0) continue;
    const slotsNeeded = totalStars >= 7 ? 3 : totalStars >= 4 ? 2 : 1;
    if (currentBand.length > 0 && currentSlots + slotsNeeded > 3) {
      bands.push(currentBand);
      currentBand = [];
      currentSlots = 0;
    }
    currentBand.push({ ...branch, slotsNeeded, totalStars });
    currentSlots += slotsNeeded;
  }
  if (currentBand.length > 0) bands.push(currentBand);

  let cursorY = 235;
  const ROW_STEP_Y = 166;
  const HEADER_TO_FIRST_STAR_Y = 92;
  const BAND_GAP_Y = 64;

  for (const band of bands) {
    const bandCount = band.length;
    let maxBandBottomY = cursorY;

    band.forEach((arm, armIdx) => {
      // Determine horizontal center and width for this Subclass Arm
      let centerX = 50;
      let spreadHalf = 32;
      let maxPerSubRow = 3;

      if (bandCount === 1) {
        centerX = 50;
        spreadHalf = 33;
        maxPerSubRow = arm.totalStars >= 2 ? Math.min(3, arm.totalStars) : 1;
      } else if (bandCount === 2) {
        centerX = armIdx === 0 ? 27 : 73;
        spreadHalf = 14;
        maxPerSubRow = arm.slotsNeeded >= 2 ? 2 : 1;
      } else {
        const centers = [18, 50, 82];
        centerX = centers[armIdx] ?? 50;
        spreadHalf = 10;
        maxPerSubRow = 1;
      }

      // Create Subclass Arm Header Hub
      const headerHub = {
        id: `hub:${arm.branchKey}`,
        title: arm.branchTitle,
        isStarted: arm.takenNodes.length > 0,
        takenCount: arm.takenNodes.length,
        availableCount: arm.availableNodes.length,
        xPct: +centerX.toFixed(2),
        yPx: cursorY,
      };
      rawHeaders.push(headerHub);

      if (primaryRootStar) {
        edgesRaw.push({
          from: primaryRootStar,
          to: headerHub,
          isEnergized: headerHub.isStarted,
        });
      }

      // Build sub-rows inside this Subclass Arm (Taken rows first, then Available rows)
      const armRows = [];
      if (arm.takenNodes.length > 0) {
        const takenByTier = new Map();
        for (const n of arm.takenNodes) {
          const t = n.tier || 1;
          if (!takenByTier.has(t)) takenByTier.set(t, []);
          takenByTier.get(t).push(n);
        }
        const sortedTiers = Array.from(takenByTier.entries()).sort((a, b) => a[0] - b[0]);
        for (const [, tNodes] of sortedTiers) {
          armRows.push(...chunkNodes(tNodes, maxPerSubRow));
        }
      }
      const lastTakenSubRowIdx = armRows.length - 1;

      if (arm.availableNodes.length > 0) {
        armRows.push(...chunkNodes(arm.availableNodes, maxPerSubRow));
      }

      const placedArmRows = [];
      armRows.forEach((subRow, sIdx) => {
        const rowY = cursorY + HEADER_TO_FIRST_STAR_Y + sIdx * ROW_STEP_Y;
        if (rowY > maxBandBottomY) maxBandBottomY = rowY;

        const placedSubRow = [];
        const sCount = subRow.length;
        subRow.forEach((node, nIdx) => {
          let nodeX = centerX;
          if (sCount === 1) {
            const wave = sIdx % 2 === 0 ? 0 : (armIdx % 2 === 0 ? -2.2 : 2.2);
            nodeX = centerX + wave;
          } else if (sCount === 2) {
            nodeX = nIdx === 0 ? centerX - spreadHalf * 0.65 : centerX + spreadHalf * 0.65;
          } else {
            const step = (spreadHalf * 2) / Math.max(1, sCount - 1);
            nodeX = (centerX - spreadHalf) + nIdx * step;
          }

          nodeX = +Math.max(11, Math.min(89, nodeX)).toFixed(2);
          const starNode = {
            ...node,
            subclassLabel: arm.branchTitle,
            xPct: nodeX,
            yPx: rowY,
            tierNumber: node.tier || (sIdx + 1),
          };
          rawNodes.push(starNode);
          placedSubRow.push(starNode);
        });
        placedArmRows.push(placedSubRow);
      });

      // Connect Subclass Header Hub -> First row of stars in this Subclass Arm
      if (placedArmRows[0]) {
        for (const firstStar of placedArmRows[0]) {
          edgesRaw.push({
            from: headerHub,
            to: firstStar,
            isEnergized: Boolean(firstStar.isOwned || firstStar.isSelectedForLevelUp),
          });
        }
      }

      // Connect stars down the Subclass Arm
      const allArmTaken = lastTakenSubRowIdx >= 0
        ? placedArmRows.slice(0, lastTakenSubRowIdx + 1).flat()
        : [];
      const deepestArmTaken = lastTakenSubRowIdx >= 0
        ? (placedArmRows[lastTakenSubRowIdx] || [])
        : [];

      for (let sIdx = 1; sIdx < placedArmRows.length; sIdx++) {
        const currRow = placedArmRows[sIdx];
        const prevRow = placedArmRows[sIdx - 1] || [];

        for (const node of currRow) {
          const isNodeActive = Boolean(node.isOwned || node.isSelectedForLevelUp);
          let anchorPool = prevRow;
          if (!isNodeActive) {
            anchorPool = deepestArmTaken.length > 0 ? deepestArmTaken : (allArmTaken.length > 0 ? allArmTaken : [headerHub]);
          }
          const sortedAnchors = [...anchorPool].sort((a, b) => Math.abs(a.xPct - node.xPct) - Math.abs(b.xPct - node.xPct));
          if (sortedAnchors[0]) {
            edgesRaw.push({
              from: sortedAnchors[0],
              to: node,
              isEnergized: isNodeActive && Boolean(sortedAnchors[0].isOwned || sortedAnchors[0].isSelectedForLevelUp || sortedAnchors[0].isStarted),
            });
          }
        }
      }
    });

    cursorY = maxBandBottomY + ROW_STEP_Y + BAND_GAP_Y;
  }

  const canvasHeight = Math.max(420, cursorY - BAND_GAP_Y + 45);

  // Convert all yPx into yPct (0..100) and svgX/svgY (0..1000)
  for (const node of rawNodes) {
    node.yPct = +Math.max(8, Math.min(93, (node.yPx / canvasHeight) * 100)).toFixed(2);
    node.svgX = +(node.xPct * 10).toFixed(1);
    node.svgY = +(node.yPct * 10).toFixed(1);
  }

  for (const hub of rawHeaders) {
    hub.yPct = +Math.max(8, Math.min(93, (hub.yPx / canvasHeight) * 100)).toFixed(2);
    hub.svgX = +(hub.xPct * 10).toFixed(1);
    hub.svgY = +(hub.yPct * 10).toFixed(1);
  }

  const edges = edgesRaw.map(e => {
    const isEnergized = Boolean(e.isEnergized);
    return {
      x1: e.from.svgX,
      y1: e.from.svgY,
      x2: e.to.svgX,
      y2: e.to.svgY,
      midX: +((e.from.svgX + e.to.svgX) / 2).toFixed(1),
      midY: +((e.from.svgY + e.to.svgY) / 2).toFixed(1),
      isEnergized,
      isUnlockable: !isEnergized,
      stroke: isEnergized ? "#FEEBB3" : "#38bdf8",
      strokeWidth: isEnergized ? "3.2" : "2.2",
      dashArray: isEnergized ? "" : "8 6",
      stateClass: isEnergized ? "edge-energized" : "edge-unlockable",
    };
  });

  const bgStars = Array.from({ length: 16 }, (_, idx) => {
    const h = hashString(`${trackKey}:bgstar:${idx}`);
    const sx = 30 + (h % 940);
    const sy = 30 + ((h >>> 7) % 940);
    const sr = Math.max(1.0, 1 + ((h >>> 13) % 3) * 0.65);
    const isGold = idx % 3 === 0;
    const op = Math.max(0.15, Math.min(0.85, 0.18 + ((h % 5) * 0.08))).toFixed(2);
    return {
      cx: sx,
      cy: sy,
      r: sr.toFixed(1),
      fill: isGold ? `rgba(254, 235, 179, ${op})` : `rgba(56, 189, 248, ${op})`,
    };
  });

  return {
    canvasHeight,
    nodes: rawNodes,
    branchHeaders: rawHeaders,
    edges,
    bgStars,
  };
}

/**
 * Plays a lightweight GPU-composited camera zoom transition on the Galaxy / Constellation viewport
 * before invoking `onComplete()` to re-render the view.
 */
export function playGalaxyZoomAnimation(rootEl, targetEl, direction = "in", onComplete) {
  if (!rootEl) {
    onComplete?.();
    return;
  }

  const galaxyMap = rootEl.querySelector(".ccx-galaxy-overview-map");
  const focusedView = rootEl.querySelector(".ccx-galaxy-focused-constellation");

  if (direction === "in" && galaxyMap) {
    const cluster = targetEl?.closest?.(".ccx-galaxy-star-cluster") || targetEl;
    const gx = cluster?.dataset?.galaxyX || "50";
    const gy = cluster?.dataset?.galaxyY || "50";
    galaxyMap.style.transformOrigin = `${gx}% ${gy}%`;
    galaxyMap.classList.add("is-zooming-into-constellation");
    CcxSound.playStagePan();
    setTimeout(() => {
      onComplete?.();
    }, 240);
    return;
  }

  if (direction === "out" && focusedView) {
    focusedView.classList.add("is-zooming-out-to-galaxy");
    CcxSound.playStagePan();
    setTimeout(() => {
      onComplete?.();
    }, 210);
    return;
  }

  onComplete?.();
}

/**
 * Builds the flat list of Character Constellation Nodes for the unified "Your Character" Gallery tab.
 * - Class & Magic Trees are grouped into a single main Class/Discipline Node in the Gallery,
 *   displaying their started Subclasses right underneath the Class Node.
 * - Clicking a Class/Magic Node zooms into a multi-arm Subclass Constellation showing each
 *   Subclass as its own branching arm (only Taken and Available talents).
 * - Specialization Tracks appear as their own Track Nodes.
 */
export function buildCharacterNebulaTracks(rootTrees = [], expandedTrackSet = new Set()) {
  if (!Array.isArray(rootTrees)) return [];
  const rawGalleryEntries = [];

  for (const tree of rootTrees) {
    const entryTalents = Array.isArray(tree.entryTalents) ? tree.entryTalents : [];
    const ownedEntries = entryTalents.filter(n => n.isOwned || n.isSelectedForLevelUp);
    const availableEntries = entryTalents.filter(n => n.isAvailable && !n.isOwned && !n.isSelectedForLevelUp);
    const tracks = Array.isArray(tree.tracks) ? tree.tracks : [];

    // ── CLASS & MAGIC TREES: Group Subclasses under the main Class/Discipline Node ──
    if (tree.category === "class" || tree.category === "magic") {
      const branchMap = new Map();

      for (const track of tracks) {
        const sortedNodes = [...(track.nodes || [])].sort((a, b) => {
          const tDiff = (a.tier || 1) - (b.tier || 1);
          return tDiff !== 0 ? tDiff : String(a.name || "").localeCompare(String(b.name || ""));
        });
        const takenNodes = sortedNodes.filter(n => n.isOwned || n.isSelectedForLevelUp);
        const availableNodes = sortedNodes.filter(n => n.isAvailable && !n.isOwned && !n.isSelectedForLevelUp);

        if (takenNodes.length === 0 && availableNodes.length === 0) continue;

        const branchTitle = cleanSubclassDisplayName(track.subclassName || track.trackTitle, tree.title);
        const branchKey = normalizeNebulaTrackTitle(branchTitle);

        const existing = branchMap.get(branchKey);
        if (!existing) {
          branchMap.set(branchKey, {
            branchKey,
            branchTitle,
            takenNodes: [...takenNodes],
            availableNodes: [...availableNodes],
          });
        } else {
          const seenTaken = new Set(existing.takenNodes.map(n => n.id || n.name));
          for (const n of takenNodes) {
            const k = n.id || n.name;
            if (!seenTaken.has(k)) {
              seenTaken.add(k);
              existing.takenNodes.push(n);
            }
          }
          const seenAvail = new Set(existing.availableNodes.map(n => n.id || n.name));
          for (const n of availableNodes) {
            const k = n.id || n.name;
            if (!seenAvail.has(k) && !seenTaken.has(k)) {
              seenAvail.add(k);
              existing.availableNodes.push(n);
            }
          }
        }
      }

      const allBranches = Array.from(branchMap.values());
      const startedBranches = allBranches.filter(b => b.takenNodes.length > 0);
      const isClassStarted = ownedEntries.length > 0 || startedBranches.length > 0;
      if (!isClassStarted) continue;

      // Sort started subclasses first, then available subclasses alphabetically
      allBranches.sort((a, b) => {
        const aStarted = a.takenNodes.length > 0 ? 1 : 0;
        const bStarted = b.takenNodes.length > 0 ? 1 : 0;
        if (aStarted !== bStarted) return bStarted - aStarted;
        return a.branchTitle.localeCompare(b.branchTitle);
      });

      const allTakenInTree = [
        ...ownedEntries,
        ...startedBranches.flatMap(b => b.takenNodes),
      ];
      const allAvailableInTree = [
        ...availableEntries,
        ...allBranches.flatMap(b => b.availableNodes),
      ];

      // Determine the Class Root Star (Entry Talent if owned, otherwise first taken talent)
      let parentNode = ownedEntries[0] || allTakenInTree[0];
      let extraEntryNodes = [];
      if (ownedEntries.length > 0) {
        extraEntryNodes = [...ownedEntries.slice(1), ...availableEntries];
      } else if (allBranches.length > 0 && allBranches[0].takenNodes.length > 0) {
        // First taken talent becomes root; remove it from its branch so it isn't duplicated
        parentNode = allBranches[0].takenNodes[0];
        allBranches[0] = {
          ...allBranches[0],
          takenNodes: allBranches[0].takenNodes.slice(1),
        };
      }

      const cleanTitle = normalizeNebulaTrackTitle(tree.displayTitle || tree.title);
      const startedSubclasses = startedBranches.map(b => b.branchTitle);

      rawGalleryEntries.push({
        trackKey: cleanTitle,
        trackTitle: cleanTitle,
        treeTitle: cleanTitle,
        category: tree.category,
        isClassConstellation: true,
        startedSubclasses,
        subclassBranches: allBranches,
        parentNode,
        extraEntryNodes,
        takenCount: allTakenInTree.length,
        availableCount: allAvailableInTree.length,
      });
    } else {
      // ── SPECIALIZATION TRACKS: Each started Specialization Track is its own Node ──
      const specMerged = new Map();
      for (const track of tracks) {
        const sortedNodes = [...(track.nodes || [])].sort((a, b) => {
          const tDiff = (a.tier || 1) - (b.tier || 1);
          return tDiff !== 0 ? tDiff : String(a.name || "").localeCompare(String(b.name || ""));
        });
        const takenNodes = sortedNodes.filter(n => n.isOwned || n.isSelectedForLevelUp);
        if (takenNodes.length === 0) continue;
        const availableNodes = sortedNodes.filter(n => n.isAvailable && !n.isOwned && !n.isSelectedForLevelUp);
        const trackKey = normalizeNebulaTrackTitle(track.trackTitle);

        const existing = specMerged.get(trackKey);
        if (!existing) {
          specMerged.set(trackKey, {
            trackKey,
            trackTitle: trackKey,
            treeTitle: tree.displayTitle || tree.title,
            category: tree.category,
            takenNodes: [...takenNodes],
            availableNodes: [...availableNodes],
          });
        } else {
          existing.takenNodes.push(...takenNodes);
          existing.availableNodes.push(...availableNodes);
        }
      }

      for (const spec of specMerged.values()) {
        const sortedTaken = [...spec.takenNodes].sort((a, b) => (a.tier || 1) - (b.tier || 1));
        rawGalleryEntries.push({
          trackKey: spec.trackKey,
          trackTitle: spec.trackTitle,
          treeTitle: spec.treeTitle,
          category: spec.category,
          isClassConstellation: false,
          startedSubclasses: [],
          parentNode: sortedTaken[0],
          remainingTaken: sortedTaken.slice(1),
          availableNodes: spec.availableNodes,
          takenCount: sortedTaken.length,
          availableCount: spec.availableNodes.length,
        });
      }
    }
  }

  const total = rawGalleryEntries.length;
  const nebulaTracks = [];

  for (let idx = 0; idx < total; idx++) {
    const entry = rawGalleryEntries[idx];
    const isExpanded = Boolean(expandedTrackSet?.has(entry.trackKey));

    // Calculate balanced 2D Galaxy Orbit coordinates around (50%, 50%)
    let rx = 34;
    let ry = 31;
    let angle = -Math.PI / 2;

    if (total === 1) {
      rx = 0;
      ry = -26;
      angle = 0;
    } else if (total <= 8) {
      angle = -Math.PI / 2 + (idx * 2 * Math.PI) / total;
      const stagger = total >= 5 ? (idx % 2 === 0 ? 2.5 : -2.5) : 0;
      rx = 34 + stagger;
      ry = 31 + stagger;
    } else {
      const innerCount = Math.min(6, Math.ceil(total * 0.45));
      if (idx < innerCount) {
        angle = -Math.PI / 2 + (idx * 2 * Math.PI) / innerCount;
        rx = 22;
        ry = 20;
      } else {
        const outerIdx = idx - innerCount;
        const outerCount = total - innerCount;
        angle = -Math.PI / 2 + (outerIdx * 2 * Math.PI) / outerCount + (Math.PI / outerCount);
        rx = 39;
        ry = 36;
      }
    }

    const gx = total === 1 ? 50 : Math.max(12, Math.min(88, 50 + Math.cos(angle) * rx));
    const gy = total === 1 ? 26 : Math.max(13, Math.min(86, 50 + Math.sin(angle) * ry));

    let constellation = null;
    if (isExpanded) {
      if (entry.isClassConstellation) {
        constellation = buildBranchingSubclassConstellationGraph(
          entry.parentNode,
          entry.extraEntryNodes,
          entry.subclassBranches,
          entry.trackKey
        );
      } else {
        constellation = {
          ...buildFocusedConstellationGraph(
            entry.parentNode,
            entry.remainingTaken,
            entry.availableNodes,
            entry.trackKey
          ),
          branchHeaders: [],
        };
      }
    }

    nebulaTracks.push({
      trackKey: entry.trackKey,
      trackTitle: entry.trackTitle,
      treeTitle: entry.treeTitle,
      category: entry.category,
      isClassConstellation: entry.isClassConstellation,
      startedSubclasses: entry.startedSubclasses,
      parentNode: entry.parentNode,
      takenCount: entry.takenCount,
      availableCount: entry.availableCount,
      hasChildNodes: entry.takenCount > 1 || entry.availableCount > 0,
      isExpanded,
      galaxyX: gx.toFixed(1),
      galaxyY: gy.toFixed(1),
      galaxySvgX: Math.round(gx * 10),
      galaxySvgY: Math.round(gy * 10),
      constellation,
    });
  }

  return nebulaTracks;
}

export function decorateTreesWithConstellationLayout(rootTrees = []) {
  return Array.isArray(rootTrees) ? rootTrees : [];
}


