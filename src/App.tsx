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

type WorldType = 'FRACTION' | 'DECIMAL' | 'FRACTION_6_2' | 'DECIMAL_6_2';

type FractionMission = 'MIXED_NATURAL';
type Fraction62Mission = 
  | 'SAME_DENOM_DIVISIBLE'
  | 'SAME_DENOM_INDIVISIBLE'
  | 'DIFF_DENOM'
  | 'NATURAL_DIV_FRAC'
  | 'FRAC_DIV_FRAC_MULT'
  | 'MIXED_DIV_FRAC'
  | 'FRACTION_6_2_ALL_RANDOM';

type DecimalMission = 
  | 'DECIMAL_NATURAL_NO_CARRY'
  | 'DECIMAL_NATURAL_CARRY'
  | 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1'
  | 'DECIMAL_NATURAL_BRING_DOWN_ZERO'
  | 'DECIMAL_NATURAL_ZERO_IN_QUOTIENT'
  | 'NATURAL_NATURAL'
  | 'DECIMAL_ALL_RANDOM';

type Decimal62Mission = 
  | 'DEC1_DIV_DEC1'
  | 'DEC2_DIV_DEC2'
  | 'DEC2_DIV_DEC1'
  | 'NATURAL_DIV_DEC'
  | 'ROUND_QUOTIENT'
  | 'REMAINDER_AMOUNT'
  | 'DECIMAL_6_2_ALL_RANDOM';

type ProblemFraction = {
  whole?: number;
  num: number;
  den: number;
};

type Problem = {
  world: WorldType;
  // 6-1-1 Fraction World
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  // 6-2-1 Fraction World
  frac1?: ProblemFraction;
  frac2?: ProblemFraction;
  ansNum?: number;
  ansDen?: number;
  // Decimal World (6-1-3 & 6-2-2)
  dividend?: number;
  divisor?: number;
  quotient?: number;
  // 6-2-2 Decimal World Specifics
  roundDesc?: string;
  roundPlace?: number;
  isRemainderProblem?: boolean;
  remainder?: number;
  naturalQuotient?: number;
};

type GameOptions = {
  world: WorldType;
  fractionMission: FractionMission;
  decimalMission: DecimalMission;
  fraction62Mission: Fraction62Mission;
  decimal62Mission: Decimal62Mission;
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

const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);

