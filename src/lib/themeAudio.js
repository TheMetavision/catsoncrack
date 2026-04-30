// src/lib/themeAudio.js
//
// Shared theme-audio utility for the four IP brand sites
// (Fuglys / Labrats / Biker Babies / Cats On Crack).
//
// v3 — 2026-04-30 — additive seek/inspect methods for COC v3 progress meter:
//   - seek(seconds)       — scrub to a specific position
//   - getPosition()       — current playback position in seconds
//   - getDuration()       — total track duration in seconds
//   - isLoaded()          — has howl been built (i.e. has user clicked at
//                           least once OR is the audio mid-buffer)
//   These are ADDITIVE — FG/LR/BB don't call them, so existing brand
//   components keep working unchanged. Brands can adopt the new methods
//   later (v4 etc.) if they want the same scrubbing UX.
//
// v2 — 2026-04-29 — fixes for cross-page UX:
//   1. Reset state to 'idle' on init if the persisted state was active playback.
//      Browser autoplay policy means audio cannot legally auto-resume across a
//      page reload without a fresh user click.
//   2. Seek to persisted position only on the FIRST play of a session, not on
//      every play. Within a session we now let Howler's own pause/resume handle
//      position tracking.
//
// Reference build: written for Fuglys, designed to be copied across to the
// other three brand repos without modification. Each brand component imports
// `createThemeAudio(config)` and passes its own brand config (namespace, audio
// src, suppression paths, ARIA brand label).
//
// Uses Howler.js (npm install howler).

import { Howl } from 'howler';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_VOLUME = 0.25;
const SUPPRESSION_FADE_MS = 500;
const STATE_TTL_MS = 24 * 60 * 60_000;
const POSITION_THROTTLE_MS = 1000;

// ─── Storage helpers (per-brand namespacing) ───────────────────────────────

function makeStorage(namespace) {
  const k = (suffix) => `${namespace}_theme_${suffix}`;
  const safeGet = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* private mode etc. — no-op */ }
  };
  const safeRemove = (key) => {
    try { localStorage.removeItem(key); } catch { /* no-op */ }
  };

  return {
    readState() {
      const raw = safeGet(k('state'));
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.savedAt || 0) > STATE_TTL_MS) {
          safeRemove(k('state'));
          return null;
        }
        return parsed;
      } catch {
        safeRemove(k('state'));
        return null;
      }
    },
    writeState(state) {
      safeSet(k('state'), JSON.stringify({ ...state, savedAt: Date.now() }));
    },
    clearState() {
      safeRemove(k('state'));
    },
  };
}

// ─── Suppression matcher ──────────────────────────────────────────────────

function isSuppressed(pathname, patterns) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => p.test(pathname));
}

// ─── Howl factory (lazy) ──────────────────────────────────────────────────

