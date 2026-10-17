// Quality tiers. Auto-picks Mobile on iOS / touch-only devices, High otherwise.
// Override with ?quality=high|medium|mobile in the URL.
export interface Tier { name: string; pixelRatio: number; bloomScale: number; maxLights: number; shadowMap: number; rainCount: number; ssr: boolean }
export type TierName = 'high' | 'medium' | 'mobile';
export const TIERS: Record<TierName, Tier> = {
  high:   { name: 'High',   pixelRatio: 2,   bloomScale: 0.5,  maxLights: 24, shadowMap: 2048, rainCount: 4000, ssr: false },
  medium: { name: 'Medium', pixelRatio: 1.5, bloomScale: 0.5,  maxLights: 16, shadowMap: 1024, rainCount: 2500, ssr: false },
  mobile: { name: 'Mobile', pixelRatio: 1.5,   bloomScale: 0.25, maxLights: 12, shadowMap: 1024, rainCount: 1200, ssr: false },
};

export const QUALITY_KEY = 'nl.quality'; // set by the pause menu

function detectTier(): TierName {
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced && forced in TIERS) return forced as TierName;
  try { const saved = localStorage.getItem(QUALITY_KEY); if (saved && saved in TIERS) return saved as TierName; } catch { /* private mode */ }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return ios || touchOnly ? 'mobile' : 'high';
}

export const settings: { tier: TierName; quality: Tier } = { tier: detectTier() } as { tier: TierName; quality: Tier };
settings.quality = TIERS[settings.tier];