function generateFraction62Problem(mission: Fraction62Mission, difficulty: Difficulty, rng: () => number = Math.random): Problem {
  if (mission === 'FRACTION_6_2_ALL_RANDOM') {
    const missions: Fraction62Mission[] = [
      'SAME_DENOM_DIVISIBLE',
      'SAME_DENOM_INDIVISIBLE',
      'DIFF_DENOM',
      'NATURAL_DIV_FRAC',
      'FRAC_DIV_FRAC_MULT',
      'MIXED_DIV_FRAC'
    ];
    mission = missions[Math.floor(rng() * missions.length)];
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }
  const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

  let frac1: ProblemFraction = { num: 1, den: 2 };
  let frac2: ProblemFraction = { num: 1, den: 2 };

  if (mission === 'SAME_DENOM_DIVISIBLE') {
    // 분모가 같은 (분수)÷(분수) - 분자끼리 나누어떨어짐
    let den = 10;
    let n2 = 1;
    let q = 2;

    switch (difficulty) {
      case 'BRONZE':
        // 차시 도입/익힘 기초: 단위분수(1/d)로 나누어 분자 값만큼 몫이 쏙 떨어지는 경우
        den = pick([3, 4, 5, 6, 7, 8, 9, 10]);
        n2 = 1;
        q = randInt(2, den - 1);
        break;
      case 'SILVER':
        // 익힘 2번 수준: 분모 6~13, 나누는 분자 2 or 3, 한 자리 자연수 몫
        den = pick([6, 7, 8, 9, 10, 11, 13]);
        n2 = pick([2, 3]);
        q = randInt(2, Math.min(4, Math.floor((den - 1) / n2)));
        break;
      case 'GOLD':
        // 익힘 3, 4번 수준: 분모 15~25, 몫 3~6
        den = pick([15, 17, 19, 21, 23]);
        n2 = pick([2, 3, 4, 5]);
        q = randInt(2, Math.floor((den - 1) / n2));
        break;
      case 'PLATINUM':
        // 가분수 포함 나눗셈: 몫 5~10
        den = pick([11, 13, 15, 17, 19]);
        n2 = pick([2, 3, 4]);
        q = randInt(5, 9);
        break;
      case 'DIAMOND':
        den = pick([21, 23, 27, 29, 31]);
        n2 = pick([3, 4, 5]);
        q = randInt(6, 12);
        break;
      case 'MASTER':
        den = pick([31, 37, 41, 43, 47]);
        n2 = pick([3, 4, 6, 7]);
        q = randInt(10, 18);
        break;
      case 'CHALLENGER':
        den = pick([53, 59, 61, 71, 83]);
        n2 = pick([4, 6, 7, 8]);
        q = randInt(15, 30);
        break;
    }
    const n1 = n2 * q;
    frac1 = { num: n1, den };
    frac2 = { num: n2, den };
  } else if (mission === 'SAME_DENOM_INDIVISIBLE') {
    // 분모가 같은 (분수)÷(분수) - 분자끼리 나누어떨어지지 않음
    let den = 7;
    let n1 = 3;
    let n2 = 4;

    switch (difficulty) {
      case 'BRONZE':
        // 차시 기초 (익힘 2-(1)번): 몫이 기약 진분수로 바로 떨어지는 경우 (n1 < n2)
        den = pick([5, 6, 7, 8, 9, 10, 11]);
        n2 = randInt(3, den - 1);
        n1 = randInt(2, n2 - 1);
        while (n2 % n1 === 0) {
          n1 = randInt(1, n2 - 1);
        }
        break;
      case 'SILVER':
        // 차시 기초 (익힘 1, 2-(2)번): 몫이 간단한 대분수 (1 < 몫 < 3)
        den = pick([7, 8, 9, 10, 11]);
        n2 = randInt(2, 4);
        n1 = randInt(n2 + 1, den - 1);
        while (n1 % n2 === 0) {
          n1 = randInt(n2 + 1, den - 1);
        }
        break;
      case 'GOLD':
        // 익힘 4, 5번: 분모 11~20, 서로소 대분수 몫
        den = pick([11, 13, 14, 15, 17, 19, 20]);
        n2 = pick([3, 4, 5, 7]);
        n1 = randInt(n2 + 1, den - 1);
        while (n1 % n2 === 0 || gcd(n1, n2) > 1) {
          n1 = randInt(n2 + 1, den - 1);
        }
        break;
      case 'PLATINUM':
        // 약분이 필요한 대분수 몫 (공약수 존재)
        den = pick([12, 14, 15, 16, 18, 20]);
        const g = pick([2, 3]);
        const k2 = pick([2, 3]);
        const k1 = pick([k2 + 1, k2 + 2, k2 + 3]);
        n1 = k1 * g;
        n2 = k2 * g;
        if (n1 >= den) den = n1 + randInt(1, 4);
        break;
      case 'DIAMOND':
        den = pick([15, 17, 19, 21, 23]);
        n2 = randInt(4, 7);
        n1 = randInt(n2 + 2, den + 5);
        while (n1 % n2 === 0) n1++;
        break;
      case 'MASTER':
        den = pick([21, 25, 27, 31, 35]);
        n2 = randInt(3, 6);
        n1 = n2 * randInt(3, 7) + randInt(1, n2 - 1);
        break;
      case 'CHALLENGER':
        den = pick([31, 37, 41, 47, 53]);
        n2 = randInt(5, 9);
        n1 = n2 * randInt(4, 9) + randInt(1, n2 - 1);
        break;
    }
    frac1 = { num: n1, den };
    frac2 = { num: n2, den };
  } else if (mission === 'DIFF_DENOM') {
    // 분모가 다른 (분수)÷(분수) - 통분하여 계산
    let d1 = 4, d2 = 8, n1 = 3, n2 = 1;
    switch (difficulty) {
      case 'BRONZE':
        // 차시 기초 (익힘 1번): 배수 관계 분모 & 단위분수로 나누기 (예: 3/4 ÷ 1/8 = 6, 3/5 ÷ 1/10 = 6)
        d1 = pick([3, 4, 5, 6, 7]);
        d2 = d1 * pick([2, 3]);
        n1 = randInt(2, d1 - 1);
        n2 = 1; // 단위분수
        break;
      case 'SILVER':
        // 익힘 2번: 배수 관계 분모 & 일반 분수 (예: 6/7 ÷ 3/14 = 4, 7/18 ÷ 4/9 = 7/8)
        d1 = pick([3, 4, 5, 6, 7]);
        d2 = d1 * pick([2, 3]);
        n1 = randInt(1, d1 - 1);
        n2 = randInt(2, d2 - 1);
        break;
      case 'GOLD':
        // 익힘 3번: 서로소 분모 통분 (예: 4/7 ÷ 3/5 = 20/21, 3/4 ÷ 4/7 = 1 5/16)
        d1 = pick([3, 4, 5, 7]);
        d2 = pick([4, 5, 7, 9].filter(x => x !== d1 && gcd(x, d1) === 1));
        n1 = randInt(1, d1 - 1);
        n2 = randInt(1, d2 - 1);
        break;
      case 'PLATINUM':
        // 최소공배수로 통분해야 하는 공약수 분모 (예: 5/6 ÷ 3/8 = 2 2/9)
        const gP = pick([2, 3, 4]);
        d1 = gP * pick([2, 3, 5]);
        d2 = gP * pick([3, 4, 5].filter(x => gP * x !== d1));
        n1 = randInt(1, d1 - 1);
        n2 = randInt(1, d2 - 1);
        break;
      case 'DIAMOND':
        d1 = pick([9, 10, 12, 14, 15, 16]);
        d2 = pick([8, 10, 12, 15, 18].filter(x => x !== d1));
        n1 = randInt(2, d1 - 1);
        n2 = randInt(2, d2 - 1);
        break;
      case 'MASTER':
        d1 = pick([14, 15, 18, 20, 21]);
        d2 = pick([12, 16, 20, 24, 28].filter(x => x !== d1));
        n1 = randInt(3, d1 - 1);
        n2 = randInt(3, d2 - 1);
        break;
      case 'CHALLENGER':
        d1 = pick([16, 20, 24, 25, 27]);
        d2 = pick([15, 18, 21, 28, 30]);
        n1 = randInt(5, d1 - 1);
        n2 = randInt(5, d2 - 1);
        break;
    }
    frac1 = { num: n1, den: d1 };
    frac2 = { num: n2, den: d2 };
  } else if (mission === 'NATURAL_DIV_FRAC') {
    // (자연수) ÷ (분수)
    let N = 5, n = 1, d = 6;
    switch (difficulty) {
      case 'BRONZE':
        // 차시 기초 (익힘 2-(1)번): (자연수) ÷ (단위분수) -> N * d (예: 5 ÷ 1/6 = 30, 4 ÷ 1/3 = 12)
        N = randInt(2, 7);
        n = 1;
        d = pick([3, 4, 5, 6, 7]);
        break;
      case 'SILVER':
        // 차시 원리 (익힘 1번, 지도서 18쪽): 자연수가 분자로 나누어떨어짐 -> (N÷n)*d (예: 6 ÷ 2/3 = 9, 8 ÷ 4/5 = 10)
        n = pick([2, 3, 4]);
        N = n * randInt(2, 5);
        d = pick([3, 5, 7, 8, 9].filter(x => x > n));
        break;
      case 'GOLD':
        // 익힘 3번: 두 자리 자연수 몫 (예: 21 ÷ 7/8 = 24, 18 ÷ 9/11 = 22, 14 ÷ 7/10 = 20)
        n = pick([3, 4, 7, 8, 9]);
        N = n * randInt(2, 4);
        d = pick([10, 11, 13, 15, 17].filter(x => x > n));
        break;
      case 'PLATINUM':
        // 몫이 대분수인 자연수 ÷ 분수 (예: 7 ÷ 2/3 = 10 1/2)
        n = pick([3, 4, 5, 7]);
        N = randInt(3, 10);
        while (N % n === 0) N++;
        d = pick([4, 5, 6, 8, 9].filter(x => x > n));
        break;
      case 'DIAMOND':
        n = pick([4, 5, 6, 7, 8]);
        N = randInt(15, 28);
        d = pick([7, 9, 11, 12, 13]);
        break;
      case 'MASTER':
        d = pick([3, 4, 5]);
        n = d + pick([1, 2, 3]);
        N = randInt(6, 24);
        break;
      case 'CHALLENGER':
        N = randInt(25, 60);
        n = pick([5, 6, 7, 8, 9]);
        d = pick([7, 11, 13, 14, 15]);
        break;
    }
    frac1 = { whole: N, num: 0, den: 1 };
    frac2 = { num: n, den: d };
  } else if (mission === 'FRAC_DIV_FRAC_MULT') {
    // (분수)÷(분수)를 분수의 곱셈으로 나타내어 계산
    let n1 = 8, d1 = 21, n2 = 2, d2 = 7;
    switch (difficulty) {
      case 'BRONZE':
        // 차시 기초 (지도서 21쪽, 익힘 4번): 곱셈으로 바꿨을 때 1회 대각선 약분이 깔끔하게 되는 형태
        // 예: 8/21 ÷ 2/7 = 8/21 * 7/2 = 4/3 = 1 1/3, 5/12 ÷ 5/6 = 1/2, 3/10 ÷ 2/5 = 3/4
        const g1 = pick([2, 3, 5, 7]);
        d2 = g1;
        d1 = g1 * pick([2, 3]);
        n2 = pick([2, 3, 4]);
        n1 = n2 * pick([2, 3]);
        break;
      case 'SILVER':
        // 익힘 2-(1)번: 약분 없이 진분수 곱으로 바로 끝나는 형태 (예: 1/8 ÷ 5/9 = 9/40, 3/7 ÷ 4/11 = 33/28 = 1 5/28)
        d1 = pick([5, 7, 8, 10]);
        d2 = pick([3, 9, 11].filter(x => gcd(x, d1) === 1));
        n1 = randInt(1, d1 - 1);
        n2 = randInt(2, d2 - 1);
        while (gcd(n1, n2) > 1 || gcd(n1, d2) > 1 || gcd(n2, d1) > 1) {
          n1 = randInt(1, d1 - 1);
          n2 = randInt(2, d2 - 1);
        }
        break;
      case 'GOLD':
        // 2회 약분 (양쪽 대각선 모두 약분) (예: 9/16 ÷ 3/4 = 3/4, 14/25 ÷ 7/10 = 4/5)
        const ga = pick([2, 3, 4]);
        const gb = pick([3, 5, 7]);
        n1 = ga * pick([1, 2, 3]);
        d1 = gb * pick([2, 3, 4]);
        n2 = ga * pick([1, 2]);
        d2 = gb * pick([1, 2]);
        if (n1 >= d1) n1 = d1 - 1;
        if (n2 >= d2) n2 = d2 - 1;
        break;
      case 'PLATINUM':
        d1 = pick([12, 15, 16, 18]);
        n2 = pick([2, 3, 4]);
        d2 = pick([6, 8, 9, 10]);
        n1 = randInt(Math.floor(d1 / 2), d1 - 1);
        break;
      case 'DIAMOND':
        d1 = pick([14, 18, 21, 25, 27]);
        d2 = pick([15, 20, 24, 28, 35]);
        n1 = randInt(4, d1 - 1);
        n2 = randInt(3, d2 - 1);
        break;
      case 'MASTER':
        d1 = pick([16, 20, 24, 28]);
        d2 = pick([15, 21, 25, 30]);
        n1 = randInt(8, d1 + 5);
        n2 = randInt(4, d2 - 1);
        break;
      case 'CHALLENGER':
        d1 = pick([24, 28, 32, 36]);
        d2 = pick([21, 25, 27, 35]);
        n1 = randInt(10, d1 + 8);
        n2 = randInt(6, d2 - 1);
        break;
    }
    frac1 = { num: n1, den: d1 };
    frac2 = { num: n2, den: d2 };
  } else if (mission === 'MIXED_DIV_FRAC') {
    // (대분수) ÷ (분수)
    switch (difficulty) {
      case 'BRONZE':
        // 차시 기초 (지도서 22쪽): 대분수 ÷ 진분수, 가분수로 바꾸었을 때 딱 떨어지는 자연수 몫!
        // 예: 4 1/2 ÷ 3/4 = 9/2 ÷ 3/4 = 6, 1 1/2 ÷ 3/4 = 2, 2 1/3 ÷ 7/9 = 3
        const baseSet = pick([
          { w: 4, n: 1, d: 2, n2: 3, d2: 4 }, // 9/2 ÷ 3/4 = 6
          { w: 1, n: 1, d: 2, n2: 3, d2: 4 }, // 3/2 ÷ 3/4 = 2
          { w: 2, n: 1, d: 3, n2: 7, d2: 9 }, // 7/3 ÷ 7/9 = 3
          { w: 1, n: 1, d: 4, n2: 5, d2: 8 }, // 5/4 ÷ 5/8 = 2
          { w: 3, n: 1, d: 2, n2: 7, d2: 10 } // 7/2 ÷ 7/10 = 5
        ]);
        frac1 = { whole: baseSet.w, num: baseSet.n, den: baseSet.d };
        frac2 = { num: baseSet.n2, den: baseSet.d2 };
        break;
      case 'SILVER':
        // 익힘 2-(1)번: 대분수 ÷ 진분수, 몫이 대분수 (예: 1 1/3 ÷ 5/8 = 2 2/15, 2 1/4 ÷ 3/7 = 5 1/4)
        frac1 = { whole: randInt(1, 3), num: pick([1, 2, 3]), den: pick([3, 4, 5, 7]) };
        if (frac1.num >= frac1.den) frac1.num = frac1.den - 1;
        frac2 = { num: pick([2, 3, 4]), den: pick([5, 6, 7, 8]) };
        if (frac2.num >= frac2.den) frac2.num = frac2.den - 1;
        break;
      case 'GOLD':
        // 지도서 23쪽: 대분수 ÷ 대분수, 자연수 몫 (예: 10 1/2 ÷ 1 3/4 = 21/2 ÷ 7/4 = 6, 3 1/2 ÷ 1 1/6 = 3)
        const mixedNatSet = pick([
          { w1: 10, n1: 1, d1: 2, w2: 1, n2: 3, d2: 4 }, // 6
          { w1: 3, n1: 1, d1: 2, w2: 1, n2: 1, d2: 6 },  // 3
          { w1: 4, n1: 1, d1: 2, w2: 2, n2: 1, d2: 4 },  // 2
          { w1: 6, n1: 2, d1: 3, w2: 1, n2: 1, d2: 3 }   // 5
        ]);
        frac1 = { whole: mixedNatSet.w1, num: mixedNatSet.n1, den: mixedNatSet.d1 };
        frac2 = { whole: mixedNatSet.w2, num: mixedNatSet.n2, den: mixedNatSet.d2 };
        break;
      case 'PLATINUM':
        // 익힘 2-(2)번, 지도서 23쪽: 대분수 ÷ 대분수, 분수 몫 (예: 2 3/4 ÷ 1 1/5 = 2 7/24, 3 3/4 ÷ 1 4/5 = 2 1/12)
        frac1 = { whole: randInt(2, 4), num: pick([1, 2, 3]), den: pick([3, 4, 5]) };
        if (frac1.num >= frac1.den) frac1.num = frac1.den - 1;
        frac2 = { whole: 1, num: pick([1, 2, 3]), den: pick([4, 5, 6]) };
        if (frac2.num >= frac2.den) frac2.num = frac2.den - 1;
        break;
      case 'DIAMOND':
        frac1 = { whole: 1, num: pick([1, 2, 3]), den: pick([4, 5, 6]) };
        if (frac1.num >= frac1.den) frac1.num = frac1.den - 1;
        frac2 = { whole: randInt(2, 3), num: pick([1, 3, 5]), den: pick([6, 7, 8]) };
        if (frac2.num >= frac2.den) frac2.num = frac2.den - 1;
        break;
      case 'MASTER':
        frac1 = { whole: randInt(4, 8), num: pick([1, 3, 5]), den: pick([4, 6, 8]) };
        if (frac1.num >= frac1.den) frac1.num = frac1.den - 1;
        frac2 = { whole: pick([1, 2]), num: pick([2, 3, 4]), den: pick([5, 7, 9]) };
        if (frac2.num >= frac2.den) frac2.num = frac2.den - 1;
        break;
      case 'CHALLENGER':
        frac1 = { whole: randInt(5, 10), num: pick([2, 4, 5]), den: pick([7, 9, 11]) };
        if (frac1.num >= frac1.den) frac1.num = frac1.den - 1;
        frac2 = { whole: randInt(2, 4), num: pick([3, 5, 6]), den: pick([8, 10, 12]) };
        if (frac2.num >= frac2.den) frac2.num = frac2.den - 1;
        break;
    }
  }

  const impNum1 = (frac1.whole || 0) * (frac1.den || 1) + (frac1.num || 0);
  const impDen1 = frac1.den || 1;
  const impNum2 = (frac2.whole || 0) * (frac2.den || 1) + (frac2.num || 0);
  const impDen2 = frac2.den || 1;

  const rawAnsNum = impNum1 * impDen2;
  const rawAnsDen = impDen1 * impNum2;
  const g = gcd(rawAnsNum, rawAnsDen);
  const ansNum = rawAnsNum / g;
  const ansDen = rawAnsDen / g;

  return {
    world: 'FRACTION_6_2',
    frac1,
    frac2,
    ansNum,
    ansDen
  };
}

