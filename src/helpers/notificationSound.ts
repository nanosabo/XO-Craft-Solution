import { NotificationSignal } from "@src/store/slices/settings.slice";

interface Note {
  frequency: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

type BuiltInSignal = Exclude<NotificationSignal, "custom">;

const patterns: Record<BuiltInSignal, Note[]> = {
  coins: [
    { frequency: 1046.5, start: 0, duration: 0.18, gain: 0.12 },
    { frequency: 1318.5, start: 0.11, duration: 0.2, gain: 0.11 },
    { frequency: 1568, start: 0.22, duration: 0.32, gain: 0.1 },
  ],
  radar: [
    { frequency: 880, start: 0, duration: 0.12, gain: 0.12 },
    { frequency: 660, start: 0.18, duration: 0.16, gain: 0.1 },
    { frequency: 880, start: 0.38, duration: 0.12, gain: 0.09 },
  ],
  soft: [
    { frequency: 523.25, start: 0, duration: 0.35, type: "triangle", gain: 0.1 },
    { frequency: 659.25, start: 0.12, duration: 0.4, type: "triangle", gain: 0.08 },
  ],
};

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
};

const playPattern = (signal: BuiltInSignal) => {
  try {
    const context = getAudioContext();
    const startAt = context.currentTime + 0.02;

    for (const note of patterns[signal] ?? patterns.coins) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = note.type ?? "sine";
      oscillator.frequency.setValueAtTime(
        note.frequency,
        startAt + note.start,
      );

      gain.gain.setValueAtTime(0, startAt + note.start);
      gain.gain.linearRampToValueAtTime(
        note.gain ?? 0.1,
        startAt + note.start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + note.start + note.duration,
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt + note.start);
      oscillator.stop(startAt + note.start + note.duration + 0.02);
    }
  } catch {
    /* Sound is a nice-to-have; never break market updates because of it. */
  }
};

interface CachedSound {
  name: string;
  buffer: AudioBuffer;
}

let cachedSound: CachedSound | null = null;

const dataUrlToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

const playCustomSound = async (name: string) => {
  try {
    const context = getAudioContext();

    if (cachedSound?.name !== name) {
      const sound = await window.electronAPI.getNotificationSound();

      if (!sound) {
        playPattern("coins");
        return;
      }

      const buffer = await context.decodeAudioData(
        dataUrlToArrayBuffer(sound.dataUrl),
      );

      cachedSound = { name, buffer };
    }

    if (!cachedSound) {
      playPattern("coins");
      return;
    }

    const source = context.createBufferSource();
    source.buffer = cachedSound.buffer;
    source.connect(context.destination);
    source.start();
  } catch {
    /* A missing or unsupported file should not break notifications. */
    playPattern("coins");
  }
};

/** Drop the decoded file so a replaced sound is picked up immediately. */
export const invalidateCustomSound = () => {
  cachedSound = null;
};

export const playNotificationSignal = (
  signal: NotificationSignal,
  customSoundName?: string | null,
) => {
  if (signal === "custom") {
    if (customSoundName) {
      void playCustomSound(customSoundName);
    } else {
      playPattern("coins");
    }

    return;
  }

  playPattern(signal);
};