function buildHowl({ src, volume, onEnd }) {
  return new Howl({
    src: [src],
    html5: true,
    preload: 'metadata',
    volume,
    onend: onEnd,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────

export function createThemeAudio(config) {
  const { namespace, src, suppressionPaths, onStateChange, onVolumeChange } = config;

  const storage = makeStorage(namespace);
  const persisted = storage.readState() || {};

  let howl = null;
  let firstPlayThisSession = true;

  const persistedState = persisted.state;
  let state =
    persistedState === 'playing' || persistedState === 'replaying'
      ? 'idle'
      : persistedState || 'idle';

  let volume = typeof persisted.volume === 'number' ? persisted.volume : DEFAULT_VOLUME;
  let lastPositionWrite = 0;
  let positionInterval = null;
  let suppressed = false;
  let destroyed = false;

  function setState(next) {
    if (state === next) return;
    state = next;
    storage.writeState({ state, volume, position: getPosition() });
    onStateChange(state);
  }

  function getPosition() {
    if (!howl) return persisted.position || 0;
    try {
      const t = howl.seek();
      return typeof t === 'number' ? t : 0;
    } catch {
      return 0;
    }
  }

  function getDuration() {
    if (!howl) return 0;
    try {
      const d = howl.duration();
      return typeof d === 'number' ? d : 0;
    } catch {
      return 0;
    }
  }

  function startPositionTracker() {
    stopPositionTracker();
    positionInterval = setInterval(() => {
      if (state !== 'playing' && state !== 'replaying') return;
      const now = Date.now();
      if (now - lastPositionWrite < POSITION_THROTTLE_MS) return;
      lastPositionWrite = now;
      storage.writeState({ state, volume, position: getPosition() });
    }, POSITION_THROTTLE_MS);
  }

  function stopPositionTracker() {
    if (positionInterval) {
      clearInterval(positionInterval);
      positionInterval = null;
    }
  }

  function ensureHowl() {
    if (howl || destroyed) return howl;
    howl = buildHowl({
      src,
      volume,
      onEnd: () => {
        stopPositionTracker();
        storage.writeState({ state: 'ended', volume, position: 0 });
        setState('ended');
      },
    });
    return howl;
  }

  function play() {
    if (suppressed || destroyed) return;
    ensureHowl();
    if (!howl) return;
    if (firstPlayThisSession) {
      firstPlayThisSession = false;
      const resumeAt = persisted.position || 0;
      if (resumeAt > 0 && state !== 'ended') {
        try { howl.seek(resumeAt); } catch { /* no-op */ }
      }
    }
    howl.play();
    setState(state === 'ended' ? 'replaying' : 'playing');
    startPositionTracker();
  }

  function pause() {
    if (!howl) return;
    howl.pause();
    storage.writeState({ state: 'idle', volume, position: getPosition() });
    setState('idle');
    stopPositionTracker();
  }

  function replay() {
    ensureHowl();
    if (!howl) return;
    try { howl.stop(); howl.seek(0); } catch { /* no-op */ }
    howl.play();
    setState('replaying');
    startPositionTracker();
    firstPlayThisSession = false;
  }

  function setVolume(next) {
    volume = Math.max(0, Math.min(1, next));
    if (howl) howl.volume(volume);
    storage.writeState({ state, volume, position: getPosition() });
    if (onVolumeChange) onVolumeChange(volume);
  }

  // v3 — scrub to a specific position. Lazy-loads howl if not yet built.
  function seek(seconds) {
    ensureHowl();
    if (!howl) return;
    const dur = getDuration();
    const clamped = Math.max(0, dur > 0 ? Math.min(dur - 0.05, seconds) : seconds);
    try { howl.seek(clamped); } catch { /* no-op */ }
    storage.writeState({ state, volume, position: clamped });
  }

  function applySuppression(pathname) {
    const shouldSuppress = isSuppressed(pathname, suppressionPaths);
    if (shouldSuppress === suppressed) return;
    suppressed = shouldSuppress;

    if (suppressed) {
      if (howl && (state === 'playing' || state === 'replaying')) {
        try { howl.fade(volume, 0, SUPPRESSION_FADE_MS); } catch { /* no-op */ }
        setTimeout(() => {
          if (!howl) return;
          try { howl.pause(); howl.volume(volume); } catch { /* no-op */ }
        }, SUPPRESSION_FADE_MS + 50);
      }
      stopPositionTracker();
    } else if (!suppressed && (state === 'playing' || state === 'replaying')) {
      setState('idle');
    }
  }

  function handleClick() {
    if (suppressed || destroyed) return;
    if (state === 'idle') play();
    else if (state === 'playing' || state === 'replaying') pause();
    else if (state === 'ended') replay();
  }

  function destroy() {
    destroyed = true;
    stopPositionTracker();
    if (howl) {
      try { howl.unload(); } catch { /* no-op */ }
      howl = null;
    }
  }

  if (typeof window !== 'undefined') {
    applySuppression(window.location.pathname);
  }
  queueMicrotask(() => onStateChange(state));

  return {
    handleClick,
    play,
    pause,
    replay,
    seek,           // v3
    setVolume,
    applySuppression,
    destroy,
    getPosition,    // v3 (now exposed)
    getDuration,    // v3
    isLoaded: () => howl !== null,  // v3
    get state() { return state; },
    get volume() { return volume; },
    get isSuppressed() { return suppressed; },
  };
}

// ─── Convenience: detect prefers-reduced-motion ───────────────────────────

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