function generateDecimal62Problem(mission: Decimal62Mission, difficulty: Difficulty, rng: () => number = Math.random): Problem {
  if (mission === 'DECIMAL_6_2_ALL_RANDOM') {
    const missions: Decimal62Mission[] = [
      'DEC1_DIV_DEC1',
      'DEC2_DIV_DEC2',
      'DEC2_DIV_DEC1',
      'NATURAL_DIV_DEC',
      'ROUND_QUOTIENT',
      'REMAINDER_AMOUNT'
    ];
    mission = missions[Math.floor(rng() * missions.length)];
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }
  const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

  let dividend = 3.6;
  let divisor = 0.9;
  let quotient = 4;
  let roundDesc: string | undefined = undefined;
  let roundPlace: number | undefined = undefined;
  let isRemainderProblem = false;
  let remainder: number | undefined = undefined;
  let naturalQuotient: number | undefined = undefined;

  if (mission === 'DEC1_DIV_DEC1') {
    let q = 4;
    let div = 0.9;
    switch (difficulty) {
      case 'BRONZE':
        div = pick([0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
        q = randInt(2, 9);
        break;
      case 'SILVER':
        div = pick([0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
        q = randInt(11, 35);
        break;
      case 'GOLD':
        div = pick([1.2, 1.4, 1.5, 1.6, 1.8, 2.4, 3.8]);
        q = randInt(2, 18);
        break;
      case 'PLATINUM':
        div = pick([1.2, 1.5, 2.4, 2.5, 2.8, 3.2]);
        q = pick([1.5, 2.5, 3.5, 4.5, 5.5]);
        break;
      case 'DIAMOND':
        div = pick([1.5, 2.5, 3.5, 4.5, 5.5]);
        q = pick([0.2, 0.4, 0.6, 0.8]);
        break;
      case 'MASTER':
        div = pick([1.4, 1.6, 2.4, 3.2, 3.6]);
        q = pick([0.25, 0.75, 1.25, 2.25]);
        break;
      case 'CHALLENGER':
        div = pick([2.4, 3.2, 4.8, 5.6]);
        q = pick([12.5, 14.5, 16.5, 18.5]);
        break;
    }
    divisor = div;
    quotient = q;
    dividend = parseFloat((divisor * quotient).toFixed(4));
  } else if (mission === 'DEC2_DIV_DEC2') {
    let q = 3;
    let div = 1.25;
    switch (difficulty) {
      case 'BRONZE':
        div = pick([0.12, 0.14, 0.16, 0.24, 0.28, 0.35, 0.74]);
        q = randInt(2, 9);
        break;
      case 'SILVER':
        div = pick([1.12, 1.25, 1.34, 1.48, 1.71, 1.86]);
        q = randInt(2, 9);
        break;
      case 'GOLD':
        div = pick([0.28, 1.15, 1.26, 1.44, 2.14, 2.18]);
        q = randInt(11, 25);
        break;
      case 'PLATINUM':
        div = pick([1.12, 1.24, 1.44, 1.68]);
        q = pick([2.5, 3.5, 4.5, 6.5]);
        break;
      case 'DIAMOND':
        div = pick([1.68, 1.85, 2.35, 3.15]);
        q = randInt(12, 28);
        break;
      case 'MASTER':
        div = pick([2.15, 3.15, 4.25]);
        q = pick([1.24, 2.16, 3.12]);
        break;
      case 'CHALLENGER':
        div = pick([2.35, 3.64, 4.15, 5.25]);
        q = randInt(15, 35);
        break;
    }
    divisor = div;
    quotient = q;
    dividend = parseFloat((divisor * quotient).toFixed(4));
  } else if (mission === 'DEC2_DIV_DEC1') {
    let q = 1.9;
    let div = 3.1;
    switch (difficulty) {
      case 'BRONZE':
        div = pick([0.6, 0.7, 0.8, 0.9]);
        q = parseFloat((randInt(11, 49) / 10).toFixed(1));
        break;
      case 'SILVER':
        div = pick([1.3, 1.8, 1.9, 2.1, 2.7, 3.1]);
        q = parseFloat((randInt(11, 49) / 10).toFixed(1));
        break;
      case 'GOLD':
        div = pick([2.4, 2.5, 3.2, 3.4, 3.5]);
        q = pick([1.4, 1.6, 1.7, 2.3, 2.4, 2.8]);
        break;
      case 'PLATINUM':
        div = pick([1.4, 1.8, 2.4, 3.2, 3.5]);
        q = parseFloat((randInt(110, 250) / 10).toFixed(1));
        break;
      case 'DIAMOND':
        div = pick([1.2, 1.5, 2.4, 3.6, 4.4]);
        q = pick([2.15, 2.25, 3.15, 4.12]);
        break;
      case 'MASTER':
        div = pick([2.4, 3.5, 4.2]);
        q = pick([2.04, 3.05, 4.02]);
        break;
      case 'CHALLENGER':
        div = pick([3.6, 3.9, 4.2, 4.8]);
        q = parseFloat((randInt(150, 350) / 10).toFixed(1));
        break;
    }
    divisor = div;
    quotient = q;
    dividend = parseFloat((divisor * quotient).toFixed(4));
  } else if (mission === 'NATURAL_DIV_DEC') {
    let q = 4;
    let div = 2.5;
    switch (difficulty) {
      case 'BRONZE':
        div = pick([1.5, 2.4, 2.5, 3.2, 3.5]);
        q = randInt(3, 15);
        break;
      case 'SILVER':
        div = pick([0.25, 0.75, 1.25, 1.75]);
        q = randInt(4, 20);
        break;
      case 'GOLD':
        div = pick([1.6, 1.8, 3.6, 4.5, 6.5]);
        q = pick([5, 8, 15, 25, 30, 35]);
        break;
      case 'PLATINUM':
        div = pick([0.36, 0.48, 0.64, 0.75, 0.84, 1.24]);
        q = pick([20, 25, 50, 75, 150]);
        break;
      case 'DIAMOND':
        div = pick([2.4, 2.5, 3.2, 3.5]);
        q = pick([2.5, 3.5, 4.5, 5.5, 6.5]);
        break;
      case 'MASTER':
        div = pick([1.25, 1.55, 2.25, 2.45]);
        q = randInt(60, 180);
        break;
      case 'CHALLENGER':
        div = pick([0.125, 0.375, 0.45, 0.625]);
        q = randInt(200, 600);
        break;
    }
    divisor = div;
    quotient = q;
    dividend = Math.round(divisor * quotient);
  } else if (mission === 'ROUND_QUOTIENT') {
    let div = 3;
    let dnd = 7;
    let place = 1;
    switch (difficulty) {
      case 'BRONZE':
        place = 1;
        div = pick([3, 6, 7, 9]);
        dnd = randInt(4, 15);
        while (dnd % div === 0) dnd++;
        break;
      case 'SILVER':
        place = 1;
        div = pick([11, 13, 14, 17]);
        dnd = randInt(15, 35);
        while (dnd % div === 0) dnd++;
        break;
      case 'GOLD':
        place = 1;
        div = parseFloat((randInt(7, 19) / 10).toFixed(1));
        dnd = parseFloat((randInt(21, 85) / 10).toFixed(1));
        break;
      case 'PLATINUM':
        place = 2;
        div = parseFloat((randInt(7, 18) / 10).toFixed(1));
        dnd = parseFloat((randInt(12, 65) / 10).toFixed(1));
        break;
      case 'DIAMOND':
        place = 2;
        div = parseFloat((randInt(11, 25) / 10).toFixed(1));
        dnd = parseFloat((randInt(150, 490) / 100).toFixed(2));
        break;
      case 'MASTER':
        place = 2;
        div = parseFloat((randInt(65, 145) / 100).toFixed(2));
        dnd = parseFloat((randInt(250, 680) / 100).toFixed(2));
        break;
      case 'CHALLENGER':
        place = 2;
        div = parseFloat((randInt(102, 165) / 10).toFixed(1));
        dnd = parseFloat((randInt(150, 350) / 100).toFixed(2));
        break;
    }
    divisor = div;
    dividend = dnd;
    const realQ = dividend / divisor;
    roundPlace = place;
    if (place === 0) {
      roundDesc = '일의 자리';
      quotient = Math.round(realQ);
    } else if (place === 1) {
      roundDesc = '소수 첫째 자리';
      quotient = parseFloat(realQ.toFixed(1));
    } else {
      roundDesc = '소수 둘째 자리';
      quotient = parseFloat(realQ.toFixed(2));
    }
  } else if (mission === 'REMAINDER_AMOUNT') {
    isRemainderProblem = true;
    let div = 2;
    let dnd = 6.3;
    switch (difficulty) {
      case 'BRONZE':
        div = pick([2, 3, 4, 5]);
        const qB = randInt(2, 5);
        const remB = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].filter(x => x < div));
        dnd = parseFloat((div * qB + remB).toFixed(1));
        break;
      case 'SILVER':
        div = pick([1.4, 1.5, 1.6, 1.7, 1.8]);
        const qS = randInt(3, 8);
        const remS = pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].filter(x => x < div));
        dnd = parseFloat((div * qS + remS).toFixed(1));
        break;
      case 'GOLD':
        div = pick([4, 5, 6, 7]);
        const qG = randInt(4, 9);
        const remG = pick([0.5, 1.1, 1.3, 2.1, 3.2, 4.1].filter(x => x < div));
        dnd = parseFloat((div * qG + remG).toFixed(1));
        break;
      case 'PLATINUM':
        div = pick([2.5, 2.8, 3.2, 3.5, 4.5]);
        const qP = randInt(5, 10);
        const remP = pick([0.4, 0.8, 1.2, 1.3, 1.6, 2.1].filter(x => x < div));
        dnd = parseFloat((div * qP + remP).toFixed(1));
        break;
      case 'DIAMOND':
        div = pick([2.6, 3.4, 3.8, 4.2]);
        const qD = randInt(4, 8);
        const remD = pick([0.35, 0.55, 0.85, 1.25, 1.85].filter(x => x < div));
        dnd = parseFloat((div * qD + remD).toFixed(2));
        break;
      case 'MASTER':
        div = pick([3.5, 4.2, 5.4]);
        const qM = randInt(6, 12);
        const remM = pick([0.45, 1.15, 1.65, 2.05, 2.45].filter(x => x < div));
        dnd = parseFloat((div * qM + remM).toFixed(2));
        break;
      case 'CHALLENGER':
        div = pick([2.15, 2.25, 3.15]);
        const qC = randInt(4, 8);
        const remC = pick([0.65, 1.15, 1.45, 1.85].filter(x => x < div));
        dnd = parseFloat((div * qC + remC).toFixed(2));
        break;
    }
    divisor = div;
    dividend = dnd;
    naturalQuotient = Math.floor(dividend / divisor);
    remainder = parseFloat((dividend - naturalQuotient * divisor).toFixed(4));
    quotient = remainder;
  }

  return {
    world: 'DECIMAL_6_2',
    dividend,
    divisor,
    quotient,
    roundDesc,
    roundPlace,
    isRemainderProblem,
    remainder,
    naturalQuotient
  };
}

