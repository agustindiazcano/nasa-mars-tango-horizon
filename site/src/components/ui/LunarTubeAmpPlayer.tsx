'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface LunarTubeAmpPlayerProps {
  idPrefix?: string;
  className?: string;
}

const WAVEFORM_BAR_COUNT = 16;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function LunarTubeAmpPlayer({
  idPrefix,
  className = '',
}: LunarTubeAmpPlayerProps = {}) {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const autoId = useId().replace(/:/g, '');
  const inputId = idPrefix || `tube-amp-${autoId}`;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vuLevels, setVuLevels] = useState<[number, number]>([0, 0]);
  const [spectrum, setSpectrum] = useState<number[]>(() =>
    Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.08)
  );
  const [audioError, setAudioError] = useState<string | null>(null);

  const stopMeterLoop = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setVuLevels([0, 0]);
    setSpectrum(Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.08));
  }, []);

  const ensureWebAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.78;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioCtxRef.current = ctx;
        sourceNodeRef.current = source;
        analyserRef.current = analyser;
      }

      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume().catch(() => {});
      }
      return analyserRef.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!isPlaying) {
      stopMeterLoop();
      return;
    }

    const analyser = analyserRef.current;
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const tick = (now: number) => {
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const len = freqData.length;
        const half = Math.max(1, Math.floor(len / 2));

        let sumL = 0;
        let sumR = 0;
        for (let i = 0; i < half; i++) sumL += freqData[i];
        for (let i = half; i < len; i++) sumR += freqData[i];

        const left = Math.min(1, sumL / (half * 185));
        const right = Math.min(1, sumR / (Math.max(1, len - half) * 185));
        setVuLevels([left, right]);

        const nextBars: number[] = [];
        for (let b = 0; b < WAVEFORM_BAR_COUNT; b++) {
          const bin = Math.min(len - 1, Math.floor((b / WAVEFORM_BAR_COUNT) * len));
          nextBars.push(Math.max(0.1, freqData[bin] / 255));
        }
        setSpectrum(nextBars);
      } else {
        // Fallback smooth analog oscillation if Web Audio is unavailable
        const t = now * 0.006;
        const left = 0.45 + 0.35 * Math.abs(Math.sin(t * 1.4));
        const right = 0.42 + 0.38 * Math.abs(Math.cos(t * 1.15));
        setVuLevels([left, right]);
        setSpectrum(
          Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) =>
            0.18 + 0.65 * Math.abs(Math.sin(t + i * 0.55))
          )
        );
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => stopMeterLoop();
  }, [isPlaying, stopMeterLoop]);

  useEffect(() => {
    return () => {
      stopMeterLoop();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
      try {
        sourceNodeRef.current?.disconnect();
      } catch {
        // Ignore disconnect errors on teardown
      }
      try {
        analyserRef.current?.disconnect();
      } catch {
        // Ignore disconnect errors on teardown
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => {});
      }
      sourceNodeRef.current = null;
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [stopMeterLoop]);

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError(null);

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    ensureWebAudio();
    if (audio.ended || (duration > 0 && audio.currentTime >= duration - 0.1)) {
      audio.currentTime = 0;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setAudioError(
        isEs
          ? 'No se pudo iniciar la reproducción de audio.'
          : 'Unable to start audio playback.'
      );
    }
  };

  const handleScrub = (nextSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = nextSeconds;
    setCurrentTime(nextSeconds);
  };

  const needleDegLeft = -42 + vuLevels[0] * 74;
  const needleDegRight = -42 + vuLevels[1] * 74;
  const knobAngle = -135 + volume * 270;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`tube-amp-container ${isPlaying ? 'is-playing' : ''} ${className}`.trim()}>
      <style>{`
        :where(.tube-amp-container) {
          --tube-wood-base: #3e2723;
          --tube-filament-off: #4a3b3b;
          --tube-filament-on: #ff8800;
          --tube-glow: rgba(255, 155, 50, 0.72);
          --tube-jewel-off: #440000;
          --tube-jewel-on: #ff1e1e;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        :where(.tube-amp-unit) {
          width: 100%;
          max-width: 400px;
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 10px;
          box-shadow: 0 36px 80px rgba(0, 0, 0, 0.85), 0 8px 20px rgba(0, 0, 0, 0.7);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        :where(.tube-amp-wood-case) {
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgba(0, 0, 0, 0.22) 3px, transparent 6px),
            linear-gradient(to right, #26150e, #5d4037 12%, #3e2723 88%, #1a0f0a);
          z-index: 0;
        }
        :where(.tube-amp-tube-bay) {
          position: relative;
          z-index: 2;
          height: 185px;
          margin: 14px 14px 0 14px;
          padding-bottom: 18px;
          background: radial-gradient(circle at 50% 80%, #151210 0%, #070707 85%);
          border-radius: 8px 8px 0 0;
          box-shadow: inset 0 0 36px #000;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 22px;
        }
        :where(.tube-amp-tube) {
          width: 62px;
          height: 122px;
          position: relative;
        }
        :where(.tube-amp-glass) {
          width: 100%;
          height: 100%;
          border-radius: 32px 32px 6px 6px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: radial-gradient(
            circle at 30% 28%,
            rgba(255, 255, 255, 0.18),
            rgba(200, 220, 255, 0.08) 42%,
            rgba(18, 18, 18, 0.52) 95%
          );
          box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.9), 0 8px 18px rgba(0, 0, 0, 0.55);
          position: relative;
          overflow: hidden;
        }
        :where(.tube-amp-plate) {
          position: absolute;
          top: 22px;
          left: 13px;
          right: 13px;
          bottom: 12px;
          background: linear-gradient(90deg, #202020, #454545, #202020);
          border-radius: 4px;
          border: 1px solid #555;
        }
        :where(.tube-amp-heater) {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 52px;
          border-radius: 999px;
          background-color: var(--tube-filament-off);
          transition: background-color 0.9s ease, box-shadow 0.9s ease;
          z-index: 4;
        }
        :where(.tube-amp-container.is-playing .tube-amp-heater) {
          background-color: #fff3d6;
          box-shadow: 0 0 6px #fff, 0 0 14px var(--tube-filament-on), 0 0 28px var(--tube-filament-on);
        }
        :where(.tube-amp-glow) {
          position: absolute;
          inset: -12px;
          background: radial-gradient(circle at 50% 60%, var(--tube-glow) 0%, transparent 65%);
          opacity: 0;
          transition: opacity 0.9s ease;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        :where(.tube-amp-container.is-playing .tube-amp-glow) {
          opacity: 0.92;
        }
        :where(.tube-amp-faceplate) {
          position: relative;
          z-index: 2;
          margin: 0 14px 14px 14px;
          padding: 18px 18px 14px 18px;
          background: linear-gradient(180deg, #e2e4e8 0%, #b4b7be 100%);
          border-radius: 0 0 6px 6px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 -2px 10px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: #1f2937;
        }
        :where(.tube-amp-meters) {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        :where(.tube-amp-vu) {
          width: 112px;
          height: 74px;
          background: #fdf6e3;
          border: 2px solid #4b5563;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
        }
        :where(.tube-amp-vu-backlight) {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(255, 240, 175, 0.85) 15%, transparent 82%);
          opacity: 0.15;
          transition: opacity 0.4s ease;
        }
        :where(.tube-amp-container.is-playing .tube-amp-vu-backlight) {
          opacity: 1;
        }
        :where(.tube-amp-needle) {
          position: absolute;
          bottom: 8px;
          left: 50%;
          width: 2px;
          height: 54px;
          background: #dc2626;
          transform-origin: bottom center;
          transition: transform 0.09s linear;
          z-index: 3;
        }
        :where(.tube-amp-waveform) {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          height: 28px;
          padding: 4px 10px;
          border-radius: 10px;
          background: #11080c;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        :where(.tube-amp-wave-bar) {
          flex: 1;
          border-radius: 10px;
          background: linear-gradient(to top, #f97316, #fbbf24);
          transition: height 0.08s linear;
          min-height: 3px;
        }
        :where(.tube-amp-scrub) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        :where(.tube-amp-scrub-meta) {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 0.7rem;
          font-weight: 700;
          color: #291814;
        }
        :where(.tube-amp-range) {
          width: 100%;
          accent-color: #f97316;
          cursor: pointer;
        }
        :where(.tube-amp-controls) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        :where(.tube-amp-knob-wrap) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        :where(.tube-amp-knob) {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: conic-gradient(#888, #d4d4d8, #888, #d4d4d8, #888);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.45), inset 0 0 4px rgba(0, 0, 0, 0.4);
          position: relative;
        }
        :where(.tube-amp-knob-pointer) {
          position: absolute;
          top: 5px;
          left: 50%;
          width: 2px;
          height: 15px;
          background: #111827;
          transform: translateX(-50%);
          border-radius: 10px;
        }
        :where(.tube-amp-switch-btn) {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.05rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: linear-gradient(180deg, #2a1219 0%, #11080c 100%);
          color: #fff8f1;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transition: transform 0.15s ease, border-color 0.2s ease;
        }
        :where(.tube-amp-switch-btn:hover) {
          border-color: #f97316;
          transform: translateY(-1px);
        }
        :where(.tube-amp-jewel) {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #6b7280;
          background: var(--tube-jewel-off);
          transition: background-color 0.25s ease, box-shadow 0.25s ease;
        }
        :where(.tube-amp-container.is-playing .tube-amp-jewel) {
          background: var(--tube-jewel-on);
          box-shadow: 0 0 14px var(--tube-jewel-on);
        }
        :where(.tube-amp-brand) {
          text-align: center;
          font-size: 0.92rem;
          font-weight: 800;
          letter-spacing: 0.26em;
          color: #374151;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
        }
        :where(.tube-amp-caption) {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          max-width: 460px;
        }
        :where(.tube-amp-caption-title) {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fbbf24;
        }
        :where(.tube-amp-caption-sub) {
          font-size: 0.82rem;
          color: #f3dfd1;
          font-style: italic;
        }
      `}</style>

      <audio
        ref={audioRef}
        src="/audio/neil-armstrong-1969.mp3"
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime || 0);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            isEs
              ? 'No se pudo cargar /audio/neil-armstrong-1969.mp3.'
              : 'Unable to load /audio/neil-armstrong-1969.mp3.'
          );
        }}
      />

      <div className="tube-amp-unit">
        <div className="tube-amp-wood-case" aria-hidden="true" />

        <div className="tube-amp-tube-bay" aria-hidden="true">
          {[0, 1, 2].map((tubeIdx) => (
            <div key={tubeIdx} className="tube-amp-tube">
              <div className="tube-amp-glass">
                <div className="tube-amp-plate" />
                <div className="tube-amp-heater" />
                <div
                  className="tube-amp-glow"
                  style={
                    isPlaying
                      ? {
                          opacity: Math.min(1, 0.55 + (vuLevels[0] + vuLevels[1]) * 0.35),
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="tube-amp-faceplate">
          <div className="tube-amp-meters" aria-hidden="true">
            <div className="tube-amp-vu">
              <div className="tube-amp-vu-backlight" />
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  right: '10px',
                  bottom: 0,
                  borderTop: '1px solid #374151',
                  borderRadius: '50% 50% 0 0',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#374151',
                  letterSpacing: '1px',
                }}
              >
                L . CH
              </span>
              <div
                className="tube-amp-needle"
                style={{ transform: `translateX(-50%) rotate(${needleDegLeft.toFixed(1)}deg)` }}
              />
            </div>

            <div className="tube-amp-vu">
              <div className="tube-amp-vu-backlight" />
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  right: '10px',
                  bottom: 0,
                  borderTop: '1px solid #374151',
                  borderRadius: '50% 50% 0 0',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#374151',
                  letterSpacing: '1px',
                }}
              >
                R . CH
              </span>
              <div
                className="tube-amp-needle"
                style={{ transform: `translateX(-50%) rotate(${needleDegRight.toFixed(1)}deg)` }}
              />
            </div>
          </div>

          <div className="tube-amp-waveform" aria-hidden="true">
            {spectrum.map((level, idx) => (
              <div
                key={idx}
                className="tube-amp-wave-bar"
                style={{
                  height: `${Math.round(level * 100)}%`,
                  opacity: isPlaying ? 0.95 : 0.3,
                }}
              />
            ))}
          </div>

          <div className="tube-amp-scrub">
            <div className="tube-amp-scrub-meta">
              <span>{formatTime(currentTime)}</span>
              <span>{progressPct.toFixed(0)}%</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              id={`${inputId}-scrub`}
              type="range"
              min={0}
              max={duration > 0 ? duration : 1}
              step={0.1}
              value={Math.min(currentTime, duration > 0 ? duration : 1)}
              aria-label={
                isEs
                  ? 'Progreso de reproducción de audio Apollo 11'
                  : 'Apollo 11 audio playback progress'
              }
              className="tube-amp-range"
              onChange={(e) => handleScrub(Number(e.target.value))}
            />
          </div>

          <div className="tube-amp-controls">
            <div className="tube-amp-knob-wrap">
              <div className="tube-amp-knob" style={{ transform: `rotate(${knobAngle}deg)` }}>
                <span className="tube-amp-knob-pointer" />
              </div>
              <label
                htmlFor={`${inputId}-vol`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#374151',
                }}
              >
                <Volume2 size={11} /> Vol
              </label>
              <input
                id={`${inputId}-vol`}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-label={isEs ? 'Volumen del amplificador' : 'Amplifier volume'}
                className="tube-amp-range"
                style={{ width: '74px' }}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>

            <button
              type="button"
              className="tube-amp-switch-btn"
              onClick={handleTogglePlay}
              aria-pressed={isPlaying}
              aria-label={
                isEs
                  ? isPlaying
                    ? 'Pausar transmisión histórica de Neil Armstrong'
                    : 'Reproducir transmisión histórica de Neil Armstrong'
                  : isPlaying
                    ? 'Pause Neil Armstrong historical transmission'
                    : 'Play Neil Armstrong historical transmission'
              }
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>
                {isEs ? (isPlaying ? 'Pausar' : 'Reproducir') : isPlaying ? 'Pause' : 'Play'}
              </span>
            </button>

            <div className="tube-amp-knob-wrap">
              <div className="tube-amp-jewel" aria-hidden="true" />
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#374151',
                }}
              >
                {isEs ? (isPlaying ? 'Activo' : 'En espera') : isPlaying ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>

          <div className="tube-amp-brand">FIDELITY 900</div>
        </div>
      </div>

      <div className="tube-amp-caption">
        <span className="tube-amp-caption-title">
          {isEs
            ? '“Un pequeño paso para el hombre...” — Apollo 11, 20 de julio de 1969'
            : '“One small step for man...” — Apollo 11, July 20, 1969'}
        </span>
        <small className="tube-amp-caption-sub">
          {isEs
            ? 'Transmisión original desde el Mare Tranquillitatis · Activá el amplificador valvular'
            : 'Original transmission from Mare Tranquillitatis · Power on the tube amplifier'}
        </small>
        {audioError && (
          <small style={{ color: '#fca5a5', fontSize: '0.78rem' }}>{audioError}</small>
        )}
      </div>
    </div>
  );
}

export default LunarTubeAmpPlayer;
