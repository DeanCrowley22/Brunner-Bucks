"use client";

import { useEffect } from "react";
import { Coins, Volume2 } from "lucide-react";

export function playCoinDeposit() {
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  master.gain.setValueAtTime(0.62, now);
  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(10, now);
  compressor.ratio.setValueAtTime(5, now);
  master.connect(compressor).connect(ctx.destination);

  const metallicHit = (time: number, base: number, volume: number) => {
    [1, 1.47, 2.19, 3.08].forEach((ratio, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const duration = 0.13 + index * 0.045;

      oscillator.type = index < 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(base * ratio, time);
      oscillator.frequency.exponentialRampToValueAtTime(
        base * ratio * 0.91,
        time + duration,
      );
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(
        volume / (index + 1),
        time + 0.002,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.02);
    });
  };

  [
    [0, 1220, 0.25],
    [0.055, 1510, 0.2],
    [0.118, 1080, 0.23],
    [0.19, 1640, 0.18],
    [0.275, 1320, 0.2],
    [0.37, 1780, 0.16],
  ].forEach(([delay, frequency, volume]) =>
    metallicHit(now + delay, frequency, volume),
  );

  const tray = ctx.createOscillator();
  const trayGain = ctx.createGain();
  tray.type = "triangle";
  tray.frequency.setValueAtTime(165, now + 0.08);
  tray.frequency.exponentialRampToValueAtTime(78, now + 0.5);
  trayGain.gain.setValueAtTime(0.0001, now + 0.08);
  trayGain.gain.exponentialRampToValueAtTime(0.11, now + 0.1);
  trayGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
  tray.connect(trayGain).connect(master);
  tray.start(now + 0.08);
  tray.stop(now + 0.58);

  [1760, 2217, 2637].forEach((frequency, index) => {
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    const time = now + 0.48;

    bell.type = "sine";
    bell.frequency.setValueAtTime(frequency, time);
    bellGain.gain.setValueAtTime(0.0001, time);
    bellGain.gain.exponentialRampToValueAtTime(
      0.12 / (index + 1),
      time + 0.004,
    );
    bellGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.58);
    bell.connect(bellGain).connect(master);
    bell.start(time);
    bell.stop(time + 0.6);
  });

  setTimeout(() => ctx.close(), 1400);
}

export function AwardSubmitControls() {
  return (
    <div className="award-submit-panel simple">
      <button
        className="btn gold award-button"
        onClick={() => playCoinDeposit()}
      >
        <Coins /> Award Brunner Bucks
      </button>
      <CoinSoundButton />
    </div>
  );
}

export function CoinSoundButton() {
  return (
    <button
      type="button"
      className="btn light coin-sound-button"
      onClick={() => playCoinDeposit()}
    >
      <Volume2 /> Play coin sound
    </button>
  );
}

export function AwardCelebration({
  active,
  total,
  count,
}: {
  active: boolean;
  total: number;
  count: number;
  privateMode?: boolean;
}) {
  useEffect(() => {
    if (active) playCoinDeposit();
  }, [active]);

  if (!active) return null;

  return (
    <div className="award-success">
      <span>
        <Coins />
      </span>
      <div>
        <b>{total} Brunner Bucks awarded</b>
        <small>
          Across {count} {count === 1 ? "pupil" : "pupils"}
        </small>
      </div>
    </div>
  );
}
