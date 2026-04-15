import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Delete, Maximize } from 'lucide-react';

// --- Audio System ---
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type: 'click' | 'correct' | 'wrong' | 'tick' | 'tada' | 'countdown' | 'input_whole' | 'input_num' | 'input_den' | 'backspace', isStart?: boolean, isUrgent?: boolean) => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  if (type === 'click') {
    // New click: A crisp, short mechanical tap
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  } else if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
  } else if (type === 'tick') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  } else if (type === 'tada') {
    const playNote = (freq: number, time: number, duration: number) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.connect(g);
        g.connect(audioCtx!.destination);
        o.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.1, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + duration);
        o.start(time);
        o.stop(time + duration);
    };
    playNote(523.25, now, 0.1);
    playNote(659.25, now + 0.1, 0.1);
    playNote(783.99, now + 0.2, 0.1);
    playNote(1046.5, now + 0.3, 0.5);
    return;
  } else if (type === 'countdown') {
    osc.type = 'sine';
    const pitch = isStart ? 1046.5 : (isUrgent ? 880 : 440);
    const duration = isStart ? 0.8 : 0.3;
    osc.frequency.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(isUrgent ? 0.6 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  } else if (type === 'input_whole') {
    // New input_whole: Soft high-pitched blip
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.04);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  } else if (type === 'input_num') {
    // New input_num: Soft mid-pitched pluck
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, now);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  } else if (type === 'input_den') {
    // New input_den: Soft low-pitched resonant thump
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  } else if (type === 'backspace') {
    // New backspace: Short descending sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  } else if (type === 'item' as any) {
    // Item acquisition: Sparkling magic sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(2640, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  }
  
  osc.start(now);
  osc.stop(now + 0.5);
};

// --- Utilities & Game Logic ---

export const DIFFICULTIES = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'CHALLENGER'] as const;
export type Difficulty = typeof DIFFICULTIES[number];

const DIFFICULTY_LABELS: Record<Difficulty, { label: string, emoji: string, desc: string, decimalDesc: string }> = {
  BRONZE: { label: '브론즈', emoji: '🟤', desc: '모두 1자리', decimalDesc: '몫 2자리, 나누는 수 1자리' },
  SILVER: { label: '실버', emoji: '⚪', desc: '2자리 1개', decimalDesc: '몫 3자리, 나누는 수 1자리' },
  GOLD: { label: '골드', emoji: '🟡', desc: '2자리 2개', decimalDesc: '몫 2자리, 나누는 수 2자리' },
  PLATINUM: { label: '플래티넘', emoji: '🔵', desc: '2자리 3개', decimalDesc: '몫 3자리, 나누는 수 2자리' },
  DIAMOND: { label: '다이아', emoji: '💎', desc: '모두 2자리', decimalDesc: '몫 4자리, 나누는 수 2자리' },
  MASTER: { label: '마스터', emoji: '🏅', desc: '3자리 1개', decimalDesc: '몫 3자리, 나누는 수 3자리' },
  CHALLENGER: { label: '챌린저', emoji: '🎖️', desc: '3자리 2개', decimalDesc: '몫 4자리, 나누는 수 3자리' },
};

type WorldType = 'FRACTION' | 'DECIMAL';

type FractionMission = 'MIXED_NATURAL';
type DecimalMission = 
  | 'DECIMAL_NATURAL_NO_CARRY'
  | 'DECIMAL_NATURAL_CARRY'
  | 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1'
  | 'DECIMAL_NATURAL_BRING_DOWN_ZERO'
  | 'DECIMAL_NATURAL_ZERO_IN_QUOTIENT'
  | 'NATURAL_NATURAL'
  | 'DECIMAL_ALL_RANDOM';

type Problem = {
  world: WorldType;
  // Fraction World
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  // Decimal World
  dividend?: number;
  divisor?: number;
  quotient?: number;
};

type GameOptions = {
  world: WorldType;
  fractionMission: FractionMission;
  decimalMission: DecimalMission;
  requireIrreducible: boolean;
  requireMixed: boolean;
  difficulty: Difficulty;
  digitRange: [number, number];
  isItemMode: boolean;
};

type ItemType = 'TIME_PLUS' | 'DOUBLE_SCORE' | 'FEVER_TIME' | 'HIDE_RANDOM' | 'HIDE_OTHERS' | 'HIDE_SELF' | 'SHIELD' | 'SCORE_PLUS_1' | 'SCORE_MINUS_1' | 'SCORE_PLUS_3' | 'SCORE_MINUS_3' | 'SWAP_SCORE' | 'NOTHING' | 'RESET_SELF' | 'RESET_ALL' | 'RANDOM_OTHER_PLUS_1' | 'RANDOM_OTHER_PLUS_3' | 'ALL_PLUS_1' | 'ALL_PLUS_3' | 'RANDOM_OTHER_MINUS_1' | 'RANDOM_OTHER_MINUS_3' | 'ALL_MINUS_1' | 'ALL_MINUS_3';

const ITEM_INFO: Record<ItemType, { name: string, emoji: string, color: string, duration?: number }> = {
  TIME_PLUS: { name: '+10초', emoji: '🎁', color: 'text-green-400' },
  DOUBLE_SCORE: { name: '점수 2배', emoji: '⚡', color: 'text-yellow-400', duration: 10 },
  FEVER_TIME: { name: '점수 3배', emoji: '🔥', color: 'text-orange-500', duration: 10 },
  HIDE_RANDOM: { name: '랜덤 가리기', emoji: '🌫️', color: 'text-gray-400', duration: 10 },
  HIDE_OTHERS: { name: '나 빼고 가리기', emoji: '🌫️🌫️', color: 'text-gray-300', duration: 10 },
  HIDE_SELF: { name: '나 가리기', emoji: '😵‍💫', color: 'text-red-500', duration: 10 },
  SHIELD: { name: '방어막', emoji: '🛡️', color: 'text-blue-400', duration: 20 },
  SCORE_PLUS_1: { name: '+1점', emoji: '💎', color: 'text-blue-300' },
  SCORE_MINUS_1: { name: '-1점', emoji: '💣', color: 'text-red-400' },
  SCORE_PLUS_3: { name: '+3점', emoji: '👑', color: 'text-yellow-300' },
  SCORE_MINUS_3: { name: '-3점', emoji: '💥', color: 'text-red-600' },
  RANDOM_OTHER_PLUS_1: { name: '랜덤 1명 +1점', emoji: '🎁💎', color: 'text-blue-300' },
  RANDOM_OTHER_PLUS_3: { name: '랜덤 1명 +3점', emoji: '🎁👑', color: 'text-yellow-300' },
  ALL_PLUS_1: { name: '전체 +1점', emoji: '🌍💎', color: 'text-blue-400' },
  ALL_PLUS_3: { name: '전체 +3점', emoji: '🌍👑', color: 'text-yellow-400' },
  RANDOM_OTHER_MINUS_1: { name: '랜덤 1명 -1점', emoji: '🎁💣', color: 'text-red-300' },
  RANDOM_OTHER_MINUS_3: { name: '랜덤 1명 -3점', emoji: '🎁💥', color: 'text-red-500' },
  ALL_MINUS_1: { name: '전체 -1점', emoji: '🌍💣', color: 'text-red-400' },
  ALL_MINUS_3: { name: '전체 -3점', emoji: '🌍💥', color: 'text-red-600' },
  SWAP_SCORE: { name: '점수 바꾸기', emoji: '🔄', color: 'text-purple-400' },
  NOTHING: { name: '아무 일도 없음', emoji: '🍃', color: 'text-gray-500' },
  RESET_SELF: { name: '자기 점수 초기화', emoji: '🧹', color: 'text-red-700' },
  RESET_ALL: { name: '모든 점수 초기화', emoji: '🌪️', color: 'text-red-900' },
};

type ActiveItem = {
  type: ItemType;
  endTime: number;
};

type GameMode = 'INDIVIDUAL' | 'TEAM';

type ActivePlayer = {
  id: number;
  team: number;
};

function generateProblem(options: GameOptions, rng: () => number = Math.random): Problem {
  if (options.world === 'DECIMAL') {
    return generateDecimalProblem(options.decimalMission, options.difficulty, rng);
  }

  const { difficulty, digitRange } = options;
  let digitCounts = [1, 1, 1, 1];
  if (difficulty === 'SILVER') digitCounts = [1, 1, 1, 2];
  else if (difficulty === 'GOLD') digitCounts = [1, 1, 2, 2];
  else if (difficulty === 'PLATINUM') digitCounts = [1, 2, 2, 2];
  else if (difficulty === 'DIAMOND') digitCounts = [2, 2, 2, 2];
  else if (difficulty === 'MASTER') digitCounts = [2, 2, 2, 3];
  else if (difficulty === 'CHALLENGER') digitCounts = [2, 2, 3, 3];

  for (let i = digitCounts.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digitCounts[i], digitCounts[j]] = [digitCounts[j], digitCounts[i]];
  }

  const genNum = (digits: number) => {
    if (digits === 1) return Math.floor(rng() * 8) + 2;
    if (digits === 2) return Math.floor(rng() * (digitRange[1] - digitRange[0] + 1)) + digitRange[0];
    return Math.floor(rng() * 900) + 100;
  };

  let A = genNum(digitCounts[0]);
  let B = genNum(digitCounts[1]);
  let C = genNum(digitCounts[2]);
  let D = genNum(digitCounts[3]);

  if (B >= C) {
    if (B === C) {
      B = C - 1;
      if (B < 1) { B = 1; C = 2; }
    } else {
      const temp = B;
      B = C;
      C = temp;
    }
  }

  // Ensure answer components are <= 9999
  const numerator = A * C + B;
  const denominator = C * D;
  const whole = Math.floor(numerator / denominator);
  const remainingNum = numerator % denominator;
  
  // Simplify fraction
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const common = gcd(remainingNum, denominator);
  const simplifiedNum = remainingNum / common;
  const simplifiedDen = denominator / common;

  if (whole > 9999 || simplifiedNum > 9999 || simplifiedDen > 9999) {
    return generateProblem(options, rng);
  }

  return { world: 'FRACTION', A, B, C, D };
}

