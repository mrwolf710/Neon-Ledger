// Quality tiers. Auto-picks Mobile on iOS / touch-only devices, High otherwise.
// Override with ?quality=high|medium|mobile in the URL.
export const TIERS = {
  high:   { name: 'High',   pixelRatio: 2,   bloomScale: 0.5,  maxLights: 24, shadowMap: 2048, rainCount: 4000, ssr: false },
  medium: { name: 'Medium', pixelRatio: 1.5, bloomScale: 0.5,  maxLights: 16, shadowMap: 1024, rainCount: 2500, ssr: false },
  mobile: { name: 'Mobile', pixelRatio: 2,   bloomScale: 0.25, maxLights: 12, shadowMap: 1024, rainCount: 1200, ssr: false },
};

function detectTier() {
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced && TIERS[forced]) return forced;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return ios || touchOnly ? 'mobile' : 'high';
}

export const settings = { tier: detectTier() };
settings.quality = TIERS[settings.tier];