function generateProblem(options: GameOptions, rng: () => number = Math.random): Problem {
  if (options.world === 'DECIMAL') {
    return generateDecimalProblem(options.decimalMission, options.difficulty, rng);
  }
  if (options.world === 'FRACTION_6_2') {
    return generateFraction62Problem(options.fraction62Mission, options.difficulty, rng);
  }
  if (options.world === 'DECIMAL_6_2') {
    return generateDecimal62Problem(options.decimal62Mission, options.difficulty, rng);
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
      if (isValid && mission === 'DECIMAL_NATURAL_QUOTIENT_LESS_THAN_1') {
        const divDecLen = dividend.toString().includes('.') ? dividend.toString().split('.')[1].length : 0;
        const quoDecLen = quotient.toString().includes('.') ? quotient.toString().split('.')[1].length : 0;
        if (divDecLen !== quoDecLen) {
          isValid = false;
        }
      }
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
  const isDecimalWorld = options.world === 'DECIMAL' || options.world === 'DECIMAL_6_2';
  const [input, setInput] = useState<InputState>({ whole: '', num: '', den: '', decimal: '' });
  const [activeField, setActiveField] = useState<ActiveField>(isDecimalWorld ? 'decimal' : 'whole');
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
      setActiveField(isDecimalWorld ? 'decimal' : 'whole');
      setStatus('idle');
    }, 600);
  }, [id, config.emoji, score, allScores, options, activeItems, onCorrect, onAttack, onApplyItem, isDecimalWorld]);

  const handleWrong = useCallback(() => {
    setStatus('wrong');
    playSound('wrong');
    setCombo(0);
    setFloats(prev => [...prev, { id: Date.now(), key: Math.random(), emoji: '💀' }]);
    onWrong(id);
    setTimeout(() => {
      setInput({ whole: '', num: '', den: '', decimal: '' });
      setActiveField(isDecimalWorld ? 'decimal' : 'whole');
      setStatus('idle');
    }, 600);
  }, [id, onWrong, isDecimalWorld]);

  const checkAnswer = useCallback(() => {
    if (isDecimalWorld) {
      if (!input.decimal) return;
      const userAns = parseFloat(input.decimal);
      if (Math.abs(userAns - (problem.quotient || 0)) < 0.0001) {
        handleCorrect();
      } else {
        handleWrong();
      }
      return;
    }

    let correctNum = 0;
    let correctDen = 1;

    if (options.world === 'FRACTION_6_2') {
      correctNum = problem.ansNum || 0;
      correctDen = problem.ansDen || 1;
    } else {
      correctNum = (problem.A || 0) * (problem.C || 1) + (problem.B || 0);
      correctDen = (problem.C || 1) * (problem.D || 1);
    }

    let w = parseInt(input.whole, 10) || 0;
    let n = parseInt(input.num, 10) || 0;
    let d = parseInt(input.den, 10) || 1;
    
    // If they entered numerator but no denominator:
    if (input.num && !input.den) {
      // 정답이 자연수인 경우(예: 5/1 = 5), 자연수 칸 없이 분자 칸에만 정답 숫자를 쓴 경우 통과 허용
      const isIntegerAnswer = correctDen !== 0 && (correctNum % correctDen === 0);
      if (!input.whole && isIntegerAnswer && (correctNum / correctDen === n)) {
        w = n;
        n = 0;
        d = 1;
      } else {
        handleWrong();
        return;
      }
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
  }, [input, problem, options, handleCorrect, handleWrong, isDecimalWorld]);

  const handleKey = useCallback((k: string) => {
    if (status !== 'idle') return;
    
    if (k === 'del') {
      playSound('backspace');
      setInput(prev => ({ ...prev, [activeField]: prev[activeField].slice(0, -1) }));
    } else if (k === 'enter') {
      playSound('click');
      checkAnswer();
    } else if (k === '대') {
      if (isDecimalWorld) return;
      playSound('input_whole');
      setActiveField('whole');
    } else if (k === '분') {
      if (isDecimalWorld) return;
      if (activeField === 'den') {
        playSound('input_num');
        setActiveField('num');
      } else {
        playSound('input_den');
        setActiveField('den');
      }
    } else if (k === '.') {
      if (!isDecimalWorld) return;
      playSound('click');
      if (!input.decimal.includes('.')) {
        setInput(prev => ({ ...prev, decimal: prev.decimal + '.' }));
      }
    } else {
      playSound('click');
      if (input[activeField].length < (isDecimalWorld ? 10 : 4)) {
        setInput(prev => ({ ...prev, [activeField]: prev[activeField] + k }));
      }
    }
  }, [status, activeField, input, checkAnswer, isDecimalWorld]);

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
              <div className="text-[clamp(1rem,2vw,2rem)] sm:text-2xl md:text-3xl flex flex-col items-center justify-center whitespace-nowrap text-gray-100">
                {problem.roundDesc && (
                  <div className="text-xs sm:text-sm text-yellow-300 font-bold mb-1 bg-yellow-950/70 border border-yellow-500/50 px-2.5 py-0.5 rounded-full">
                    반올림하여 {problem.roundDesc}까지
                  </div>
                )}
                {problem.isRemainderProblem && (
                  <div className="text-xs sm:text-sm text-sky-300 font-bold mb-1 bg-sky-950/70 border border-sky-500/50 px-2.5 py-0.5 rounded-full">
                    나누어 주고 남는 양 구하기
                  </div>
                )}
                <div className="flex items-center justify-center">
                  {isDecimalWorld ? (
                    <>
                      <span>{problem.dividend}</span>
                      <span className="mx-1">÷</span>
                      <span>{problem.divisor}</span>
                      <span className="mx-1">
                        {problem.roundDesc ? '≈' : (problem.isRemainderProblem ? '의 남는 양 =' : '=')}
                      </span>
                    </>
                  ) : options.world === 'FRACTION_6_2' && problem.frac1 && problem.frac2 ? (
                    <>
                      {problem.frac1.whole && !problem.frac1.num ? (
                        <span className="font-bold text-[1.1em]">{problem.frac1.whole}</span>
                      ) : (
                        <Fraction whole={problem.frac1.whole} num={problem.frac1.num} den={problem.frac1.den} />
                      )}
                      <span className="mx-1.5 sm:mx-2">÷</span>
                      {problem.frac2.whole && !problem.frac2.num ? (
                        <span className="font-bold text-[1.1em]">{problem.frac2.whole}</span>
                      ) : (
                        <Fraction whole={problem.frac2.whole} num={problem.frac2.num} den={problem.frac2.den} />
                      )}
                      <span className="mx-1 sm:mx-1.5">=</span>
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
            </div>
            
            {/* Input Area */}
            <div className="h-16 sm:h-20 w-full flex items-center justify-center text-xl sm:text-2xl font-bold">
              {isDecimalWorld ? (
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
        {isDecimalWorld ? (
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

const FRACTION_6_2_MISSIONS: { id: Fraction62Mission, num: number, title: string, ex: string }[] = [
  { id: 'SAME_DENOM_DIVISIBLE', num: 1, title: '분모가 같은 (분수)÷(분수) (나누어떨어짐)', ex: '4/9÷2/9=2' },
  { id: 'SAME_DENOM_INDIVISIBLE', num: 2, title: '분모가 같은 (분수)÷(분수) (나누어떨어지지 않음)', ex: '7/9÷2/9=3½' },
  { id: 'DIFF_DENOM', num: 3, title: '분모가 다른 (분수)÷(분수) (통분)', ex: '3/4÷4/7=1⁵/₁₆' },
  { id: 'NATURAL_DIV_FRAC', num: 4, title: '(자연수)÷(분수)', ex: '6÷⅔=9' },
  { id: 'FRAC_DIV_FRAC_MULT', num: 5, title: '(분수)÷(분수)를 곱셈으로 나타내기', ex: '⁸/₂₁÷²/₇=1⅓' },
  { id: 'MIXED_DIV_FRAC', num: 6, title: '(대분수)÷(분수)', ex: '4½÷¾=6' },
  { id: 'FRACTION_6_2_ALL_RANDOM', num: 7, title: '전체 랜덤 (6-2-1 종합)', ex: '' },
];

const DECIMAL_6_2_MISSIONS: { id: Decimal62Mission, num: number, title: string, ex: string }[] = [
  { id: 'DEC1_DIV_DEC1', num: 1, title: '(소수 한 자리 수)÷(소수 한 자리 수)', ex: '3.6÷0.9=4' },
  { id: 'DEC2_DIV_DEC2', num: 2, title: '(소수 두 자리 수)÷(소수 두 자리 수)', ex: '3.75÷1.25=3' },
  { id: 'DEC2_DIV_DEC1', num: 3, title: '(소수 두 자리 수)÷(소수 한 자리 수)', ex: '5.89÷3.1=1.9' },
  { id: 'NATURAL_DIV_DEC', num: 4, title: '(자연수)÷(소수)', ex: '3÷0.75=4' },
  { id: 'ROUND_QUOTIENT', num: 5, title: '몫을 반올림하여 나타내기', ex: '7÷3≈2.3' },
  { id: 'REMAINDER_AMOUNT', num: 6, title: '나누어 주고 남는 양 알아보기', ex: '12.4÷1.5 남는 양' },
  { id: 'DECIMAL_6_2_ALL_RANDOM', num: 7, title: '전체 랜덤 (6-2-2 종합)', ex: '' },
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

const CurvedBlueArrow = ({ spanCols }: { spanCols: number }) => {
  if (spanCols <= 0) return null;
  const colWidth = 24; // 1.5rem = 24px
  const widthPx = spanCols * colWidth;
  const depth = 8;
  
  let pathD = `M 0 0`;
  for (let i = 0; i < spanCols; i++) {
    const x1 = i * colWidth;
    const x2 = (i + 1) * colWidth;
    pathD += ` C ${x1 + 6} ${depth}, ${x2 - 6} ${depth}, ${x2} -2`;
  }
  
  const tipX = widthPx;
  const tipY = -2;
  const angle = -50 * (Math.PI / 180);
  const len = 5.5;
  const halfW = 2.2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const backX = tipX - len * cos;
  const backY = tipY - len * sin;
  const p1 = `${tipX.toFixed(1)},${tipY.toFixed(1)}`;
  const p2 = `${(backX - halfW * sin).toFixed(1)},${(backY + halfW * cos).toFixed(1)}`;
  const p3 = `${(backX + halfW * sin).toFixed(1)},${(backY - halfW * cos).toFixed(1)}`;

  return (
    <svg 
      className="absolute pointer-events-none z-30 overflow-visible"
      style={{ 
        width: `${widthPx}px`, 
        height: `${depth + 8}px`,
        left: '0px',
        top: '0px',
      }}
      viewBox={`0 0 ${widthPx} ${depth + 8}`}
    >
      <path d={pathD} fill="none" stroke="#0090e7" strokeWidth="1.6" strokeLinecap="round" />
      <polygon points={`${p1} ${p2} ${p3}`} fill="#0090e7" />
    </svg>
  );
};

function getDivisionRows62(dividend: number, divisor: number, effectiveQuotient: number, isRemainder: boolean): VisualRow[] {
  const divisStr = divisor.toString();
  const divisDotIdx = divisStr.indexOf('.');
  const shift = divisDotIdx === -1 ? 0 : divisStr.length - divisDotIdx - 1;
  
  const scaledDivisor = Math.round(divisor * Math.pow(10, shift));
  
  const dividStr = dividend.toString();
  const dividDotIdx = dividStr.indexOf('.');
  const dividIntLen = dividDotIdx === -1 ? dividStr.length : dividDotIdx;
  const dividDecLen = dividDotIdx === -1 ? 0 : dividStr.length - dividDotIdx - 1;
  
  const shiftedIntLen = dividIntLen + shift;
  
  const quoStr = effectiveQuotient.toString();
  const quoDotIdx = quoStr.indexOf('.');
  const quoDecLen = quoDotIdx === -1 ? 0 : quoStr.length - quoDotIdx - 1;
  
  const maxIdx = shiftedIntLen - 1;
  const minIdx = isRemainder ? 0 : -Math.max(dividDecLen > shift ? dividDecLen - shift : 0, quoDecLen);
  
  let currentVal = 0;
  let rows: VisualRow[] = [];
  let hasStarted = false;
  
  const getShiftedDigit = (idx: number): number => {
    const origIdx = idx - shift;
    if (origIdx >= 0) {
      if (origIdx < dividIntLen) {
        return parseInt(dividStr[dividIntLen - 1 - origIdx], 10);
      }
      return 0;
    } else {
      const decPos = -origIdx;
      if (decPos <= dividDecLen) {
        return parseInt(dividStr[dividDotIdx + decPos], 10);
      }
      return 0;
    }
  };
  
  for (let idx = maxIdx; idx >= minIdx; idx--) {
    const digit = getShiftedDigit(idx);
    currentVal = currentVal * 10 + digit;
    
    if (hasStarted) {
      rows.push({ type: 'rem', valStr: currentVal.toString(), endIdx: idx });
    }
    
    let qDigit = Math.floor(currentVal / scaledDivisor);
    let subVal = qDigit * scaledDivisor;
    
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
    let w = 1;
    let m = 1;
    if (opts.world === 'FRACTION') {
      w = 1;
      m = 1;
    } else if (opts.world === 'DECIMAL') {
      w = 2;
      const missionObj = DECIMAL_MISSIONS.find(x => x.id === opts.decimalMission);
      m = missionObj ? missionObj.num : 1;
    } else if (opts.world === 'FRACTION_6_2') {
      w = 3;
      const missionObj = FRACTION_6_2_MISSIONS.find(x => x.id === opts.fraction62Mission);
      m = missionObj ? missionObj.num : 1;
    } else if (opts.world === 'DECIMAL_6_2') {
      w = 4;
      const missionObj = DECIMAL_6_2_MISSIONS.find(x => x.id === opts.decimal62Mission);
      m = missionObj ? missionObj.num : 1;
    }
    const d = DIFFICULTIES.indexOf(opts.difficulty);
    const s = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${w}${m}${d}${s}`;
  };

  const parseSeedCode = (code: string) => {
    if (code.length !== 7) return null;
    const wCode = code[0];
    let w: WorldType = 'FRACTION';
    if (wCode === '1') w = 'FRACTION';
    else if (wCode === '2') w = 'DECIMAL';
    else if (wCode === '3') w = 'FRACTION_6_2';
    else if (wCode === '4') w = 'DECIMAL_6_2';
    else return null;

    const m = parseInt(code[1], 10);
    const d = parseInt(code[2], 10);
    const s = parseInt(code.substring(3), 10);
    if (isNaN(m) || isNaN(d) || isNaN(s)) return null;
    
    let decimalMission: DecimalMission = 'DECIMAL_NATURAL_NO_CARRY';
    if (w === 'DECIMAL') {
      const missionObj = DECIMAL_MISSIONS.find(x => x.num === m);
      if (missionObj) decimalMission = missionObj.id;
    }

    let fraction62Mission: Fraction62Mission = 'SAME_DENOM_DIVISIBLE';
    if (w === 'FRACTION_6_2') {
      const missionObj = FRACTION_6_2_MISSIONS.find(x => x.num === m);
      if (missionObj) fraction62Mission = missionObj.id;
    }

    let decimal62Mission: Decimal62Mission = 'DEC1_DIV_DEC1';
    if (w === 'DECIMAL_6_2') {
      const missionObj = DECIMAL_6_2_MISSIONS.find(x => x.num === m);
      if (missionObj) decimal62Mission = missionObj.id;
    }
    
    const difficulty = DIFFICULTIES[d] || 'BRONZE';
    
    return {
      world: w,
      fractionMission: 'MIXED_NATURAL' as FractionMission,
      decimalMission,
      fraction62Mission,
      decimal62Mission,
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
      fraction62Mission: parsed.fraction62Mission,
      decimal62Mission: parsed.decimal62Mission,
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
      <div className="p-8 max-w-5xl mx-auto w-full print:[zoom:0.7] print:p-0">
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-3xl font-black mb-2">
              {options.world === 'FRACTION' && '6-1-1 분수 학습지'}
              {options.world === 'DECIMAL' && '6-1-3 소수 학습지'}
              {options.world === 'FRACTION_6_2' && '6-2-1 분수의 나눗셈 학습지'}
              {options.world === 'DECIMAL_6_2' && '6-2-2 소수의 나눗셈 학습지'}
            </h1>
            <p className="text-lg text-gray-700">
              {options.world === 'FRACTION' && '1. 대분수 ÷ 자연수'}
              {options.world === 'DECIMAL' && (() => {
                const m = DECIMAL_MISSIONS.find(x => x.id === options.decimalMission);
                return m ? `${m.num}. ${m.title}` : '';
              })()}
              {options.world === 'FRACTION_6_2' && (() => {
                const m = FRACTION_6_2_MISSIONS.find(x => x.id === options.fraction62Mission);
                return m ? `${m.num}. ${m.title}` : '';
              })()}
              {options.world === 'DECIMAL_6_2' && (() => {
                const m = DECIMAL_6_2_MISSIONS.find(x => x.id === options.decimal62Mission);
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

        <div className="grid grid-cols-4 gap-x-6 gap-y-12 print:gap-y-8">
          {problems.map((p, i) => (
            <div key={i} className="flex items-start break-inside-avoid">
              <div className="flex-shrink-0 mr-2 mt-1">
                <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
              </div>
              
              <div className="flex flex-col w-full">
                {/* 6-1-1 분수 */}
                {p.world === 'FRACTION' && (
                  <div className="flex items-center gap-2 mb-2 text-base font-sans font-medium">
                    <div className="flex items-center">
                      {(p.A || 0) > 0 && <span>{p.A}</span>}
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
                          const num = (p.A || 0) * (p.C || 1) + (p.B || 0);
                          const den = (p.C || 1) * (p.D || 1);
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

                {/* 6-2-1 분수의 나눗셈 */}
                {p.world === 'FRACTION_6_2' && (
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-1.5 mb-2 text-base font-sans font-medium">
                      {p.frac1 && (
                        p.frac1.whole && !p.frac1.num ? (
                          <span>{p.frac1.whole}</span>
                        ) : (
                          <div className="flex items-center">
                            {p.frac1.whole && p.frac1.whole > 0 && <span>{p.frac1.whole}</span>}
                            <div className="flex flex-col items-center ml-0.5 text-sm">
                              <span className="border-b border-black leading-none px-1">{p.frac1.num}</span>
                              <span className="leading-none px-1">{p.frac1.den}</span>
                            </div>
                          </div>
                        )
                      )}
                      <span>÷</span>
                      {p.frac2 && (
                        p.frac2.whole && !p.frac2.num ? (
                          <span>{p.frac2.whole}</span>
                        ) : (
                          <div className="flex items-center">
                            {p.frac2.whole && p.frac2.whole > 0 && <span>{p.frac2.whole}</span>}
                            <div className="flex flex-col items-center ml-0.5 text-sm">
                              <span className="border-b border-black leading-none px-1">{p.frac2.num}</span>
                              <span className="leading-none px-1">{p.frac2.den}</span>
                            </div>
                          </div>
                        )
                      )}
                      <span>=</span>
                      {showAnswers && p.ansNum !== undefined && p.ansDen !== undefined && (
                        <span className="text-blue-600 ml-2 font-bold">
                          {(() => {
                            const whole = Math.floor(p.ansNum / p.ansDen);
                            const rem = p.ansNum % p.ansDen;
                            if (rem === 0) return whole.toString();
                            return (
                              <div className="inline-flex items-center">
                                {whole > 0 && <span>{whole}</span>}
                                <div className="flex flex-col items-center ml-0.5 text-sm">
                                  <span className="border-b border-blue-600 leading-none px-1">{rem}</span>
                                  <span className="leading-none px-1">{p.ansDen}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="h-32 border-2 border-dotted border-gray-300 rounded-lg w-full mt-2"></div>
                  </div>
                )}

                {/* 6-2-2 소수의 나눗셈 Calculation Area (Grid) */}
                {p.world === 'DECIMAL_6_2' && (
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-1.5 mb-1 text-sm font-sans font-medium flex-wrap">
                      {p.roundDesc && (
                        <span className="text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          {p.roundDesc} 반올림
                        </span>
                      )}
                      {p.isRemainderProblem && (
                        <span className="text-[11px] text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded font-bold">
                          남는 양 구하기
                        </span>
                      )}
                      <span>{p.dividend} ÷ {p.divisor}</span>
                      <span>{p.roundDesc ? '≈' : (p.isRemainderProblem ? '의 남는 양 =' : '=')}</span>
                      {showAnswers && (
                        <span className="text-blue-600 font-bold ml-1">
                          {p.isRemainderProblem ? `${p.remainder} (몫:${p.naturalQuotient})` : p.quotient}
                        </span>
                      )}
                    </div>

                    <div className="relative inline-block mt-1">
                      {/* Grid Background */}
                      <div className="grid" style={{ gridTemplateColumns: `repeat(9, 1.5rem)`, gridTemplateRows: `repeat(8, 1.5rem)` }}>
                        {Array.from({ length: 9 * 8 }).map((_, idx) => (
                          <div key={idx} className="border-b border-r border-gray-300 border-dashed box-border" style={{ borderTop: idx < 9 ? '1px dashed #d1d5db' : 'none', borderLeft: idx % 9 === 0 ? '1px dashed #d1d5db' : 'none' }}></div>
                        ))}
                      </div>

                      {/* Decimal 6-2 Problem & Solution Overlay */}
                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid" style={{ gridTemplateColumns: `repeat(9, 1.5rem)`, gridTemplateRows: `repeat(8, 1.5rem)` }}>
                        {(() => {
                          const divisRaw = (p.divisor || 0).toString();
                          const dividRaw = (p.dividend || 0).toString();

                          const divisDotIdx = divisRaw.indexOf('.');
                          const shift = divisDotIdx === -1 ? 0 : divisRaw.length - divisDotIdx - 1;

                          const divisDigits = divisRaw.replace('.', '');
                          const L_divis = divisDigits.length;

                          const dividDotIdx = dividRaw.indexOf('.');
                          const dividIntLen = dividDotIdx === -1 ? dividRaw.length : dividDotIdx;
                          const dividDecLen = dividDotIdx === -1 ? 0 : dividRaw.length - dividDotIdx - 1;

                          const dividDigits = dividRaw.replace('.', '');
                          const L_divid = dividDigits.length;

                          const padZeros = Math.max(0, shift - dividDecLen);

                          const totalCols = L_divis + L_divid + padZeros;
                          const startDivisCol = totalCols <= 5 ? 2 : 1;
                          const startDividCol = startDivisCol + L_divis;
                          const shiftedCol0 = startDividCol + dividIntLen - 1 + shift;

                          const getCol = (shiftedIdx: number) => shiftedCol0 - shiftedIdx;

                          const elements = [];

                          // 1. Divisor digits
                          divisDigits.split('').forEach((char, i) => {
                            const col = startDivisCol + i;
                            elements.push(
                              <div key={`divis_d_${i}`} className="flex items-center justify-center text-base font-sans font-medium" style={{ gridColumnStart: col, gridRowStart: 2 }}>
                                {char}
                              </div>
                            );
                          });

                          // Divisor original dot & curved blue arrow
                          if (divisDotIdx !== -1) {
                            const origDotCol = startDivisCol + divisDotIdx - 1;
                            elements.push(
                              <div key="divis_orig_dot" className="relative w-full h-full pointer-events-none" style={{ gridColumnStart: origDotCol, gridRowStart: 2 }}>
                                <div className="absolute rounded-full bg-black" style={{ width: '3.5px', height: '3.5px', right: '-1.75px', bottom: '3.5px' }} />
                                {showAnswers && shift > 0 && (
                                  <div className="absolute" style={{ right: '0px', bottom: '1px' }}>
                                    <CurvedBlueArrow spanCols={shift} />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // 2. Dividend digits
                          dividDigits.split('').forEach((char, i) => {
                            const col = startDividCol + i;
                            const isFirst = i === 0;
                            elements.push(
                              <div key={`divid_d_${i}`} className="flex items-center justify-center text-base font-sans font-medium border-t border-black relative" style={{ gridColumnStart: col, gridRowStart: 2 }}>
                                {isFirst && (
                                  <svg className="absolute left-0 top-[-1px] h-[calc(100%+1px)] w-1.5 overflow-visible" viewBox="0 0 6 24" preserveAspectRatio="none">
                                    <path d="M 0 0.5 C 3 0.5 5 5 5 12 C 5 19 3 23.5 0 23.5" fill="none" stroke="black" strokeWidth="1" />
                                  </svg>
                                )}
                                {char}
                              </div>
                            );
                          });

                          // Dividend original dot & curved blue arrow
                          if (dividDotIdx !== -1) {
                            const origDotCol = startDividCol + dividIntLen - 1;
                            elements.push(
                              <div key="divid_orig_dot" className="relative w-full h-full pointer-events-none" style={{ gridColumnStart: origDotCol, gridRowStart: 2 }}>
                                <div className="absolute rounded-full bg-black" style={{ width: '3.5px', height: '3.5px', right: '-1.75px', bottom: '3.5px' }} />
                                {showAnswers && shift > 0 && (
                                  <div className="absolute" style={{ right: '0px', bottom: '1px' }}>
                                    <CurvedBlueArrow spanCols={shift} />
                                  </div>
                                )}
                              </div>
                            );
                          } else if (showAnswers && shift > 0) {
                            // Natural dividend with shift > 0 (pad zero arrow)
                            const origCol = startDividCol + dividIntLen - 1;
                            elements.push(
                              <div key="divid_nat_arrow" className="relative w-full h-full pointer-events-none" style={{ gridColumnStart: origCol, gridRowStart: 2 }}>
                                <div className="absolute" style={{ right: '0px', bottom: '1px' }}>
                                  <CurvedBlueArrow spanCols={shift} />
                                </div>
                              </div>
                            );
                          }

                          // Padded zeros
                          if (padZeros > 0 && showAnswers) {
                            for (let z = 0; z < padZeros; z++) {
                              const zCol = startDividCol + L_divid + z;
                              elements.push(
                                <div key={`pad_0_${z}`} className="flex items-center justify-center text-base font-sans font-medium border-t border-black text-gray-400" style={{ gridColumnStart: zCol, gridRowStart: 2 }}>
                                  0
                                </div>
                              );
                            }
                          }

                          // 3. Solution (Quotient & Steps)
                          if (showAnswers) {
                            const effectiveQuo = p.isRemainderProblem && p.naturalQuotient !== undefined ? p.naturalQuotient : (p.quotient || 0);
                            const quoStr = effectiveQuo.toString();
                            const quoDotIdx = quoStr.indexOf('.');
                            const quoIntLen = quoDotIdx === -1 ? quoStr.length : quoDotIdx;

                            // Quotient digits in Row 1
                            let qCol = shiftedCol0 - quoIntLen + 1;
                            quoStr.split('').forEach((char, i) => {
                              if (char === '.') {
                                elements.push(
                                  <div key="quo_dot" className="relative w-full h-full pointer-events-none" style={{ gridColumnStart: qCol - 1, gridRowStart: 1 }}>
                                    <div className="absolute rounded-full bg-[#0090e7]" style={{ width: '3.5px', height: '3.5px', right: '-1.75px', bottom: '3.5px' }} />
                                  </div>
                                );
                                return;
                              }
                              elements.push(
                                <div key={`quo_${i}`} className="flex items-center justify-center text-base font-sans font-medium text-[#0090e7]" style={{ gridColumnStart: qCol, gridRowStart: 1 }}>
                                  {char}
                                </div>
                              );
                              qCol++;
                            });

                            // Steps Rows
                            const rows = getDivisionRows62(p.dividend || 0, p.divisor || 0, effectiveQuo, !!p.isRemainderProblem);
                            rows.forEach((row, rIdx) => {
                              const gridRow = 3 + rIdx;
                              row.valStr.split('').forEach((char, i) => {
                                const digitIdx = row.endIdx + row.valStr.length - 1 - i;
                                elements.push(
                                  <div key={`r62_${rIdx}_${i}`} className={`flex items-center justify-center text-base font-sans font-medium text-[#0090e7] ${row.type === 'sub' ? 'border-b border-[#0090e7]' : ''}`} style={{ gridColumnStart: getCol(digitIdx), gridRowStart: gridRow }}>
                                    {char}
                                  </div>
                                );
                              });
                            });

                            if (p.isRemainderProblem && p.remainder !== undefined) {
                              const remRow = 3 + rows.length;
                              elements.push(
                                <div key="rem_label" className="col-span-9 text-xs text-[#0090e7] font-bold mt-1 text-right" style={{ gridColumnStart: 1, gridColumnEnd: 10, gridRowStart: remRow }}>
                                  남는 양: {p.remainder}
                                </div>
                              );
                            }
                          }

                          return elements;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 6-1-3 Calculation Area */}
                {p.world === 'DECIMAL' && (
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
                        const divStr = (p.dividend || 0).toString();
                        const quoStr = (p.quotient || 0).toString();
                        const divDotIdx = divStr.indexOf('.');
                        const divIntLen = divDotIdx === -1 ? divStr.length : divDotIdx;
                        const divDecLen = divDotIdx === -1 ? 0 : divStr.length - divDotIdx - 1;
                        const quoDotIdx = quoStr.indexOf('.');
                        const quoDecLen = quoDotIdx === -1 ? 0 : quoStr.length - quoDotIdx - 1;
                        
                        const maxIdx = divIntLen - 1;
                        const minIdx = -Math.max(divDecLen, quoDecLen);
                        const L = (p.divisor || 0).toString().length;
                        const col0 = L + maxIdx + 1;
                        
                        const getCol = (idx: number) => col0 - idx;
                        
                        const elements = [];
                        
                        // Divisor
                        (p.divisor || 0).toString().split('').forEach((char, i) => {
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
                                <div className="absolute right-0 bottom-0 translate-x-1/2 -translate-y-[2px] font-bold scale-200">.</div>
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
                                  <div className="absolute right-0 bottom-0 translate-x-1/2 -translate-y-[2px] font-bold text-blue-600 scale-200">.</div>
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
                          const rows = getDivisionRows(p.dividend || 0, p.divisor || 0, p.quotient || 0);
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
                )}

                {p.world === 'FRACTION' && (
                  <div className="h-32 border-2 border-dotted border-gray-300 rounded-lg w-full mt-2"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MenuScreen = ({ onStart, onWorksheet }: { onStart: (players: ActivePlayer[], time: number, options: GameOptions, mode: GameMode) => void, onWorksheet: (options: GameOptions) => void }) => {
  const getDifficultyDescription = (world: WorldType, fractionMission: FractionMission, decimalMission: DecimalMission, fraction62Mission: Fraction62Mission, decimal62Mission: Decimal62Mission, difficulty: Difficulty) => {
    if (world === 'FRACTION') {
      return DIFFICULTY_LABELS[difficulty].desc;
    }

    if (world === 'FRACTION_6_2') {
      switch (difficulty) {
        case 'BRONZE': return '단위분수로 나누기\n몫: 자연수';
        case 'SILVER': return '분모 10 이하\n몫: 대분수/진분수';
        case 'GOLD': return '분모 10~20, 통분\n서로소 분모';
        case 'PLATINUM': return '공약수 통분 및 약분\n자연수÷진분수';
        case 'DIAMOND': return '분모 15~25, 가분수\n대분수÷진분수';
        case 'MASTER': return '대분수÷대분수\n다단계 약분 계산';
        case 'CHALLENGER': return '고난도 대분수÷대분수\n큰 수의 통분과 약분';
      }
    }

    if (world === 'DECIMAL_6_2') {
      switch (difficulty) {
        case 'BRONZE': return '몫: 1자리 자연수\n나누는 수 < 1';
        case 'SILVER': return '몫: 2자리 자연수\n나누는 수 > 1';
        case 'GOLD': return '소수점 아래 0 내림\n깔끔한 소수 몫';
        case 'PLATINUM': return '몫이 소수 1자리\n자연수÷소수 두 자리';
        case 'DIAMOND': return '몫이 소수 2자리\n소수 둘째 자리 반올림';
        case 'MASTER': return '큰 수의 소수 나눗셈\n몫 소수 첫째 자리 0';
        case 'CHALLENGER': return '고난도 소수 나눗셈\n정밀 계산 및 큰 수';
      }
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
  const [fraction62Mission, setFraction62Mission] = useState<Fraction62Mission>(() => (localStorage.getItem('fraction62Mission') as Fraction62Mission) || 'SAME_DENOM_DIVISIBLE');
  const [decimal62Mission, setDecimal62Mission] = useState<Decimal62Mission>(() => (localStorage.getItem('decimal62Mission') as Decimal62Mission) || 'DEC1_DIV_DEC1');
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
    localStorage.setItem('fraction62Mission', fraction62Mission);
    localStorage.setItem('decimal62Mission', decimal62Mission);
    localStorage.setItem('time', time.toString());
    localStorage.setItem('mode', mode);
    localStorage.setItem('individualCount', individualCount.toString());
    localStorage.setItem('teamAssignments', JSON.stringify(teamAssignments));
    localStorage.setItem('requireIrreducible', requireIrreducible.toString());
    localStorage.setItem('requireMixed', requireMixed.toString());
    localStorage.setItem('isItemMode', isItemMode.toString());
    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('digitRange', JSON.stringify(digitRange));
  }, [world, fractionMission, decimalMission, fraction62Mission, decimal62Mission, time, mode, individualCount, teamAssignments, requireIrreducible, requireMixed, isItemMode, difficulty, digitRange]);

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

    onStart(players, finalTime, { world, fractionMission, decimalMission, fraction62Mission, decimal62Mission, requireIrreducible, requireMixed, difficulty, digitRange, isItemMode }, mode);
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
    <div className="h-full w-full overflow-y-auto bg-gray-900 text-white relative">
      <button 
        onPointerDown={(e) => { e.preventDefault(); toggleFullscreen(); }} 
        className="fixed top-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors shadow-md touch-none select-none z-50"
        title="전체 화면"
      >
        <Maximize size={24} />
      </button>
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-16 w-full">
        <input
        value={subtitle}
        onChange={(e) => {
          setSubtitle(e.target.value);
          localStorage.setItem('subtitle', e.target.value);
        }}
        className="text-xl sm:text-2xl text-gray-400 bg-transparent text-center focus:outline-none focus:border-b border-gray-500 mb-2 w-full max-w-2xl"
        placeholder="부제목 입력"
      />
      <h1 className="text-3xl sm:text-6xl font-black text-blue-400 mb-8 drop-shadow-md text-center leading-tight w-full max-w-7xl">
        {world === 'FRACTION' && '👑 6-1-1 분수 배틀 ⚔️'}
        {world === 'DECIMAL' && '👑 6-1-3 소수 배틀 ⚔️'}
        {world === 'FRACTION_6_2' && '👑 6-2-1 분수의 나눗셈 배틀 ⚔️'}
        {world === 'DECIMAL_6_2' && '👑 6-2-2 소수의 나눗셈 배틀 ⚔️'}
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mb-8">
        {/* Left Column: World Selection Panel */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full lg:w-[350px] border border-gray-700 flex flex-col items-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">배틀 선택</h2>
          <div className="grid grid-cols-2 gap-2 mb-6 w-full">
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('FRACTION'); }} 
              className={`py-2.5 rounded-xl font-bold text-sm sm:text-base transition-colors touch-none select-none ${world === 'FRACTION' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              6-1-1 분수
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('DECIMAL'); }} 
              className={`py-2.5 rounded-xl font-bold text-sm sm:text-base transition-colors touch-none select-none ${world === 'DECIMAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              6-1-3 소수
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('FRACTION_6_2'); }} 
              className={`py-2.5 rounded-xl font-bold text-sm sm:text-base transition-colors touch-none select-none ${world === 'FRACTION_6_2' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              6-2-1 분수
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); playSound('click'); setWorld('DECIMAL_6_2'); }} 
              className={`py-2.5 rounded-xl font-bold text-sm sm:text-base transition-colors touch-none select-none ${world === 'DECIMAL_6_2' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              6-2-2 소수
            </button>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-300">미션 선택</h2>
          <div className="flex flex-col gap-2 w-full">
            {world === 'FRACTION' && (
              <button 
                onPointerDown={(e) => { e.preventDefault(); playSound('click'); setFractionMission('MIXED_NATURAL'); }} 
                className={`w-full py-3 rounded-xl transition-colors touch-none select-none flex items-center text-left ${fractionMission === 'MIXED_NATURAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                <span className={`px-3 py-1 rounded-lg mr-3 font-black shrink-0 ${fractionMission === 'MIXED_NATURAL' ? 'bg-white text-blue-600' : 'bg-gray-600 text-white'}`}>1</span>
                <span className="flex-1 font-bold text-lg">대분수 ÷ 자연수</span>
              </button>
            )}

            {world === 'DECIMAL' && (
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

            {world === 'FRACTION_6_2' && (
              <>
                {FRACTION_6_2_MISSIONS.map(m => (
                  <button 
                    key={m.id}
                    onPointerDown={(e) => { e.preventDefault(); playSound('click'); setFraction62Mission(m.id); }} 
                    className={`w-full py-2 rounded-xl transition-colors touch-none select-none flex items-center text-left ${fraction62Mission === m.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >
                    <span className={`px-3 py-1 rounded-lg ml-2 mr-3 font-black shrink-0 ${fraction62Mission === m.id ? 'bg-white text-emerald-700' : 'bg-gray-600 text-white'}`}>{m.num}</span>
                    <span className="flex-1 font-bold text-xs sm:text-sm">{m.title}</span>
                    {m.ex && <span className={`ml-1 mr-2 text-xs shrink-0 ${fraction62Mission === m.id ? 'text-emerald-200' : 'text-gray-400'}`}>{m.ex}</span>}
                  </button>
                ))}
              </>
            )}

            {world === 'DECIMAL_6_2' && (
              <>
                {DECIMAL_6_2_MISSIONS.map(m => (
                  <button 
                    key={m.id}
                    onPointerDown={(e) => { e.preventDefault(); playSound('click'); setDecimal62Mission(m.id); }} 
                    className={`w-full py-2 rounded-xl transition-colors touch-none select-none flex items-center text-left ${decimal62Mission === m.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >
                    <span className={`px-3 py-1 rounded-lg ml-2 mr-3 font-black shrink-0 ${decimal62Mission === m.id ? 'bg-white text-emerald-700' : 'bg-gray-600 text-white'}`}>{m.num}</span>
                    <span className="flex-1 font-bold text-xs sm:text-sm">{m.title}</span>
                    {m.ex && <span className={`ml-1 mr-2 text-xs shrink-0 ${decimal62Mission === m.id ? 'text-emerald-200' : 'text-gray-400'}`}>{m.ex}</span>}
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
            {(world === 'FRACTION' || world === 'FRACTION_6_2') && (
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
                    difficulty === d ? (world.includes('6_2') ? 'bg-emerald-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-xs sm:text-base lg:text-lg mb-0.5 sm:mb-1 whitespace-nowrap">{info.emoji} {info.label}</span>
                  <span className="text-[9px] sm:text-xs opacity-80 font-normal text-center leading-tight break-keep whitespace-pre-line">{getDifficultyDescription(world, fractionMission, decimalMission, fraction62Mission, decimal62Mission, d)}</span>
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
          onPointerDown={(e) => { e.preventDefault(); onWorksheet({ world, fractionMission, decimalMission, fraction62Mission, decimal62Mission, requireIrreducible, requireMixed, difficulty, digitRange, isItemMode }); }}
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
          <span>6-1-1 대분수 ÷ 자연수</span>
        </div>
      );
    } else if (options.world === 'DECIMAL') {
      const m = DECIMAL_MISSIONS.find(x => x.id === options.decimalMission);
      if (!m) return <span>6-1-3 소수의 나눗셈 배틀</span>;
      return (
        <div className="flex items-center">
          <span className="bg-blue-800 text-white px-2 py-0.5 rounded mr-2 font-black text-sm">{m.num}</span>
          <span>6-1-3 {m.title}</span>
          {m.ex && <span className="text-blue-300 ml-2 text-sm">{m.ex}</span>}
        </div>
      );
    } else if (options.world === 'FRACTION_6_2') {
      const m = FRACTION_6_2_MISSIONS.find(x => x.id === options.fraction62Mission);
      if (!m) return <span>6-2-1 분수의 나눗셈 배틀</span>;
      return (
        <div className="flex items-center">
          <span className="bg-emerald-700 text-white px-2 py-0.5 rounded mr-2 font-black text-sm">{m.num}</span>
          <span>6-2-1 {m.title}</span>
          {m.ex && <span className="text-emerald-300 ml-2 text-sm">{m.ex}</span>}
        </div>
      );
    } else if (options.world === 'DECIMAL_6_2') {
      const m = DECIMAL_6_2_MISSIONS.find(x => x.id === options.decimal62Mission);
      if (!m) return <span>6-2-2 소수의 나눗셈 배틀</span>;
      return (
        <div className="flex items-center">
          <span className="bg-emerald-700 text-white px-2 py-0.5 rounded mr-2 font-black text-sm">{m.num}</span>
          <span>6-2-2 {m.title}</span>
          {m.ex && <span className="text-emerald-300 ml-2 text-sm">{m.ex}</span>}
        </div>
      );
    }
    return <span>수학 배틀</span>;
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
              {(options.world === 'FRACTION' || options.world === 'FRACTION_6_2') && options.requireIrreducible && <span className="text-blue-400 mr-2">🔹 기약분수</span>}
              {(options.world === 'FRACTION' || options.world === 'FRACTION_6_2') && options.requireMixed && <span className="text-orange-400 mr-2">🔸 대분수</span>}
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
  const [options, setOptions] = useState<GameOptions>({ 
    world: 'FRACTION', 
    fractionMission: 'MIXED', 
    decimalMission: 'TYPE1', 
    fraction62Mission: 'SAME_DENOM_DIVISIBLE', 
    decimal62Mission: 'DEC1_DIV_DEC1', 
    requireIrreducible: false, 
    requireMixed: false, 
    difficulty: 'BRONZE', 
    digitRange: [10, 20], 
    isItemMode: false 
  });
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
      if (options.world === 'FRACTION') document.title = '6-1-1 분수의 나눗셈 배틀';
      else if (options.world === 'DECIMAL') document.title = '6-1-3 소수의 나눗셈 배틀';
      else if (options.world === 'FRACTION_6_2') document.title = '6-2-1 분수의 나눗셈 배틀';
      else if (options.world === 'DECIMAL_6_2') document.title = '6-2-2 소수의 나눗셈 배틀';
      else document.title = '수학 배틀';
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