function generateDecimalProblem(mission: DecimalMission, difficulty: Difficulty, rng: () => number = Math.random): Problem {
  if (mission === 'DECIMAL_ALL_RANDOM') {
    const missions: DecimalMission[] = [
      'DECIMAL_NATURAL_NO_CARRY',
      'DECIMAL_NATURAL_CARRY',
      'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1',
      'DECIMAL_NATURAL_BRING_DOWN_ZERO',
      'DECIMAL_NATURAL_ZERO_IN_QUOTIENT',
      'NATURAL_NATURAL'
    ];
    mission = missions[Math.floor(rng() * missions.length)];
  }

  const genInt = (digits: number) => {
    if (digits === 1) return Math.floor(rng() * 8) + 2; // 2-9
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(rng() * (max - min + 1)) + min;
  };

  const TERMINATING_DIVISORS: Record<number, number[]> = {
    1: [2, 4, 5, 8],
    2: [10, 16, 20, 25, 32, 40, 50, 64, 80],
    3: [100, 125, 128, 160, 200, 250, 256, 320, 400, 500, 512, 640, 800],
    4: [1000, 1024, 1250, 1600, 2000, 2048, 2500, 3200, 4000, 5000, 6400, 8000]
  };

  let dividend = 0;
  let divisor = 0;
  let quotient = 0;

  let isValid = false;
  while (!isValid) {
    if (mission === 'DECIMAL_NATURAL_NO_CARRY') {
      divisor = [2, 3, 4][Math.floor(rng() * 3)];
      let intDigits = 1, decDigits = 1;
      switch (difficulty) {
        case 'BRONZE': intDigits = 1; decDigits = 1; break;
        case 'SILVER': intDigits = 2; decDigits = 1; break;
        case 'GOLD': intDigits = 1; decDigits = 2; break;
        case 'PLATINUM': intDigits = 2; decDigits = 2; break;
        case 'DIAMOND': intDigits = 1; decDigits = 3; break;
        case 'MASTER': intDigits = 2; decDigits = 3; break;
        case 'CHALLENGER': intDigits = 3; decDigits = 3; break;
      }
      let qIntPart = genInt(intDigits);
      let qDecStr = '';
      for (let i = 0; i < decDigits; i++) {
        const maxDigit = Math.floor(9 / divisor);
        const digit = Math.floor(rng() * maxDigit) + 1;
        qDecStr += digit;
      }
      quotient = parseFloat(`${qIntPart}.${qDecStr}`);
      dividend = parseFloat((quotient * divisor).toFixed(10));
    } else if (mission === 'DECIMAL_NATURAL_CARRY') {
      let intDigits = 1, decDigits = 1, dDigits = 1;
      switch (difficulty) {
        case 'BRONZE': intDigits = 1; decDigits = 1; dDigits = 1; break;
        case 'SILVER': intDigits = 2; decDigits = 1; dDigits = 1; break;
        case 'GOLD': intDigits = 1; decDigits = 2; dDigits = 1; break;
        case 'PLATINUM': intDigits = 2; decDigits = 2; dDigits = 1; break;
        case 'DIAMOND': intDigits = 1; decDigits = 3; dDigits = 1; break;
        case 'MASTER': intDigits = 2; decDigits = 3; dDigits = 1; break;
        case 'CHALLENGER': intDigits = 2; decDigits = 2; dDigits = 2; break;
      }
      divisor = genInt(dDigits);
      let qIntPart = genInt(intDigits);
      let qDecPart = genInt(decDigits);
      quotient = parseFloat(`${qIntPart}.${qDecPart}`);
      dividend = parseFloat((quotient * divisor).toFixed(10));
    } else if (mission === 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1') {
      let decDigits = 1, dDigits = 1;
      switch (difficulty) {
        case 'BRONZE': decDigits = 1; dDigits = 1; break;
        case 'SILVER': decDigits = 2; dDigits = 1; break;
        case 'GOLD': decDigits = 3; dDigits = 1; break;
        case 'PLATINUM': decDigits = 1; dDigits = 2; break;
        case 'DIAMOND': decDigits = 2; dDigits = 2; break;
        case 'MASTER': decDigits = 3; dDigits = 2; break;
        case 'CHALLENGER': decDigits = 4; dDigits = 2; break;
      }
      divisor = genInt(dDigits);
      let qDecPart = genInt(decDigits);
      quotient = parseFloat(`0.${qDecPart}`);
      dividend = parseFloat((quotient * divisor).toFixed(10));
    } else if (mission === 'DECIMAL_NATURAL_BRING_DOWN_ZERO') {
      let divDecDigits = 1, dDigits = 1;
      switch (difficulty) {
        case 'BRONZE': divDecDigits = 1; dDigits = 1; break;
        case 'SILVER': divDecDigits = 2; dDigits = 1; break;
        case 'GOLD': divDecDigits = 1; dDigits = 2; break;
        case 'PLATINUM': divDecDigits = 2; dDigits = 2; break;
        case 'DIAMOND': divDecDigits = 3; dDigits = 2; break;
        case 'MASTER': divDecDigits = 1; dDigits = 3; break;
        case 'CHALLENGER': divDecDigits = 2; dDigits = 3; break;
      }
      const validDivisors = TERMINATING_DIVISORS[dDigits] || TERMINATING_DIVISORS[1];
      divisor = validDivisors[Math.floor(rng() * validDivisors.length)];
      let qIntPart = genInt(1);
      let qDecStr = '';
      if (divDecDigits === 1) {
         qDecStr = `${Math.floor(rng() * 9) + 1}5`;
      } else if (divDecDigits === 2) {
         qDecStr = `${Math.floor(rng() * 9) + 1}${Math.floor(rng() * 9) + 1}5`;
      } else {
         qDecStr = `${Math.floor(rng() * 9) + 1}${Math.floor(rng() * 9) + 1}${Math.floor(rng() * 9) + 1}5`;
      }
      quotient = parseFloat(`${qIntPart}.${qDecStr}`);
      dividend = parseFloat((quotient * divisor).toFixed(10));
    } else if (mission === 'DECIMAL_NATURAL_ZERO_IN_QUOTIENT') {
      let intDigits = 1, decDigits = 2, dDigits = 1;
      switch (difficulty) {
        case 'BRONZE': intDigits = 1; decDigits = 2; dDigits = 1; break;
        case 'SILVER': intDigits = 2; decDigits = 2; dDigits = 1; break;
        case 'GOLD': intDigits = 1; decDigits = 3; dDigits = 1; break;
        case 'PLATINUM': intDigits = 1; decDigits = 2; dDigits = 2; break;
        case 'DIAMOND': intDigits = 2; decDigits = 2; dDigits = 2; break;
        case 'MASTER': intDigits = 1; decDigits = 3; dDigits = 2; break;
        case 'CHALLENGER': intDigits = 2; decDigits = 3; dDigits = 2; break;
      }
      divisor = genInt(dDigits);
      let qIntPart = genInt(intDigits);
      let qDecStr = '0' + genInt(decDigits - 1).toString();
      quotient = parseFloat(`${qIntPart}.${qDecStr}`);
      dividend = parseFloat((quotient * divisor).toFixed(10));
    } else if (mission === 'NATURAL_NATURAL') {
      let divDigits = 1, dDigits = 1;
      switch (difficulty) {
        case 'BRONZE': divDigits = 1; dDigits = 1; break;
        case 'SILVER': divDigits = 2; dDigits = 1; break;
        case 'GOLD': divDigits = 1; dDigits = 2; break;
        case 'PLATINUM': divDigits = 2; dDigits = 2; break;
        case 'DIAMOND': divDigits = 3; dDigits = 2; break;
        case 'MASTER': divDigits = 2; dDigits = 3; break;
        case 'CHALLENGER': divDigits = 3; dDigits = 3; break;
      }
      const validDivisors = TERMINATING_DIVISORS[dDigits] || TERMINATING_DIVISORS[1];
      divisor = validDivisors[Math.floor(rng() * validDivisors.length)];
      dividend = genInt(divDigits);
      if (dividend % divisor === 0) dividend += 1;
      quotient = parseFloat((dividend / divisor).toFixed(10));
    }

    if (mission === 'NATURAL_NATURAL') {
      isValid = true;
    } else {
      isValid = dividend % 1 !== 0;
      if (isValid) isValid = quotient % 1 !== 0;
    }
  }

  return { world: 'DECIMAL', dividend, divisor, quotient };
}

const PLAYERS = [
  { name: '강아지', emoji: '🐶', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-red-400' },
  { name: '고양이', emoji: '🐱', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-blue-400' },
  { name: '펭귄', emoji: '🐧', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-pink-400' },
  { name: '오리', emoji: '🦆', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-yellow-400' },
  { name: '거북이', emoji: '🐢', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-emerald-400' },
  { name: '개구리', emoji: '🐸', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-lime-400' },
  { name: '상어', emoji: '🦈', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-cyan-400' },
  { name: '돌고래', emoji: '🐬', bgClass: 'bg-gray-800', borderClass: 'border-gray-700', textClass: 'text-sky-400' },
];

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// --- Components ---

const Fraction = ({ whole, num, den }: { whole?: React.ReactNode; num: React.ReactNode; den: React.ReactNode }) => (
  <div className="inline-flex items-center justify-center font-bold">
    {whole && <span className="mr-1">{whole}</span>}
    <div className="flex flex-col items-center justify-center text-[0.8em]">
      <span className="border-b-[0.1em] border-current px-1 leading-none w-full text-center">{num}</span>
      <span className="px-1 leading-none mt-[0.1em] w-full text-center">{den}</span>
    </div>
  </div>
);

// --- Timer Logic Update ---
// Need to find where timeLeft is managed and update the sound there.
// Looking at GameScreen component...
// ...
// Found it in the GameScreen component (implied, need to find it by viewing file)


type InputState = {
  whole: string;
  num: string;
  den: string;
  decimal: string;
};
type ActiveField = 'whole' | 'num' | 'den' | 'decimal';

type PlayerBoardProps = {
  id: number;
  team: number;
  config: typeof PLAYERS[0];
  score: number;
  allScores: number[];
  options: GameOptions;
  activeItems: ActiveItem[];
  onCorrect: (id: number, multiplier: number) => void;
  onWrong: (id: number) => void;
  onApplyItem: (type: ItemType) => void;
  onAttack: (attackerId: number, targetId: number | 'others', type: 'HIDE') => void;
  borderColor: string;
  isPaused?: boolean;
  isAttacked?: boolean;
  shortAttackTime?: number;
};

const PlayerBoard = ({ id, team, config, score, allScores, options, activeItems, onCorrect, onWrong, onApplyItem, onAttack, borderColor, isPaused, isAttacked, shortAttackTime }: PlayerBoardProps) => {
  const [problem, setProblem] = useState<Problem>(generateProblem(options));
  const [input, setInput] = useState<InputState>({ whole: '', num: '', den: '', decimal: '' });
  const [activeField, setActiveField] = useState<ActiveField>(options.world === 'DECIMAL' ? 'decimal' : 'whole');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'attacked'>('idle');
  const [floats, setFloats] = useState<{id: number, key: number, emoji: string | React.ReactNode}[]>([]);
  const [combo, setCombo] = useState(0);
  const [itemEffect, setItemEffect] = useState<{ type: ItemType, id: number } | null>(null);

  const currentRank = score > 0 ? 1 + allScores.filter(s => s > score).length : null;
  const medal = currentRank === 1 ? '🥇' : currentRank === 2 ? '🥈' : currentRank === 3 ? '🥉' : null;

  useEffect(() => {
    if (shortAttackTime) {
      setStatus('attacked');
      playSound('wrong');
      setFloats(prev => [...prev, { id: Date.now(), key: Math.random(), emoji: '😵‍💫' }]);
      setTimeout(() => {
        setStatus('idle');
      }, 600);
    }
  }, [shortAttackTime]);

  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  const handleCorrect = useCallback(() => {
    setStatus('correct');
    playSound('correct');
    
    const oldRank = 1 + allScores.filter(s => s > score).length;
    const newRank = 1 + allScores.filter(s => s > score + 1).length;
    const wasTied = allScores.filter(s => s === score).length > 1;
    
    let floatEmoji = config.emoji;
    if (newRank <= 3 && (newRank < oldRank || wasTied || score === 0)) {
      floatEmoji = newRank === 1 ? '🥇' : newRank === 2 ? '🥈' : '🥉';
    }

    setCombo(c => {
      const newCombo = c + 1;
      let comboContent: React.ReactNode = null;
      if (newCombo >= 4) {
        comboContent = (
          <>
            <div>🔥FEVER🔥</div>
            <div className="text-3xl sm:text-5xl mt-1">{newCombo}x</div>
          </>
        );
      } else if (newCombo >= 2) {
        comboContent = (
          <>
            <div>COMBO</div>
            <div className="text-2xl sm:text-4xl mt-1">{newCombo}x</div>
          </>
        );
      }

      setFloats(prev => [...prev, { 
        id: Date.now(), 
        key: Math.random(), 
        emoji: (
          <div className="flex flex-col items-center">
            <span>{floatEmoji}</span>
            {comboContent && (
              <div 
                className={`mt-2 text-yellow-300 drop-shadow-[0_0_10px_rgba(255,255,0,0.8)] text-center leading-none ${newCombo >= 4 ? 'animate-bounce text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'}`}
                style={{ WebkitTextStroke: '1px #d97706' }}
              >
                {comboContent}
              </div>
            )}
          </div>
        )
      }]);
      return newCombo;
    });

    const scoreMultiplier = activeItems.some(it => it.type === 'FEVER_TIME') ? 3 : 
                           activeItems.some(it => it.type === 'DOUBLE_SCORE') ? 2 : 1;

    onCorrect(id, scoreMultiplier);

    // Item Generation
    if (options.isItemMode) {
      const roll = Math.random() * 100;
      let randomType: ItemType = 'NOTHING';
      
      if (roll < 52) randomType = 'NOTHING';
      else if (roll < 61) randomType = 'HIDE_RANDOM';
      else if (roll < 65) randomType = 'HIDE_OTHERS';
      else if (roll < 69) randomType = 'HIDE_SELF';
      else if (roll < 74) randomType = 'SHIELD';
      else if (roll < 79) randomType = 'DOUBLE_SCORE';
      else if (roll < 82) randomType = 'FEVER_TIME';
      else if (roll < 86) randomType = 'SCORE_PLUS_1';
      else if (roll < 88) randomType = 'SCORE_MINUS_1';
      else if (roll < 90) randomType = 'SCORE_PLUS_3';
      else if (roll < 91) randomType = 'SCORE_MINUS_3';
      else if (roll < 92) randomType = 'RANDOM_OTHER_PLUS_1';
      else if (roll < 93) randomType = 'RANDOM_OTHER_PLUS_3';
      else if (roll < 93.5) randomType = 'ALL_PLUS_1';
      else if (roll < 94) randomType = 'ALL_PLUS_3';
      else if (roll < 95) randomType = 'RANDOM_OTHER_MINUS_1';
      else if (roll < 96) randomType = 'RANDOM_OTHER_MINUS_3';
      else if (roll < 96.5) randomType = 'ALL_MINUS_1';
      else if (roll < 97) randomType = 'ALL_MINUS_3';
      else if (roll < 99) randomType = 'SWAP_SCORE';
      else if (roll < 99.3) randomType = 'RESET_SELF';
      else if (roll < 99.6) randomType = 'RESET_ALL';
      else randomType = 'TIME_PLUS';

      if (randomType !== 'NOTHING') {
        playSound('item' as any);
        setItemEffect({ type: randomType, id: Date.now() });
        setTimeout(() => setItemEffect(null), 2000);

        if (randomType === 'HIDE_RANDOM') {
          onAttack(id, -1, 'HIDE');
        } else if (randomType === 'HIDE_OTHERS') {
          onAttack(id, 'others', 'HIDE');
        } else if (randomType === 'HIDE_SELF') {
          onAttack(id, id, 'HIDE');
        } else {
          onApplyItem(randomType);
        }
      }
    }
    setTimeout(() => {
      setProblem(generateProblem(options));
      setInput({ whole: '', num: '', den: '', decimal: '' });
      setActiveField(options.world === 'DECIMAL' ? 'decimal' : 'whole');
      setStatus('idle');
    }, 600);
  }, [id, config.emoji, score, allScores, options, activeItems, onCorrect, onAttack, onApplyItem]);

  const handleWrong = useCallback(() => {
    setStatus('wrong');
    playSound('wrong');
    setCombo(0);
    setFloats(prev => [...prev, { id: Date.now(), key: Math.random(), emoji: '💀' }]);
    onWrong(id);
    setTimeout(() => {
      setInput({ whole: '', num: '', den: '', decimal: '' });
      setActiveField(options.world === 'DECIMAL' ? 'decimal' : 'whole');
      setStatus('idle');
    }, 600);
  }, [id, onWrong, options.world]);

  const checkAnswer = useCallback(() => {
    if (options.world === 'DECIMAL') {
      if (!input.decimal) return;
      const userAns = parseFloat(input.decimal);
      if (Math.abs(userAns - (problem.quotient || 0)) < 0.0000001) {
        handleCorrect();
      } else {
        handleWrong();
      }
      return;
    }

    const w = parseInt(input.whole, 10) || 0;
    const n = parseInt(input.num, 10) || 0;
    const d = parseInt(input.den, 10) || 1;
    
    // If they entered numerator but no denominator, it's invalid
    if (input.num && !input.den) {
      handleWrong();
      return;
    }
    // Denominator cannot be 0
    if (input.den && d === 0) {
      handleWrong();
      return;
    }
    // If they entered nothing
    if (!input.whole && !input.num && !input.den) {
      return;
    }
    
    const userNum = w * d + n;
    const userDen = d;
    
    const correctNum = (problem.A || 0) * (problem.C || 1) + (problem.B || 0);
    const correctDen = (problem.C || 1) * (problem.D || 1);
    
    if (userNum * correctDen === correctNum * userDen && userNum > 0) {
      // Check options
      if (options.requireMixed) {
        // Must be a mixed fraction (fractional part < denominator)
        if (n >= d) {
          handleWrong();
          return;
        }
      }
      if (options.requireIrreducible) {
        // Must be irreducible (gcd of n and d is 1)
        if (n > 0 && gcd(n, d) !== 1) {
          handleWrong();
          return;
        }
      }

      handleCorrect();
    } else {
      handleWrong();
    }
  }, [input, problem, options, handleCorrect, handleWrong]);

  const handleKey = useCallback((k: string) => {
    if (status !== 'idle') return;
    
    if (k === 'del') {
      playSound('backspace');
      setInput(prev => ({ ...prev, [activeField]: prev[activeField].slice(0, -1) }));
    } else if (k === 'enter') {
      playSound('click');
      checkAnswer();
    } else if (k === '대') {
      if (options.world === 'DECIMAL') return;
      playSound('input_whole');
      setActiveField('whole');
    } else if (k === '분') {
      if (options.world === 'DECIMAL') return;
      if (activeField === 'den') {
        playSound('input_num');
        setActiveField('num');
      } else {
        playSound('input_den');
        setActiveField('den');
      }
    } else if (k === '.') {
      if (options.world !== 'DECIMAL') return;
      playSound('click');
      if (!input.decimal.includes('.')) {
        setInput(prev => ({ ...prev, decimal: prev.decimal + '.' }));
      }
    } else {
      playSound('click');
      if (input[activeField].length < (options.world === 'DECIMAL' ? 10 : 4)) {
        setInput(prev => ({ ...prev, [activeField]: prev[activeField] + k }));
      }
    }
  }, [status, activeField, input, checkAnswer, options.world]);

  const TEAM_BOARD_BGS = [
    config.bgClass, // 0: Individual
    'bg-red-950/60',
    'bg-blue-950/60',
    'bg-green-950/60',
    'bg-yellow-950/60'
  ];

  const TEAM_TEXT_COLORS = [
    config.textClass, // 0: Individual
    'text-red-400',
    'text-blue-400',
    'text-green-400',
    'text-yellow-400'
  ];

  const hasShield = activeItems.some(it => it.type === 'SHIELD');
  const textColor = team > 0 ? TEAM_TEXT_COLORS[team] : config.textClass;

  return (
    <div className={`relative flex flex-col h-full p-1 sm:p-2 border-4 rounded-2xl ${TEAM_BOARD_BGS[team]} transition-all duration-300 ${
      status === 'correct' ? 'bg-green-900/60 border-green-500' : 
      (status === 'wrong' || status === 'attacked' || (isAttacked && !hasShield)) ? 'bg-red-900/60 border-red-500' : 
      hasShield ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)]' :
      borderColor
    }`}>
      {floats.map(f => (
        <div key={f.key} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-visible">
          <div className="text-6xl sm:text-8xl opacity-50 animate-float-up">
            {f.emoji}
          </div>
        </div>
      ))}
      
      <div className="flex flex-col items-center mb-2 px-1 relative">
        {/* Active Items Display */}
        <div className="absolute -top-1 right-0 flex flex-col gap-1 items-end">
          {activeItems.map((item, idx) => {
            const info = ITEM_INFO[item.type];
            const timeLeft = Math.max(0, Math.ceil((item.endTime - Date.now()) / 1000));
            return (
              <div key={idx} className={`flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/20 text-[10px] sm:text-xs font-bold ${info.color}`}>
                <span>{info.emoji}</span>
                <span>{timeLeft}s</span>
              </div>
            );
          })}
        </div>

        <span className={`font-black text-2xl sm:text-3xl lg:text-4xl whitespace-nowrap ${textColor}`}>
          {config.emoji} {config.name}
        </span>
        <div className="relative flex flex-col items-center">
          <span className={`font-black text-3xl sm:text-4xl lg:text-5xl ${textColor}`}>
            {medal && <span className="mr-2">{medal}</span>}
            {score}
          </span>
          
          {/* Item Acquisition Animation - Now under score */}
          {itemEffect && (
            <div className="absolute top-full mt-1 z-50 pointer-events-none whitespace-nowrap">
              <div className="bg-yellow-500/90 text-black px-3 py-1 rounded-full font-black text-sm sm:text-base animate-bounce shadow-[0_0_15px_rgba(255,255,0,0.6)] border border-white flex items-center gap-1">
                <span>{ITEM_INFO[itemEffect.type].emoji}</span>
                <span>{ITEM_INFO[itemEffect.type].name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className={`flex-1 flex flex-col items-center justify-center rounded-lg shadow-inner mb-2 p-1 transition-colors duration-300 ${
        status === 'correct' ? 'bg-green-900/50' : 
        (status === 'wrong' || status === 'attacked' || (isAttacked && !activeItems.some(it => it.type === 'SHIELD'))) ? 'bg-red-900/50' : 
        'bg-gray-900'
      }`}>
        {!isPaused && (
          <>
            <div className="relative w-full flex items-center justify-center py-4 mb-2">
              {/* Fog Overlay for Attacks - Now restricted to problem area */}
              {isAttacked && !activeItems.some(it => it.type === 'SHIELD') && (
                <div className="absolute inset-0 z-40 bg-gray-900/95 backdrop-blur-xl flex items-center justify-center animate-pulse rounded-lg">
                  <div className="text-4xl sm:text-5xl">😵‍💫</div>
                </div>
              )}
              <div className="text-[clamp(1rem,2vw,2rem)] sm:text-2xl md:text-3xl flex items-center justify-center whitespace-nowrap text-gray-100">
                {options.world === 'DECIMAL' ? (
                  <>
                    <span>{problem.dividend}</span>
                    <span className="mx-1">÷</span>
                    <span>{problem.divisor}</span>
                    <span className="mx-1">=</span>
                  </>
                ) : (
                  <>
                    <Fraction whole={problem.A} num={problem.B} den={problem.C} />
                    <span className="mx-1">÷</span>
                    <span>{problem.D}</span>
                    <span className="mx-1">=</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="h-16 sm:h-20 w-full flex items-center justify-center text-xl sm:text-2xl font-bold">
              {options.world === 'DECIMAL' ? (
                <div 
                  className={`w-32 h-10 sm:w-40 sm:h-12 flex items-center justify-center border-2 rounded cursor-pointer transition-colors touch-none ${activeField === 'decimal' ? 'border-blue-500 bg-gray-700 text-blue-300' : 'border-gray-600 bg-gray-800 text-gray-300'}`}
                  onPointerDown={(e) => { e.preventDefault(); setActiveField('decimal'); }}
                >
                  {input.decimal}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {/* Whole */}
                  <div 
                    className={`w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center border-2 rounded cursor-pointer transition-colors touch-none ${activeField === 'whole' ? 'border-blue-500 bg-gray-700 text-blue-300' : 'border-gray-600 bg-gray-800 text-gray-300'}`}
                    onPointerDown={(e) => { e.preventDefault(); setActiveField('whole'); }}
                  >
                    {input.whole}
                  </div>
                  {/* Fraction Part */}
                  <div className="flex flex-col space-y-1 items-center justify-center">
                    {/* Numerator */}
                    <div 
                      className={`w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center border-2 rounded cursor-pointer transition-colors touch-none ${activeField === 'num' ? 'border-blue-500 bg-gray-700 text-blue-300' : 'border-gray-600 bg-gray-800 text-gray-300'}`}
                      onPointerDown={(e) => { e.preventDefault(); setActiveField('num'); }}
                    >
                      {input.num}
                    </div>
                    {/* Divider */}
                    <div className="w-full h-0.5 bg-gray-500"></div>
                    {/* Denominator */}
                    <div 
                      className={`w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center border-2 rounded cursor-pointer transition-colors touch-none ${activeField === 'den' ? 'border-blue-500 bg-gray-700 text-blue-300' : 'border-gray-600 bg-gray-800 text-gray-300'}`}
                      onPointerDown={(e) => { e.preventDefault(); setActiveField('den'); }}
                    >
                      {input.den}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="w-full max-w-[24vh] mx-auto grid grid-cols-3 gap-1 pb-1">
        {['1','2','3','4','5','6','7','8','9'].map(k => (
          <button 
            key={k} 
            onPointerDown={(e) => { e.preventDefault(); handleKey(k); }} 
            className="aspect-square bg-gray-700 border border-gray-600 text-gray-400 rounded font-bold text-xl sm:text-2xl shadow-sm active:bg-gray-600 touch-none flex items-center justify-center select-none"
          >
            {k}
          </button>
        ))}
        {options.world === 'DECIMAL' ? (
          <>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleKey('0'); }} 
              className="col-span-2 bg-gray-700 border border-gray-600 text-gray-400 rounded font-bold text-xl sm:text-2xl shadow-sm active:bg-gray-600 touch-none flex items-center justify-center select-none"
            >
              0
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleKey('.'); }} 
              className="aspect-square bg-gray-800 border border-gray-600 rounded font-bold text-xl sm:text-2xl shadow-sm active:bg-gray-700 touch-none text-gray-400 flex items-center justify-center select-none"
            >
              .
            </button>
          </>
        ) : (
          <>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleKey('대'); }} 
              className="aspect-square bg-gray-800 border border-gray-600 rounded font-bold text-lg sm:text-xl shadow-sm active:bg-gray-700 touch-none text-gray-400 flex items-center justify-center select-none"
            >
              대
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleKey('0'); }} 
              className="aspect-square bg-gray-700 border border-gray-600 text-gray-400 rounded font-bold text-xl sm:text-2xl shadow-sm active:bg-gray-600 touch-none flex items-center justify-center select-none"
            >
              0
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleKey('분'); }} 
              className="aspect-square bg-gray-800 border border-gray-600 rounded font-bold text-lg sm:text-xl shadow-sm active:bg-gray-700 touch-none text-gray-400 flex items-center justify-center select-none"
            >
              분
            </button>
          </>
        )}
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleKey('del'); }} 
          className="aspect-square col-span-1 bg-red-900/50 border border-red-800 text-red-500 rounded font-bold shadow-sm active:bg-red-800/50 flex items-center justify-center touch-none select-none"
        >
          <Delete size={24} />
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleKey('enter'); }} 
          className="col-span-2 h-full bg-blue-700/80 border border-blue-800 text-blue-200 rounded font-bold text-xl sm:text-2xl shadow-sm active:bg-blue-600 touch-none flex items-center justify-center select-none"
        >
          입력
        </button>
      </div>
    </div>
  );
};

const DECIMAL_MISSIONS: { id: DecimalMission, num: number, title: string, ex: string }[] = [
  { id: 'DECIMAL_NATURAL_NO_CARRY', num: 1, title: '소수÷자연수: 몫>1, 각 자리 나누어떨어짐', ex: '6.2÷2' },
  { id: 'DECIMAL_NATURAL_CARRY', num: 2, title: '소수÷자연수: 몫>1, 각 자리 나누어떨어지지 않음', ex: '4.23÷3' },
  { id: 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1', num: 3, title: '소수÷자연수: 몫<1', ex: '1.24÷2' },
  { id: 'DECIMAL_NATURAL_BRING_DOWN_ZERO', num: 4, title: '소수÷자연수: 소수점 아래 0 내려 계산', ex: '2.6÷4' },
  { id: 'DECIMAL_NATURAL_ZERO_IN_QUOTIENT', num: 5, title: '소수÷자연수: 몫 소수 첫째 자리에 0', ex: '2.14÷2' },
  { id: 'NATURAL_NATURAL', num: 6, title: '자연수÷자연수', ex: '3÷2' },
  { id: 'DECIMAL_ALL_RANDOM', num: 7, title: '전체 랜덤 (소수 및 자연수)', ex: '' },
];

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

interface VisualRow {
  type: 'sub' | 'rem';
  valStr: string;
  endIdx: number;
}

function getDivisionRows(dividend: number, divisor: number, quotient: number): VisualRow[] {
  const divStr = dividend.toString();
  const quoStr = quotient.toString();
  
  const divDotIdx = divStr.indexOf('.');
  const divIntLen = divDotIdx === -1 ? divStr.length : divDotIdx;
  const divDecLen = divDotIdx === -1 ? 0 : divStr.length - divDotIdx - 1;
  const quoDotIdx = quoStr.indexOf('.');
  const quoDecLen = quoDotIdx === -1 ? 0 : quoStr.length - quoDotIdx - 1;
  
  const maxIdx = divIntLen - 1;
  const minIdx = -Math.max(divDecLen, quoDecLen);
  
  let currentVal = 0;
  let rows: VisualRow[] = [];
  let hasStarted = false;
  
  for (let idx = maxIdx; idx >= minIdx; idx--) {
    let digit = 0;
    if (idx <= maxIdx && idx >= -divDecLen) {
      let strIdx = maxIdx - idx;
      if (idx < 0) strIdx += 1;
      digit = parseInt(divStr[strIdx] || '0', 10);
    }
    
    currentVal = currentVal * 10 + digit;
    
    if (hasStarted) {
      rows.push({ type: 'rem', valStr: currentVal.toString(), endIdx: idx });
    }
    
    let qDigit = Math.floor(currentVal / divisor);
    let subVal = qDigit * divisor;
    
    if (qDigit > 0 || hasStarted) {
      if (!hasStarted && qDigit === 0) {
        // Skip leading zero
      } else {
        hasStarted = true;
        rows.push({ type: 'sub', valStr: subVal.toString(), endIdx: idx });
        currentVal = currentVal - subVal;
        
        if (idx === minIdx) {
          rows.push({ type: 'rem', valStr: currentVal.toString(), endIdx: idx });
        }
      }
    }
  }
  return rows;
}

const WorksheetScreen = ({ initialOptions, onBack }: { initialOptions: GameOptions, onBack: () => void }) => {
  const [problemCount, setProblemCount] = useState(20);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [seedCode, setSeedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [options, setOptions] = useState<GameOptions>(initialOptions);
  
  const generateSeedCode = (opts: GameOptions) => {
    const w = opts.world === 'FRACTION' ? 1 : 2;
    let m = 1;
    if (opts.world === 'DECIMAL') {
      const missionObj = DECIMAL_MISSIONS.find(x => x.id === opts.decimalMission);
      m = missionObj ? missionObj.num : 1;
    }
    const d = DIFFICULTIES.indexOf(opts.difficulty);
    const s = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${w}${m}${d}${s}`;
  };

  const parseSeedCode = (code: string) => {
    if (code.length !== 7) return null;
    const w = code[0] === '1' ? 'FRACTION' : 'DECIMAL';
    const m = parseInt(code[1], 10);
    const d = parseInt(code[2], 10);
    const s = parseInt(code.substring(3), 10);
    if (isNaN(m) || isNaN(d) || isNaN(s)) return null;
    
    let decimalMission: DecimalMission = 'DECIMAL_NATURAL_NO_CARRY';
    if (w === 'DECIMAL') {
      const missionObj = DECIMAL_MISSIONS.find(x => x.num === m);
      if (missionObj) decimalMission = missionObj.id;
    }
    
    const difficulty = DIFFICULTIES[d] || 'BRONZE';
    
    return {
      world: w as WorldType,
      decimalMission,
      difficulty,
      seed: s
    };
  };

  const generateWorksheet = (code: string, count: number) => {
    const parsed = parseSeedCode(code);
    if (!parsed) return;
    
    const rng = mulberry32(parsed.seed);
    const newProblems: Problem[] = [];
    const opts: GameOptions = {
      ...initialOptions,
      world: parsed.world,
      decimalMission: parsed.decimalMission,
      difficulty: parsed.difficulty
    };
    
    for (let i = 0; i < count; i++) {
      newProblems.push(generateProblem(opts, rng));
    }
    
    setProblems(newProblems);
    setOptions(opts);
    setSeedCode(code);
    setInputCode(code);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      generateWorksheet(codeFromUrl, problemCount);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const code = generateSeedCode(initialOptions);
      generateWorksheet(code, problemCount);
    }
  }, []);

  const handleApplyCode = () => {
    generateWorksheet(inputCode, problemCount);
  };

  const handleCountChange = (count: number) => {
    setProblemCount(count);
    generateWorksheet(seedCode, count);
  };
  
  const handleRegenerate = () => {
    const code = generateSeedCode(options);
    generateWorksheet(code, problemCount);
  };

  const today = new Date().toLocaleDateString('ko-KR');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?code=' + seedCode)}`;

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-y-auto print:bg-white print:text-black print:overflow-visible print:h-auto print:block">
      {/* Controls (Hidden in Print) */}
      <div className="print:hidden p-4 bg-gray-100 border-b flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">뒤로가기</button>
          <div className="flex items-center gap-2">
            <span>문제 수:</span>
            {[10, 20, 30, 40].map(c => (
              <button key={c} onClick={() => handleCountChange(c)} className={`px-3 py-1 rounded ${problemCount === c ? 'bg-blue-600 text-white' : 'bg-white border'}`}>{c}</button>
            ))}
          </div>
          <button onClick={() => setShowAnswers(!showAnswers)} className={`px-4 py-2 rounded text-white ${showAnswers ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {showAnswers ? '정답 숨기기' : '정답 보기'}
          </button>
          <button onClick={() => setShowQR(!showQR)} className={`px-4 py-2 rounded text-white ${showQR ? 'bg-orange-500 hover:bg-orange-600' : 'bg-teal-500 hover:bg-teal-600'}`}>
            {showQR ? 'QR 숨기기' : 'QR 보기'}
          </button>
          <button onClick={handleRegenerate} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">새 문제 생성</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">인쇄하기</button>
        </div>
        <div className="flex items-center gap-2">
          <span>코드:</span>
          <input value={inputCode} onChange={e => setInputCode(e.target.value)} className="border px-2 py-1 rounded w-32" />
          <button onClick={handleApplyCode} className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700">적용</button>
        </div>
      </div>

      {/* Worksheet Content */}
      <div className="p-8 max-w-5xl mx-auto w-full print:[zoom:0.85] print:p-0">
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-3xl font-black mb-2">
              {options.world === 'FRACTION' ? '분수 배틀 학습지' : '소수 배틀 학습지'}
            </h1>
            <p className="text-lg text-gray-700">
              {options.world === 'FRACTION' ? '1. 대분수 ÷ 자연수' : (() => {
                const m = DECIMAL_MISSIONS.find(m => m.id === options.decimalMission);
                return m ? `${m.num}. ${m.title}` : '';
              })()}
            </p>
            <p className="text-gray-600">난이도: {DIFFICULTY_LABELS[options.difficulty].label} | 인쇄일: {today} | 코드: {seedCode}</p>
          </div>
          {showQR && (
            <div className="flex flex-col items-end">
              <img src={qrUrl} alt="QR Code" className="w-24 h-24 mb-1" />
              <span className="text-xs text-gray-500">QR로 똑같은 문제지 열기</span>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-6">다음을 계산하세요.</h2>

        {Array.from({ length: Math.ceil(problems.length / 20) }).map((_, pageIdx) => (
          <div key={pageIdx} className={`grid grid-cols-4 gap-x-6 gap-y-12 print:gap-y-8 ${pageIdx < Math.ceil(problems.length / 20) - 1 ? 'print:break-after-page mb-12' : 'mb-4 print:mb-0'}`}>
            {problems.slice(pageIdx * 20, (pageIdx + 1) * 20).map((p, idxOnPage) => {
              const i = pageIdx * 20 + idxOnPage;
              return (
                <div key={i} className="flex items-start break-inside-avoid">
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </div>
                  
                  <div className="flex flex-col w-full">
                    {p.world === 'FRACTION' && (
                      <div className="flex items-center gap-2 mb-2 text-base font-sans font-medium">
                    <div className="flex items-center">
                      {p.A > 0 && <span>{p.A}</span>}
                      <div className="flex flex-col items-center ml-1 text-sm">
                        <span className="border-b border-black leading-none px-1">{p.B}</span>
                        <span className="leading-none px-1">{p.C}</span>
                      </div>
                    </div>
                    <span>÷</span>
                    <span>{p.D}</span>
                    <span>=</span>
                    {showAnswers && (
                      <span className="text-blue-600 ml-2">
                        {(() => {
                          const num = p.A * p.C + p.B;
                          const den = p.C * p.D;
                          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                          const common = gcd(num, den);
                          const sNum = num / common;
                          const sDen = den / common;
                          const whole = Math.floor(sNum / sDen);
                          const rem = sNum % sDen;
                          if (rem === 0) return whole.toString();
                          return (
                            <div className="inline-flex items-center">
                              {whole > 0 && <span>{whole}</span>}
                              <div className="flex flex-col items-center ml-1 text-sm">
                                <span className="border-b border-blue-600 leading-none px-1">{rem}</span>
                                <span className="leading-none px-1">{sDen}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Calculation Area */}
                {p.world === 'DECIMAL' ? (
                  <div className="relative inline-block mt-1">
                    {/* Grid Background */}
                    <div className="grid" style={{ gridTemplateColumns: `repeat(8, 1.5rem)`, gridTemplateRows: `repeat(8, 1.5rem)` }}>
                      {Array.from({ length: 8 * 8 }).map((_, idx) => (
                        <div key={idx} className="border-b border-r border-gray-300 border-dashed box-border" style={{ borderTop: idx < 8 ? '1px dashed #d1d5db' : 'none', borderLeft: idx % 8 === 0 ? '1px dashed #d1d5db' : 'none' }}></div>
                      ))}
                    </div>
                    
                    {/* Decimal Problem Overlay */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid" style={{ gridTemplateColumns: `repeat(8, 1.5rem)`, gridTemplateRows: `repeat(8, 1.5rem)` }}>
                      {(() => {
                        const divStr = p.dividend.toString();
                        const quoStr = p.quotient.toString();
                        const divDotIdx = divStr.indexOf('.');
                        const divIntLen = divDotIdx === -1 ? divStr.length : divDotIdx;
                        const divDecLen = divDotIdx === -1 ? 0 : divStr.length - divDotIdx - 1;
                        const quoDotIdx = quoStr.indexOf('.');
                        const quoDecLen = quoDotIdx === -1 ? 0 : quoStr.length - quoDotIdx - 1;
                        
                        const maxIdx = divIntLen - 1;
                        const minIdx = -Math.max(divDecLen, quoDecLen);
                        const L = p.divisor.toString().length;
                        const col0 = L + maxIdx + 1;
                        
                        const getCol = (idx: number) => col0 - idx;
                        
                        const elements = [];
                        
                        // Divisor
                        p.divisor.toString().split('').forEach((char, i) => {
                          elements.push(
                            <div key={`div_${i}`} className="flex items-center justify-center text-base font-sans font-medium border-t border-transparent" style={{ gridColumnStart: i + 1, gridRowStart: 2 }}>
                              {char}
                            </div>
                          );
                        });
                        
                        // Dividend
                        let currentIdx = maxIdx;
                        divStr.split('').forEach((char, i) => {
                          if (char === '.') {
                            elements.push(
                              <div key="div_dot" className="relative" style={{ gridColumnStart: getCol(currentIdx + 1), gridRowStart: 2 }}>
                                <div className="absolute right-0 bottom-0 translate-x-1/2 -translate-y-[2px] font-bold">.</div>
                              </div>
                            );
                            return;
                          }
                          elements.push(
                            <div key={`d_${i}`} className="flex items-center justify-center text-base font-sans font-medium border-t border-black relative" style={{ gridColumnStart: getCol(currentIdx), gridRowStart: 2 }}>
                              {currentIdx === maxIdx && (
                                <svg className="absolute left-0 top-[-1px] h-[calc(100%+1px)] w-1.5 overflow-visible" viewBox="0 0 6 24" preserveAspectRatio="none">
                                  <path d="M 0 0.5 C 3 0.5 5 5 5 12 C 5 19 3 23.5 0 23.5" fill="none" stroke="black" strokeWidth="1" />
                                </svg>
                              )}
                              {char}
                            </div>
                          );
                          currentIdx--;
                        });
                        
                        if (showAnswers) {
                          // Quotient
                          let currentQuoIdx = quoDotIdx === -1 ? quoStr.length - 1 : quoDotIdx - 1;
                          quoStr.split('').forEach((char, i) => {
                            if (char === '.') {
                              elements.push(
                                <div key="quo_dot" className="relative" style={{ gridColumnStart: getCol(currentQuoIdx + 1), gridRowStart: 1 }}>
                                  <div className="absolute right-0 bottom-0 translate-x-1/2 -translate-y-[2px] font-bold text-blue-600">.</div>
                                </div>
                              );
                              return;
                            }
                            elements.push(
                              <div key={`q_${i}`} className="flex items-center justify-center text-base font-sans font-medium text-blue-600" style={{ gridColumnStart: getCol(currentQuoIdx), gridRowStart: 1 }}>
                                {char}
                              </div>
                            );
                            currentQuoIdx--;
                          });
                          
                          // Steps
                          const rows = getDivisionRows(p.dividend, p.divisor, p.quotient);
                          rows.forEach((row, rIdx) => {
                            const gridRow = 3 + rIdx;
                            row.valStr.split('').forEach((char, i) => {
                              const digitIdx = row.endIdx + row.valStr.length - 1 - i;
                              elements.push(
                                <div key={`r_${rIdx}_${i}`} className={`flex items-center justify-center text-base font-sans font-medium text-blue-600 ${row.type === 'sub' ? 'border-b border-black' : ''}`} style={{ gridColumnStart: getCol(digitIdx), gridRowStart: gridRow }}>
                                  {char}
                                </div>
                              );
                            });
                          });
                        }
                        
                        return elements;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-32 border-2 border-dotted border-gray-300 rounded-lg w-full mt-2"></div>
                )}
              </div>
            </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const MenuScreen = ({ onStart, onWorksheet }: { onStart: (players: ActivePlayer[], time: number, options: GameOptions, mode: GameMode) => void, onWorksheet: (options: GameOptions) => void }) => {
  const getDifficultyDescription = (world: WorldType, fractionMission: FractionMission, decimalMission: DecimalMission, difficulty: Difficulty) => {
    if (world === 'FRACTION') {
      return DIFFICULTY_LABELS[difficulty].desc;
    }
    
    const m = decimalMission === 'DECIMAL_ALL_RANDOM' ? '전체 랜덤' : decimalMission;
    if (m === '전체 랜덤') return '모든 미션 중 랜덤 출제';
    
    switch (decimalMission) {
      case 'DECIMAL_NATURAL_NO_CARRY':
        switch (difficulty) {
          case 'BRONZE': return '몫: 자연수 1자리.소수 1자리\n나누는 수: 1자리';
          case 'SILVER': return '몫: 자연수 2자리.소수 1자리\n나누는 수: 1자리';
          case 'GOLD': return '몫: 자연수 1자리.소수 2자리\n나누는 수: 1자리';
          case 'PLATINUM': return '몫: 자연수 2자리.소수 2자리\n나누는 수: 1자리';
          case 'DIAMOND': return '몫: 자연수 1자리.소수 3자리\n나누는 수: 1자리';
          case 'MASTER': return '몫: 자연수 2자리.소수 3자리\n나누는 수: 1자리';
          case 'CHALLENGER': return '몫: 자연수 3자리.소수 3자리\n나누는 수: 1자리';
        }
        break;
      case 'DECIMAL_NATURAL_CARRY':
        switch (difficulty) {
          case 'BRONZE': return '몫: 자연수 1자리.소수 1자리\n나누는 수: 1자리';
          case 'SILVER': return '몫: 자연수 2자리.소수 1자리\n나누는 수: 1자리';
          case 'GOLD': return '몫: 자연수 1자리.소수 2자리\n나누는 수: 1자리';
          case 'PLATINUM': return '몫: 자연수 2자리.소수 2자리\n나누는 수: 1자리';
          case 'DIAMOND': return '몫: 자연수 1자리.소수 3자리\n나누는 수: 1자리';
          case 'MASTER': return '몫: 자연수 2자리.소수 3자리\n나누는 수: 1자리';
          case 'CHALLENGER': return '몫: 자연수 2자리.소수 2자리\n나누는 수: 2자리';
        }
        break;
      case 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1':
        switch (difficulty) {
          case 'BRONZE': return '몫: 0.소수 1자리\n나누는 수: 1자리';
          case 'SILVER': return '몫: 0.소수 2자리\n나누는 수: 1자리';
          case 'GOLD': return '몫: 0.소수 3자리\n나누는 수: 1자리';
          case 'PLATINUM': return '몫: 0.소수 1자리\n나누는 수: 2자리';
          case 'DIAMOND': return '몫: 0.소수 2자리\n나누는 수: 2자리';
          case 'MASTER': return '몫: 0.소수 3자리\n나누는 수: 2자리';
          case 'CHALLENGER': return '몫: 0.소수 4자리\n나누는 수: 2자리';
        }
        break;
      case 'DECIMAL_NATURAL_BRING_DOWN_ZERO':
        switch (difficulty) {
          case 'BRONZE': return '나누어지는 수: 소수 1자리\n나누는 수: 1자리';
          case 'SILVER': return '나누어지는 수: 소수 2자리\n나누는 수: 1자리';
          case 'GOLD': return '나누어지는 수: 소수 1자리\n나누는 수: 2자리';
          case 'PLATINUM': return '나누어지는 수: 소수 2자리\n나누는 수: 2자리';
          case 'DIAMOND': return '나누어지는 수: 소수 3자리\n나누는 수: 2자리';
          case 'MASTER': return '나누어지는 수: 소수 1자리\n나누는 수: 3자리';
          case 'CHALLENGER': return '나누어지는 수: 소수 2자리\n나누는 수: 3자리';
        }
        break;
      case 'DECIMAL_NATURAL_ZERO_IN_QUOTIENT':
        switch (difficulty) {
          case 'BRONZE': return '몫: 자연수 1자리.0X\n나누는 수: 1자리';
          case 'SILVER': return '몫: 자연수 2자리.0X\n나누는 수: 1자리';
          case 'GOLD': return '몫: 자연수 1자리.0XX\n나누는 수: 1자리';
          case 'PLATINUM': return '몫: 자연수 1자리.0X\n나누는 수: 2자리';
          case 'DIAMOND': return '몫: 자연수 2자리.0X\n나누는 수: 2자리';
          case 'MASTER': return '몫: 자연수 1자리.0XX\n나누는 수: 2자리';
          case 'CHALLENGER': return '몫: 자연수 2자리.0XX\n나누는 수: 2자리';
        }
        break;
      case 'NATURAL_NATURAL':
        switch (difficulty) {
          case 'BRONZE': return '나누어지는 수: 1자리\n나누는 수: 1자리';
          case 'SILVER': return '나누어지는 수: 2자리\n나누는 수: 1자리';
          case 'GOLD': return '나누어지는 수: 1자리\n나누는 수: 2자리';
          case 'PLATINUM': return '나누어지는 수: 2자리\n나누는 수: 2자리';
          case 'DIAMOND': return '나누어지는 수: 3자리\n나누는 수: 2자리';
          case 'MASTER': return '나누어지는 수: 2자리\n나누는 수: 3자리';
          case 'CHALLENGER': return '나누어지는 수: 3자리\n나누는 수: 3자리';
        }
        break;
    }
    return '';
  };

  const [world, setWorld] = useState<WorldType>(() => (localStorage.getItem('world') as WorldType) || 'FRACTION');
  const [fractionMission, setFractionMission] = useState<FractionMission>(() => (localStorage.getItem('fractionMission') as FractionMission) || 'MIXED_NATURAL');
  const [decimalMission, setDecimalMission] = useState<DecimalMission>(() => (localStorage.getItem('decimalMission') as DecimalMission) || 'DECIMAL_NATURAL_NO_CARRY');
  const [subtitle, setSubtitle] = useState(() => localStorage.getItem('subtitle') || '뱃사공 게임즈');
  const [time, setTime] = useState<number | ''>(() => { const s = localStorage.getItem('time'); return s ? parseInt(s) : 60; });
  const [mode, setMode] = useState<GameMode>(() => (localStorage.getItem('mode') as GameMode) || 'INDIVIDUAL');
  const [individualCount, setIndividualCount] = useState(() => parseInt(localStorage.getItem('individualCount') || '6'));
  const [teamAssignments, setTeamAssignments] = useState<number[]>(() => {
    const s = localStorage.getItem('teamAssignments');
    return s ? JSON.parse(s) : [1, 1, 0, 0, 2, 2, 0, 0];
  });
  const [requireIrreducible, setRequireIrreducible] = useState(() => localStorage.getItem('requireIrreducible') === 'true');
  const [requireMixed, setRequireMixed] = useState(() => localStorage.getItem('requireMixed') === 'true');
  const [isItemMode, setIsItemMode] = useState(() => localStorage.getItem('isItemMode') === 'true');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('difficulty') as Difficulty) || 'BRONZE');
  const [digitRange, setDigitRange] = useState<[number, number]>(() => {
    const s = localStorage.getItem('digitRange');
    return s ? JSON.parse(s) : [10, 20];
  });

  useEffect(() => {
    localStorage.setItem('world', world);
    localStorage.setItem('fractionMission', fractionMission);
    localStorage.setItem('decimalMission', decimalMission);
    localStorage.setItem('time', time.toString());
    localStorage.setItem('mode', mode);
    localStorage.setItem('individualCount', individualCount.toString());
    localStorage.setItem('teamAssignments', JSON.stringify(teamAssignments));
    localStorage.setItem('requireIrreducible', requireIrreducible.toString());
    localStorage.setItem('requireMixed', requireMixed.toString());
    localStorage.setItem('isItemMode', isItemMode.toString());
    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('digitRange', JSON.stringify(digitRange));
  }, [world, fractionMission, decimalMission, time, mode, individualCount, teamAssignments, requireIrreducible, requireMixed, isItemMode, difficulty, digitRange]);

  const handleStart = () => {
    initAudio();
    playSound('click');
    const finalTime = typeof time === 'number' && time > 0 ? time : 60;
    
    let players: ActivePlayer[] = [];
    if (mode === 'INDIVIDUAL') {
      players = Array.from({ length: individualCount }).map((_, i) => ({ id: i, team: 0 }));
    } else {
      players = teamAssignments
        .map((team, id) => ({ id, team }))
        .filter(p => p.team > 0);
      
      if (players.length === 0) {
        alert('팀전에 참가할 플레이어를 선택해주세요.');
        return;
      }
    }

    onStart(players, finalTime, { world, fractionMission, decimalMission, requireIrreducible, requireMixed, difficulty, digitRange, isItemMode }, mode);
  };

  const TEAM_COLORS = [
    'bg-gray-700 text-gray-500 border-gray-600',
    'bg-red-900/80 text-red-300 border-red-500',
    'bg-blue-900/80 text-blue-300 border-blue-500',
    'bg-green-900/80 text-green-300 border-green-500',
    'bg-yellow-900/80 text-yellow-300 border-yellow-500'
  ];
  const TEAM_NAMES = ['제외', 'A팀', 'B팀', 'C팀', 'D팀'];

  return (
    <div className="flex flex-col items-center justify-start min-h-full bg-gray-900 p-4 pt-16 overflow-y-auto text-white relative">
      <button 
        onPointerDown={(e) => { e.preventDefault(); toggleFullscreen(); }} 
        className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors shadow-md touch-none select-none"
        title="전체 화면"
      >
        <Maximize size={24} />
      </button>

      <input
        value={subtitle}
        onChange={(e) => {
          setSubtitle(e.target.value);
          localStorage.setItem('subtitle', e.target.value);
        }}
        className="text-xl sm:text-2xl text-gray-400 bg-transparent text-center focus:outline-none focus:border-b border-gray-500 mb-2 w-full max-w-2xl"
        placeholder="부제목 입력"
      />
      <h1 className="text-4xl sm:text-7xl font-black text-blue-400 mb-8 drop-shadow-md text-center leading-tight w-full max-w-7xl">
        {world === 'FRACTION' ? '👑 분수 배틀 ⚔️' : '👑 소수 배틀 ⚔️'}
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mb-8">
        {/* Left Column: World Selection Panel */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full lg:w-[320px] border border-gray-700 flex flex-col items-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">배틀 선택</h2>
          <div className="flex justify-center gap-4 mb-6 w-full">
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('FRACTION'); }} 
              className={`flex-1 py-3 rounded-xl font-bold text-xl transition-colors touch-none select-none ${world === 'FRACTION' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              분수 배틀
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('DECIMAL'); }} 
              className={`flex-1 py-3 rounded-xl font-bold text-xl transition-colors touch-none select-none ${world === 'DECIMAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              소수 배틀
            </button>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">미션 선택</h2>
          <div className="flex flex-col gap-2 w-full">
            {world === 'FRACTION' ? (
              <button 
                onPointerDown={(e) => { e.preventDefault(); playSound('click'); setFractionMission('MIXED_NATURAL'); }} 
                className={`w-full py-3 rounded-xl transition-colors touch-none select-none flex items-center text-left ${fractionMission === 'MIXED_NATURAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                <span className={`px-3 py-1 rounded-lg mr-3 font-black shrink-0 ${fractionMission === 'MIXED_NATURAL' ? 'bg-white text-blue-600' : 'bg-gray-600 text-white'}`}>1</span>
                <span className="flex-1 font-bold text-lg">대분수 ÷ 자연수</span>
              </button>
            ) : (
              <>
                {DECIMAL_MISSIONS.map(m => (
                  <button 
                    key={m.id}
                    onPointerDown={(e) => { e.preventDefault(); playSound('click'); setDecimalMission(m.id); }} 
                    className={`w-full py-2 rounded-xl transition-colors touch-none select-none flex items-center text-left ${decimalMission === m.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >
                    <span className={`px-3 py-1 rounded-lg ml-2 mr-3 font-black shrink-0 ${decimalMission === m.id ? 'bg-white text-blue-600' : 'bg-gray-600 text-white'}`}>{m.num}</span>
                    <span className="flex-1 font-bold text-sm sm:text-base">{m.title}</span>
                    {m.ex && <span className={`ml-2 mr-2 text-sm shrink-0 ${decimalMission === m.id ? 'text-blue-200' : 'text-gray-400'}`}>{m.ex}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        
        {/* Right Column: Flex Column */}
        <div className="flex flex-col gap-4 w-full flex-1">
          {/* Top Row of Right Column */}
          <div className="flex flex-col lg:flex-row gap-4 w-full">
            {/* Participants / Teams Panel */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl flex-[2] border border-gray-700 flex flex-col items-center">
          <div className="flex justify-center gap-4 mb-6 w-full">
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setMode('INDIVIDUAL'); }} 
              className={`flex-1 py-3 rounded-xl font-bold text-xl transition-colors touch-none select-none ${mode === 'INDIVIDUAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              개인전
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setMode('TEAM'); }} 
              className={`flex-1 py-3 rounded-xl font-bold text-xl transition-colors touch-none select-none ${mode === 'TEAM' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              팀전
            </button>
          </div>

          {mode === 'INDIVIDUAL' ? (
            <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                <button
                  key={p}
                  onPointerDown={(e) => { e.preventDefault(); playSound('click'); setIndividualCount(p); }}
                  className={`py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl transition-colors touch-none select-none ${
                    individualCount === p ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {p}인
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
              {PLAYERS.map((p, i) => {
                const t = teamAssignments[i];
                return (
                  <button
                    key={i}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      playSound('click');
                      const next = [...teamAssignments];
                      next[i] = (next[i] + 1) % 5;
                      setTeamAssignments(next);
                    }}
                    className={`py-2 sm:py-3 rounded-xl font-bold border-2 flex flex-col items-center transition-colors touch-none select-none ${TEAM_COLORS[t]}`}
                  >
                    <span className="text-lg sm:text-xl">{p.emoji} {p.name}</span>
                    <span className="text-sm sm:text-base mt-1 bg-black/30 px-2 py-0.5 rounded-full">{TEAM_NAMES[t]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Settings Panel */}
        <div className="bg-gray-800 p-4 rounded-2xl shadow-2xl flex-1 border border-gray-700 flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">게임 시간</h2>
          <div className="grid grid-cols-2 gap-2 mb-4 w-full">
            {[60, 120, 180, 300].map(t => (
              <button
                key={t}
                onPointerDown={(e) => { e.preventDefault(); playSound('click'); setTime(t); }}
                className={`py-3 rounded-xl font-bold text-lg transition-colors touch-none select-none ${
                  time === t ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {t / 60}분
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 w-full mt-auto">
            <input 
              type="number" 
              value={time} 
              onChange={e => setTime(e.target.value ? parseInt(e.target.value) : '')}
              className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-2 text-lg w-full text-center focus:outline-none focus:border-blue-500"
              placeholder="직접 입력"
            />
            <span className="text-lg text-gray-400 whitespace-nowrap">초</span>
          </div>
        </div>

        {/* Options Panel */}
        <div className="bg-gray-800 p-4 rounded-2xl shadow-2xl flex-1 border border-gray-700 flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">정답 조건</h2>
          <div className="flex flex-col gap-3 w-full">
            {world === 'FRACTION' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2 w-full">
                  <label className="flex-1 flex items-center justify-center space-x-2 cursor-pointer bg-gray-900 p-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={requireIrreducible}
                      onChange={(e) => { playSound('click'); setRequireIrreducible(e.target.checked); }}
                      className="w-5 h-5 accent-blue-500"
                    />
                    <span className="text-base text-gray-300">기약분수</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center space-x-2 cursor-pointer bg-gray-900 p-3 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={requireMixed}
                      onChange={(e) => { playSound('click'); setRequireMixed(e.target.checked); }}
                      className="w-5 h-5 accent-blue-500"
                    />
                    <span className="text-base text-gray-300">대분수</span>
                  </label>
                </div>
              </div>
            )}
            <label className="w-full flex items-center justify-center space-x-2 cursor-pointer bg-yellow-900/30 p-3 rounded-xl border border-yellow-700/50 hover:border-yellow-500 transition-colors">
              <input 
                type="checkbox" 
                checked={isItemMode}
                onChange={(e) => { playSound('click'); setIsItemMode(e.target.checked); }}
                className="w-6 h-6 accent-yellow-500"
              />
              <span className="text-lg font-bold text-yellow-400">✨ 아이템전 ✨</span>
            </label>
            {world === 'FRACTION' && (
              <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                <span className="text-base text-gray-300 block mb-1">2자리 수 범위: {digitRange[0]} ~ {digitRange[1]}</span>
                <div className="flex gap-2">
                  <input type="number" value={digitRange[0]} onChange={e => setDigitRange([parseInt(e.target.value), digitRange[1]])} className="w-full bg-gray-800 text-white rounded p-1.5 text-center" />
                  <input type="number" value={digitRange[1]} onChange={e => setDigitRange([digitRange[0], parseInt(e.target.value)])} className="w-full bg-gray-800 text-white rounded p-1.5 text-center" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row of Right Column: Difficulty */}
        <div className="bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-2xl w-full border border-gray-700 flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">난이도</h2>
          <div className="flex flex-row w-full gap-1 sm:gap-2 justify-between">
            {DIFFICULTIES.map(d => {
              const info = DIFFICULTY_LABELS[d];
              return (
                <button
                  key={d}
                  onPointerDown={(e) => { e.preventDefault(); playSound('click'); setDifficulty(d); }}
                  className={`flex-1 min-w-0 py-2 px-0.5 sm:px-2 rounded-lg sm:rounded-xl font-bold flex flex-col items-center justify-center transition-colors touch-none select-none ${
                    difficulty === d ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-xs sm:text-base lg:text-lg mb-0.5 sm:mb-1 whitespace-nowrap">{info.emoji} {info.label}</span>
                  <span className="text-[9px] sm:text-xs opacity-80 font-normal text-center leading-tight break-keep whitespace-pre-line">{getDifficultyDescription(world, fractionMission, decimalMission, d)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleStart(); }}
          className="px-12 sm:px-20 py-4 sm:py-5 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-2xl sm:text-3xl shadow-red-600/50 shadow-lg transform transition hover:scale-105 touch-none select-none"
        >
          게임 시작!
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); onWorksheet({ world, fractionMission, decimalMission, requireIrreducible, requireMixed, difficulty, digitRange, isItemMode }); }}
          className="px-8 sm:px-12 py-4 sm:py-5 bg-green-600 hover:bg-green-500 text-white rounded-full font-black text-2xl sm:text-3xl shadow-green-600/50 shadow-lg transform transition hover:scale-105 touch-none select-none"
        >
          학습지 모드
        </button>
      </div>
      
      <div className="mt-8 text-gray-400 font-medium text-center text-sm sm:text-base">
        <p>전자칠판이나 큰 화면에서 1~8명이 한 화면에 나란히 서서 플레이합니다.</p>
        <p className="mt-2">입력창의 <span className="font-bold text-white bg-gray-700 px-2 py-1 rounded">칸</span>을 직접 터치하거나 <span className="font-bold text-white bg-gray-700 px-2 py-1 rounded">대</span>, <span className="font-bold text-white bg-gray-700 px-2 py-1 rounded">분</span> 버튼으로 이동하세요.</p>
      </div>
    </div>
  );
};

const GameScreen = ({ activePlayers, duration, options, mode, onEnd, isPaused }: { activePlayers: ActivePlayer[]; duration: number; options: GameOptions; mode: GameMode; onEnd: (scores: Record<number, number>) => void, isPaused?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [attacks, setAttacks] = useState<Record<number, { duration: number, attackerId: number }>>({}); // id -> {seconds left, attackerId}
  const [shortAttackTimes, setShortAttackTimes] = useState<Record<number, number>>({});
  const [activeBuffs, setActiveBuffs] = useState<Record<number, ActiveItem[]>>({});

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setAttacks(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const nid = parseInt(id);
          if (next[nid] && next[nid].duration > 0) {
            next[nid] = { ...next[nid], duration: next[nid].duration - 1 };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Buff timer loop
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveBuffs(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const nid = Number(id);
          const current = next[nid] || [];
          const filtered = current.filter(item => item.endTime > now);
          if (filtered.length !== current.length) {
            next[nid] = filtered;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const sortedPlayers = useMemo(() => {
    if (mode === 'TEAM') {
      return [...activePlayers].sort((a, b) => a.team - b.team);
    }
    return activePlayers;
  }, [activePlayers, mode]);

  useEffect(() => {
    const initialScores: Record<number, number> = {};
    const initialBuffs: Record<number, ActiveItem[]> = {};
    activePlayers.forEach(p => {
      initialScores[p.id] = 0;
      initialBuffs[p.id] = [];
    });
    setScores(initialScores);
    setActiveBuffs(initialBuffs);
  }, [activePlayers]);

  const teamScores = useMemo(() => {
    const ts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    activePlayers.forEach(p => {
      if (p.team > 0) ts[p.team] += (scores[p.id] || 0);
    });
    return ts;
  }, [scores, activePlayers]);

  const [teamScoreAnim, setTeamScoreAnim] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const prevTeamScoresRef = useRef(teamScores);

  useEffect(() => {
    const newAnims = { ...teamScoreAnim };
    let changed = false;
    [1, 2, 3, 4].forEach(t => {
      if (teamScores[t] > prevTeamScoresRef.current[t]) {
        newAnims[t] = true;
        changed = true;
        setTimeout(() => {
          setTeamScoreAnim(prev => ({ ...prev, [t]: false }));
        }, 1000);
      }
    });
    if (changed) {
      setTeamScoreAnim(newAnims);
    }
    prevTeamScoresRef.current = teamScores;
  }, [teamScores, teamScoreAnim]);

  const scoresRef = useRef(scores);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) {
      if (timeLeft <= 0) onEnd(scoresRef.current);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, timeLeft <= 0, onEnd]);

  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0) {
      playSound('countdown', false, true);
    }
  }, [timeLeft]);

  const handleCorrect = useCallback((id: number, multiplier: number = 1) => {
    setScores(prev => ({ ...prev, [id]: (prev[id] || 0) + multiplier }));
  }, []);

  const handleWrong = useCallback((id: number) => {
    setScores(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
    
    const player = activePlayers.find(p => p.id === id);
    if (!player) return;

    // Clear buffs for player/team
    const targets = mode === 'TEAM' && player.team > 0
      ? activePlayers.filter(p => p.team === player.team).map(p => p.id)
      : [id];

    setActiveBuffs(prev => {
      const next = { ...prev };
      targets.forEach(tid => {
        next[tid] = []; // Clear all buffs
      });
      return next;
    });

    // Clear attacks sent by player/team
    setAttacks(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(tidStr => {
        const tid = Number(tidStr);
        const attack = next[tid];
        if (attack && attack.duration > 0) {
          const attacker = activePlayers.find(p => p.id === attack.attackerId);
          const isFromSameSide = mode === 'TEAM' && player.team > 0
            ? attacker?.team === player.team
            : attack.attackerId === id;
          
          if (isFromSameSide) {
            next[tid] = { duration: 0, attackerId: -1 };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [activePlayers, mode]);

  const handleApplyItem = useCallback((playerId: number, type: ItemType) => {
    if (type === 'NOTHING') return;

    if (type === 'TIME_PLUS') {
      setTimeLeft(prev => prev + 10);
      return;
    }

    if (type === 'SCORE_PLUS_1' || type === 'SCORE_MINUS_1' || type === 'SCORE_PLUS_3' || type === 'SCORE_MINUS_3') {
      const delta = type === 'SCORE_PLUS_1' ? 1 : type === 'SCORE_MINUS_1' ? -1 : type === 'SCORE_PLUS_3' ? 3 : -3;
      setScores(prev => ({ ...prev, [playerId]: Math.max(0, (prev[playerId] || 0) + delta) }));
      if (delta < 0) {
        setShortAttackTimes(prev => ({ ...prev, [playerId]: Date.now() }));
      }
      return;
    }

    if (type === 'RANDOM_OTHER_PLUS_1' || type === 'RANDOM_OTHER_PLUS_3' || type === 'RANDOM_OTHER_MINUS_1' || type === 'RANDOM_OTHER_MINUS_3') {
      const others = activePlayers.filter(p => p.id !== playerId);
      if (others.length > 0) {
        const randomOther = others[Math.floor(Math.random() * others.length)];
        const delta = type === 'RANDOM_OTHER_PLUS_1' ? 1 : type === 'RANDOM_OTHER_PLUS_3' ? 3 : type === 'RANDOM_OTHER_MINUS_1' ? -1 : -3;
        setScores(prev => ({ ...prev, [randomOther.id]: Math.max(0, (prev[randomOther.id] || 0) + delta) }));
        if (delta < 0) {
          setShortAttackTimes(prev => ({ ...prev, [randomOther.id]: Date.now() }));
        }
      }
      return;
    }

    if (type === 'ALL_PLUS_1' || type === 'ALL_PLUS_3' || type === 'ALL_MINUS_1' || type === 'ALL_MINUS_3') {
      const delta = type === 'ALL_PLUS_1' ? 1 : type === 'ALL_PLUS_3' ? 3 : type === 'ALL_MINUS_1' ? -1 : -3;
      const now = Date.now();
      setScores(prev => {
        const next = { ...prev };
        activePlayers.forEach(p => {
          next[p.id] = Math.max(0, (next[p.id] || 0) + delta);
        });
        return next;
      });
      if (delta < 0) {
        setShortAttackTimes(prev => {
          const next = { ...prev };
          activePlayers.forEach(p => {
            next[p.id] = now;
          });
          return next;
        });
      }
      return;
    }

    if (type === 'SWAP_SCORE') {
      const others = activePlayers.filter(p => p.id !== playerId);
      if (others.length > 0) {
        const randomOther = others[Math.floor(Math.random() * others.length)];
        const now = Date.now();
        
        setScores(prev => {
          const next = { ...prev };
          const temp = next[playerId] || 0;
          next[playerId] = next[randomOther.id] || 0;
          next[randomOther.id] = temp;
          return next;
        });
        
        setShortAttackTimes(prevTimes => ({ 
          ...prevTimes, 
          [playerId]: now, 
          [randomOther.id]: now 
        }));
      }
      return;
    }

    if (type === 'RESET_SELF') {
      setScores(prev => ({ ...prev, [playerId]: 0 }));
      setShortAttackTimes(prev => ({ ...prev, [playerId]: Date.now() }));
      return;
    }

    if (type === 'RESET_ALL') {
      setScores(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[Number(id)] = 0;
        });
        return next;
      });
      const now = Date.now();
      setShortAttackTimes(prev => {
        const next = { ...prev };
        activePlayers.forEach(p => {
          next[p.id] = now;
        });
        return next;
      });
      return;
    }

    const info = ITEM_INFO[type];
    if (!info.duration) return;

    const attacker = activePlayers.find(p => p.id === playerId);
    if (!attacker) return;

    const endTime = Date.now() + info.duration * 1000;
    const targets = mode === 'TEAM' && attacker.team > 0 
      ? activePlayers.filter(p => p.team === attacker.team).map(p => p.id)
      : [playerId];

    setActiveBuffs(prev => {
      const next = { ...prev };
      targets.forEach(tid => {
        const current = next[tid] || [];
        const filtered = current.filter(it => it.type !== type);
        next[tid] = [...filtered, { type, endTime }];
      });
      return next;
    });
  }, [activePlayers, mode]);

  const handleAttack = useCallback((attackerId: number, targetId: number | 'others', type: 'HIDE') => {
    const attacker = activePlayers.find(p => p.id === attackerId);
    if (!attacker) return;

    if (targetId === 'others') {
      setAttacks(prev => {
        const next = { ...prev };
        const now = Date.now();
        activePlayers.forEach(p => {
          const isOpponent = mode === 'TEAM' && attacker.team > 0 
            ? p.team !== attacker.team 
            : p.id !== attackerId;
            
          if (isOpponent) {
            next[p.id] = { duration: 10, attackerId };
            setShortAttackTimes(prevTimes => ({ ...prevTimes, [p.id]: now }));
          }
        });
        return next;
      });
    } else if (targetId === -1) {
      // Random opponent
      const opponents = mode === 'TEAM' && attacker.team > 0
        ? activePlayers.filter(p => p.team !== attacker.team)
        : activePlayers.filter(p => p.id !== attackerId);
        
      if (opponents.length > 0) {
        const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
        const now = Date.now();
        setAttacks(prev => ({ ...prev, [randomOpp.id]: { duration: 10, attackerId } }));
        setShortAttackTimes(prev => ({ ...prev, [randomOpp.id]: now }));
      }
    } else {
      const now = Date.now();
      setAttacks(prev => ({ ...prev, [targetId]: { duration: 10, attackerId } }));
      setShortAttackTimes(prev => ({ ...prev, [targetId]: now }));
    }
  }, [activePlayers, mode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const TEAM_COLORS = [
    '',
    'border-red-500',
    'border-blue-500',
    'border-green-500',
    'border-yellow-500'
  ];

  const TEAM_NAMES = ['제외', 'A팀', 'B팀', 'C팀', 'D팀'];
  const TEAM_TEXT_COLORS = [
    '',
    'text-red-300',
    'text-blue-300',
    'text-green-300',
    'text-yellow-300'
  ];

  const getMissionName = () => {
    if (options.world === 'FRACTION') {
      return (
        <div className="flex items-center">
          <span className="bg-blue-800 text-white px-2 py-0.5 rounded mr-2 font-black text-sm">1</span>
          <span>대분수 ÷ 자연수</span>
        </div>
      );
    } else {
      const m = DECIMAL_MISSIONS.find(x => x.id === options.decimalMission);
      if (!m) return <span>소수 배틀</span>;
      return (
        <div className="flex items-center">
          <span className="bg-blue-800 text-white px-2 py-0.5 rounded mr-2 font-black text-sm">{m.num}</span>
          <span>{m.title}</span>
          {m.ex && <span className="text-blue-300 ml-2 text-sm">{m.ex}</span>}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Top Bar */}
      <div className={`flex justify-between items-center px-4 py-2 shadow-md z-10 border-b border-gray-800 transition-colors duration-300 ${timeLeft <= 10 ? 'animate-blink-red' : 'bg-gray-900'}`}>
        <div className="flex items-center gap-4 hidden sm:flex">
          <button onPointerDown={(e) => { e.preventDefault(); toggleFullscreen(); }} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors touch-none select-none" title="전체 화면">
            <Maximize size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-bold text-gray-300">
              {getMissionName()}
            </h1>
            <div className="flex items-center text-sm sm:text-base mt-1">
              <span className="text-gray-300 mr-3 bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                {DIFFICULTY_LABELS[options.difficulty].emoji} {DIFFICULTY_LABELS[options.difficulty].label}
              </span>
              {options.isItemMode && <span className="text-yellow-400 mr-2">✨ 아이템전 ✨</span>}
              {options.world === 'FRACTION' && options.requireIrreducible && <span className="text-blue-400 mr-2">🔹 기약분수</span>}
              {options.world === 'FRACTION' && options.requireMixed && <span className="text-orange-400 mr-2">🔸 대분수</span>}
            </div>
          </div>
        </div>

        <div className={`timer-text text-4xl sm:text-6xl lg:text-7xl font-mono tracking-wider ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
          {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {mode === 'TEAM' && (
            <div className="flex gap-2 sm:gap-4">
              {[1, 2, 3, 4].map(t => {
                if (!activePlayers.some(p => p.team === t)) return null;
                return (
                  <div key={t} className={`relative px-2 sm:px-4 py-1 rounded font-bold text-base sm:text-xl bg-gray-800 border text-center ${TEAM_COLORS[t]} ${TEAM_TEXT_COLORS[t]}`}>
                    {TEAM_NAMES[t]}: {teamScores[t]}
                    {teamScoreAnim[t] && <span className="absolute -top-4 right-0 text-yellow-300 animate-bounce font-black">+1</span>}
                  </div>
                );
              })}
            </div>
          )}
          <button onPointerDown={(e) => { e.preventDefault(); playSound('click'); onEnd(scores); }} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 font-bold shadow-sm touch-none select-none whitespace-nowrap">
            종료
          </button>
        </div>
      </div>
      
      {/* Players Row */}
      <div className="flex-1 flex flex-row w-full overflow-hidden gap-1 sm:gap-2 p-1 sm:p-2">
        {sortedPlayers.map((player) => (
          <div key={player.id} className="flex-1 min-w-0">
            <PlayerBoard
              id={player.id}
              team={player.team}
              config={PLAYERS[player.id]}
              score={scores[player.id] || 0}
              allScores={Object.values(scores)}
              options={options}
              activeItems={activeBuffs[player.id] || []}
              onCorrect={handleCorrect}
              onWrong={handleWrong}
              onApplyItem={(type) => handleApplyItem(player.id, type)}
              onAttack={handleAttack}
              borderColor={mode === 'TEAM' ? TEAM_COLORS[player.team] : 'border-gray-700'}
              isPaused={isPaused}
              isAttacked={(attacks[player.id]?.duration || 0) > 0 && !(activeBuffs[player.id] || []).some(it => it.type === 'SHIELD')}
              shortAttackTime={shortAttackTimes[player.id]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultScreen = ({ scores, activePlayers, mode, onRestart }: { scores: Record<number, number>; activePlayers: ActivePlayer[]; mode: GameMode; onRestart: () => void }) => {
  useEffect(() => {
    initAudio();
    playSound('tada');
  }, []);
  const TEAM_NAMES = ['제외', 'A팀', 'B팀', 'C팀', 'D팀'];
  const TEAM_COLORS = [
    '',
    'bg-red-900/60 border-red-500 text-red-300',
    'bg-blue-900/60 border-blue-500 text-blue-300',
    'bg-green-900/60 border-green-500 text-green-300',
    'bg-yellow-900/60 border-yellow-500 text-yellow-300'
  ];

  let ranked: any[] = [];

  if (mode === 'INDIVIDUAL') {
    ranked = activePlayers
      .map(p => ({ id: p.id, score: scores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);
  } else {
    const teamScores: Record<number, number> = {};
    activePlayers.forEach(p => {
      teamScores[p.team] = (teamScores[p.team] || 0) + (scores[p.id] || 0);
    });
    
    ranked = Object.entries(teamScores)
      .map(([team, score]) => ({ team: parseInt(team), score }))
      .sort((a, b) => b.score - a.score);
  }

  const rankedWithRanks = ranked.map((r) => {
    const rank = 1 + ranked.filter(other => other.score > r.score).length;
    return { ...r, rank };
  });

  const firstPlaceGroup = rankedWithRanks.filter(r => r.rank === 1);
  const others = rankedWithRanks.filter(r => r.rank > 1);

  // Dynamic sizing based on number of 1st place winners
  const isManyWinners = firstPlaceGroup.length > 2;
  const firstPlaceCols = firstPlaceGroup.length === 1 ? 'grid-cols-1' : 
                         firstPlaceGroup.length <= 4 ? 'grid-cols-2' : 
                         'grid-cols-4';
  
  const cardPadding = isManyWinners ? 'p-2 sm:p-3' : 'p-4';
  const emojiSize = isManyWinners ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-6xl';
  const nameSize = isManyWinners ? 'text-xl sm:text-3xl' : 'text-3xl sm:text-5xl';
  const scoreSize = isManyWinners ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-6xl';

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-gray-900 p-2 sm:p-4 overflow-hidden text-white">
      <div className="flex flex-col items-center w-full max-w-6xl flex-1 justify-center gap-2 sm:gap-4">
        <h1 className="text-3xl sm:text-5xl font-black text-yellow-400 drop-shadow-md">
          🎉 게임 결과 🎉
        </h1>
        
        <div className="w-full max-w-5xl flex flex-col items-center gap-2 sm:gap-4">
          <div className={`w-full grid gap-2 sm:gap-4 ${firstPlaceCols}`}>
            {firstPlaceGroup.map((firstPlace, idx) => (
              <div key={idx} className={`w-full bg-yellow-900/60 border-2 sm:border-4 border-yellow-400 rounded-xl sm:rounded-2xl shadow-2xl flex items-center justify-between ${cardPadding} flex-col justify-center gap-1 sm:gap-2 transform ${isManyWinners ? 'scale-100' : 'scale-105'} z-10 animate-neon-glow relative overflow-hidden`}>
                <div className="flex items-center space-x-2">
                  <span className={`${emojiSize} animate-bounce drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]`}>🥇</span>
                  <span className={`${nameSize} font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] ${mode === 'INDIVIDUAL' ? PLAYERS[firstPlace.id].textClass : TEAM_COLORS[firstPlace.team].split(' ')[2]}`}>
                    {mode === 'INDIVIDUAL' ? `${PLAYERS[firstPlace.id].emoji} ${PLAYERS[firstPlace.id].name}` : TEAM_NAMES[firstPlace.team]}
                  </span>
                </div>
                <span className={`${scoreSize} font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]`}>{firstPlace.score}점</span>
              </div>
            ))}
          </div>

          <div className={`grid gap-2 w-full mt-1 ${others.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {others.slice(0, 8).map((r, idx) => {
              return (
                <div key={idx} className={`flex items-center justify-between p-1.5 px-3 rounded-lg shadow-lg ${
                  r.rank === 2 ? 'bg-gray-800 border-2 border-gray-300' :
                  r.rank === 3 ? 'bg-orange-900/40 border-2 border-orange-500/50' :
                  'bg-gray-800 border border-gray-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg sm:text-xl font-black w-8 text-center">
                      {r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}위`}
                    </span>
                    <span className={`text-base sm:text-lg font-bold truncate max-w-[80px] ${mode === 'INDIVIDUAL' ? PLAYERS[r.id].textClass : TEAM_COLORS[r.team].split(' ')[2]}`}>
                      {mode === 'INDIVIDUAL' ? `${PLAYERS[r.id].emoji} ${PLAYERS[r.id].name}` : TEAM_NAMES[r.team]}
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-white">{r.score}점</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onPointerDown={(e) => { e.preventDefault(); playSound('click'); onRestart(); }}
          className="px-6 py-2 sm:px-8 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-lg sm:text-2xl shadow-blue-600/50 shadow-lg transform transition hover:scale-105 touch-none select-none mt-1"
        >
          메인 메뉴로
        </button>
      </div>

      {/* Bottom Horizontal Rankings (Position-based) - Full Width, Large */}
      <div className="w-full bg-gray-800/80 border-t-2 border-gray-700 p-2 sm:p-4">
        <div className="flex w-full gap-1 sm:gap-3">
          {(mode === 'TEAM' ? [...activePlayers].sort((a, b) => a.team - b.team) : activePlayers).map((p) => {
            const score = scores[p.id] || 0;
            const rank = 1 + Object.values(scores).filter(s => s > score).length;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
            const teamColor = p.team > 0 ? TEAM_COLORS[p.team].split(' ')[2] : PLAYERS[p.id].textClass;
            
            return (
              <div key={p.id} className="flex-1 flex flex-col items-center justify-center bg-gray-900/60 p-2 sm:p-4 rounded-xl border-2 border-gray-700 shadow-inner">
                <div className="text-4xl sm:text-6xl mb-2">{PLAYERS[p.id].emoji}</div>
                <div className={`text-sm sm:text-xl font-black mb-1 sm:mb-2 truncate w-full text-center ${teamColor}`}>{PLAYERS[p.id].name}</div>
                <div className="text-2xl sm:text-4xl font-black text-white">{score}점</div>
                <div className="mt-2 text-3xl sm:text-5xl h-10 sm:h-14 flex items-center justify-center">{medal}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'COUNTDOWN' | 'PLAYING' | 'RESULT' | 'WORKSHEET'>('MENU');
  const [duration, setDuration] = useState(60);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [mode, setMode] = useState<GameMode>('INDIVIDUAL');
  const [options, setOptions] = useState<GameOptions>({ requireIrreducible: false, requireMixed: false, difficulty: 'BRONZE', digitRange: [10, 20], isItemMode: false });
  const [finalScores, setFinalScores] = useState<Record<number, number>>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && gameState === 'MENU') {
      setGameState('WORKSHEET');
    }
  }, []);

  useEffect(() => {
    if (gameState === 'MENU') {
      document.title = '수학 배틀';
    } else {
      document.title = options.world === 'FRACTION' ? '분수 배틀' : '소수 배틀';
    }
  }, [gameState, options.world]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const startGame = (players: ActivePlayer[], d: number, opts: GameOptions, m: GameMode) => {
    setActivePlayers(players);
    setDuration(d);
    setOptions(opts);
    setMode(m);
    setGameState('COUNTDOWN');
  };

  const endGame = (scores: Record<number, number>) => {
    setFinalScores(scores);
    setGameState('RESULT');
  };

  const startWorksheet = (opts: GameOptions) => {
    setOptions(opts);
    setGameState('WORKSHEET');
  };

  return (
    <div className="w-full h-screen overflow-hidden select-none font-sans bg-black print:h-auto print:overflow-visible print:bg-white print:block">
      {gameState === 'MENU' && <MenuScreen onStart={startGame} onWorksheet={startWorksheet} />}
      {gameState === 'WORKSHEET' && <WorksheetScreen initialOptions={options} onBack={() => setGameState('MENU')} />}
      {gameState === 'COUNTDOWN' && (
        <>
          <GameScreen activePlayers={activePlayers} duration={duration} options={options} mode={mode} onEnd={endGame} isPaused={true} />
          <CountdownScreen onComplete={() => setGameState('PLAYING')} />
        </>
      )}
      {gameState === 'PLAYING' && <GameScreen activePlayers={activePlayers} duration={duration} options={options} mode={mode} onEnd={endGame} isPaused={false} />}
      {gameState === 'RESULT' && <ResultScreen scores={finalScores} activePlayers={activePlayers} mode={mode} onRestart={() => setGameState('MENU')} />}
    </div>
  );
}

const CountdownScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [count, setCount] = useState(3);
  useEffect(() => {
    initAudio();
    playSound('countdown', false);
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev === 1) {
          clearInterval(timer);
          playSound('countdown', true); // Start sound
          setTimeout(onComplete, 800);
          return 0;
        }
        playSound('countdown', false);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
      <div key={count} className="text-[20rem] font-black text-white animate-countdown drop-shadow-2xl" style={{ WebkitTextStroke: '10px black' }}>
        {count > 0 ? count : '시작!'}
      </div>
    </div>
  );
};
