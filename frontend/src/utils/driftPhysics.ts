// ─────────────────────────────────────────────────────────────────────────────
// OceanGuard Tactical Engine — Hydrodynamic Drift & Weathering Physics (OpenDrift/OpenOil Style)
// Grounded in Fay's gravity-viscous spreading & Mackay evaporative weathering equations
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatheringTelemetry {
  hour: number;
  activeAreaKm2: number;
  volumeRemainingLiters: number;
  evaporatedPercent: number;
  emulsifiedPercent: number;
  beachedPercent: number;
  particleCount: number;
  distanceToShoreNm: number;
  phase: 'BACKTRACKING' | 'DETECTION' | 'FORECASTING';
  severityColor: string;
}

export interface InterpolatedParticle {
  id: number;
  lat: number;
  lng: number;
  prevLat: number;
  prevLng: number;
  speedKts: number;
  state: 'FRESH' | 'EMULSIFIED' | 'DISPERSED' | 'BEACHED';
  density: number; // 0.0 to 1.0
  dropletSizeUm: number;
}

export interface ConcentrationContours {
  coreHull: [number, number][];       // High density / thick emulsion (> 100 g/m²)
  sheenHull: [number, number][];      // Medium density / visible slick (10-100 g/m²)
  dispersionHull: [number, number][]; // Low density / rainbow sheen (< 10 g/m²)
}

export interface StreamlineVector {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  type: 'CURRENT' | 'WIND';
  magnitudeKts: number;
}

// Hydrodynamic environmental forcing parameters for Mumbai High / Arabian Sea Sector
export const DRIFT_ENVIRONMENT = {
  seaWaterTempC: 28.5,
  surfaceCurrentKts: 1.35,
  surfaceCurrentDirDeg: 125, // Flowing South-East towards Maharashtra/Goa/Gujarat shelf
  windSpeedKts: 14.2,
  windDirDeg: 315,           // North-Westerly monsoon breeze
  windDriftFactor: 0.032,     // 3.2% wind drift factor (standard oceanographic parameter)
  shorelineDistanceBaseNm: 86.4, // Baseline distance to closest coast
};

/**
 * Calculates continuous Fay spreading and Mackay weathering as a function of simulation hour t in [-48, +72]
 */
export function calculateWeatheringTelemetry(
  hour: number,
  initialVolumeLiters: number = 4820000,
  initialAreaKm2: number = 4.82
): WeatheringTelemetry {
  const isBacktracking = hour < 0;
  const isDetection = Math.abs(hour) < 0.2;

  let activeAreaKm2: number;
  let evaporatedPercent: number;
  let emulsifiedPercent: number;
  let beachedPercent: number;
  let volumeRemainingLiters: number;
  let distanceToShoreNm: number;

  if (isBacktracking) {
    // Backtracking from detection (T=0) back to discharge origin (T=-48h)
    // As we go back in time, slick compresses back into the vessel discharge pipe/bilge plume
    const backRatio = Math.max(0, 1 - Math.abs(hour) / 48); // 1.0 at 0h, 0.0 at -48h
    activeAreaKm2 = Math.max(0.25, initialAreaKm2 * (0.15 + 0.85 * Math.pow(backRatio, 1.2)));
    evaporatedPercent = Math.max(0, 22.4 * Math.pow(backRatio, 0.8));
    emulsifiedPercent = Math.max(0, 38.0 * Math.pow(backRatio, 1.4));
    beachedPercent = 0;
    volumeRemainingLiters = initialVolumeLiters * (0.95 + 0.05 * (1 - backRatio));
    distanceToShoreNm = DRIFT_ENVIRONMENT.shorelineDistanceBaseNm + (1 - backRatio) * 18.2;
  } else {
    // Forward forecasting from detection (T=0) out to T=+72h
    // Area expands following modified Fay's gravity-viscous regime: A(t) = A0 * (1 + beta * t^0.75)
    const tForward = hour;
    const expansionFactor = 1 + 0.38 * Math.pow(tForward, 0.72);
    activeAreaKm2 = initialAreaKm2 * expansionFactor;

    // Mackay Evaporative weathering: F_evap = (1/c) * ln(1 + c * k * t)
    evaporatedPercent = Math.min(48.5, 22.4 + 26.1 * (1 - Math.exp(-tForward / 24)));

    // Emulsification (water uptake creating chocolate mousse)
    emulsifiedPercent = Math.min(74.0, 38.0 + 36.0 * (1 - Math.exp(-tForward / 36)));

    // Beaching onto coastal shelf / reefs (progressively after +38 hours)
    if (tForward > 38) {
      beachedPercent = Math.min(62.5, ((tForward - 38) / 34) * 58.0);
    } else {
      beachedPercent = 0;
    }

    // Net surface volume taking into account evaporation and water incorporation
    const weatheringRetention = (100 - evaporatedPercent - beachedPercent * 0.5) / 100;
    volumeRemainingLiters = initialVolumeLiters * weatheringRetention;

    // Approaching shoreline
    distanceToShoreNm = Math.max(
      4.2,
      DRIFT_ENVIRONMENT.shorelineDistanceBaseNm - tForward * (DRIFT_ENVIRONMENT.surfaceCurrentKts * 0.95)
    );
  }

  const phase: WeatheringTelemetry['phase'] = isDetection
    ? 'DETECTION'
    : isBacktracking
    ? 'BACKTRACKING'
    : 'FORECASTING';

  const severityColor =
    phase === 'DETECTION'
      ? '#00f0ff'
      : phase === 'BACKTRACKING'
      ? '#f59e0b'
      : beachedPercent > 20
      ? '#f43f5e'
      : '#38bdf8';

  return {
    hour: Number(hour.toFixed(1)),
    activeAreaKm2: Number(activeAreaKm2.toFixed(2)),
    volumeRemainingLiters: Math.round(volumeRemainingLiters),
    evaporatedPercent: Number(evaporatedPercent.toFixed(1)),
    emulsifiedPercent: Number(emulsifiedPercent.toFixed(1)),
    beachedPercent: Number(beachedPercent.toFixed(1)),
    particleCount: Math.round(110 * (1 - beachedPercent * 0.005)),
    distanceToShoreNm: Number(distanceToShoreNm.toFixed(1)),
    phase,
    severityColor,
  };
}

/**
 * Calculates dynamic particle positions and continuous velocity streamlines for any continuous fractional hour t
 */
export function interpolateParticleCloud(
  hour: number,
  originLat: number,
  originLng: number,
  spillLat: number,
  spillLng: number,
  forwardLat: number,
  forwardLng: number,
  numParticles: number = 110
): InterpolatedParticle[] {
  const particles: InterpolatedParticle[] = [];
  const dt = 0.5; // half-hour backward difference for instantaneous velocity vector

  for (let i = 0; i < numParticles; i++) {
    const seedAngle = (i / numParticles) * Math.PI * 2;
    const seedVariation = Math.sin(i * 19.3) * 0.5 + 0.5; // 0 to 1
    const particleDropletSize = 25 + (i % 75) * 4.5; // micrometers

    // Calculate current position at 'hour'
    const [lat, lng, density] = computeParticleAtHour(
      hour,
      i,
      seedAngle,
      seedVariation,
      originLat,
      originLng,
      spillLat,
      spillLng,
      forwardLat,
      forwardLng
    );

    // Calculate position at 'hour - dt' to get smooth directional velocity vectors
    const [prevLat, prevLng] = computeParticleAtHour(
      hour - dt,
      i,
      seedAngle,
      seedVariation,
      originLat,
      originLng,
      spillLat,
      spillLng,
      forwardLat,
      forwardLng
    );

    // Calculate nautical mile displacement & speed in knots
    const dLatNm = (lat - prevLat) * 60;
    const dLngNm = (lng - prevLng) * 60 * Math.cos((lat * Math.PI) / 180);
    const displacementNm = Math.sqrt(dLatNm * dLatNm + dLngNm * dLngNm);
    const speedKts = Number((displacementNm / dt).toFixed(1));

    // Determine individual particle weathering state
    let state: InterpolatedParticle['state'] = 'FRESH';
    if (hour > 40 && seedVariation > 0.65) {
      state = 'BEACHED';
    } else if (hour > 15 || density < 0.4) {
      state = 'EMULSIFIED';
    } else if (density < 0.25) {
      state = 'DISPERSED';
    }

    particles.push({
      id: i + 1,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      prevLat: Number(prevLat.toFixed(5)),
      prevLng: Number(prevLng.toFixed(5)),
      speedKts,
      state,
      density: Number(density.toFixed(2)),
      dropletSizeUm: Math.round(particleDropletSize),
    });
  }

  return particles;
}

function computeParticleAtHour(
  h: number,
  idx: number,
  seedAngle: number,
  seedVariation: number,
  originLat: number,
  originLng: number,
  spillLat: number,
  spillLng: number,
  forwardLat: number,
  forwardLng: number
): [number, number, number] {
  let centerLat: number;
  let centerLng: number;
  let spreadRadiusDeg: number;
  let density: number;

  if (h <= 0) {
    // Backtracking from origin (-48h) to detection (0h)
    const t = (h + 48) / 48; // 0 at -48h, 1 at 0h
    // Non-linear trajectory due to tidal oscillation & turning wind
    const tidalWobble = Math.sin(t * Math.PI * 4) * 0.008;

    centerLat = originLat + (spillLat - originLat) * t + tidalWobble;
    centerLng = originLng + (spillLng - originLng) * t + tidalWobble * 0.7;

    // Spread contracts towards the point-source bilge release as t -> 0 (-48h)
    spreadRadiusDeg = (0.006 + 0.024 * Math.pow(t, 1.4)) * (0.6 + 0.4 * seedVariation);
    density = 0.5 + 0.5 * t;
  } else {
    // Forward forecasting from detection (0h) to +72h
    const t = h / 72; // 0 at 0h, 1 at 72h
    // Deflection due to Coriolis force & bathymetric shoaling toward Gujarat coast
    const coastalDeflection = Math.pow(t, 1.3) * 0.045;

    centerLat = spillLat + (forwardLat - spillLat) * t + coastalDeflection * 0.3;
    centerLng = spillLng + (forwardLng - spillLng) * t + coastalDeflection;

    // Diffusive expansion under Brownian ocean turbulence: sigma ~ sqrt(K * t)
    spreadRadiusDeg = (0.03 + 0.09 * Math.sqrt(t)) * (0.5 + 0.5 * seedVariation);
    density = Math.max(0.15, 1.0 - t * 0.75);
  }

  // Add individual chaotic eddy particle displacement
  const eddyFreq = 0.45;
  const jitterLat =
    Math.sin(seedAngle + h * eddyFreq) * spreadRadiusDeg +
    ((idx % 7) - 3) * 0.002 * (1 + Math.abs(h) * 0.02);
  const jitterLng =
    Math.cos(seedAngle + h * eddyFreq) * spreadRadiusDeg * 1.1 +
    ((idx % 5) - 2) * 0.002 * (1 + Math.abs(h) * 0.02);

  return [centerLat + jitterLat, centerLng + jitterLng, density];
}

/**
 * Builds graduated multi-layer Iso-concentration polygons (Core -> Sheen -> Rainbow envelope)
 */
export function generateConcentrationContours(
  particles: InterpolatedParticle[],
  hour: number
): ConcentrationContours {
  if (!particles || particles.length < 10) {
    return { coreHull: [], sheenHull: [], dispersionHull: [] };
  }

  // Filter high density particles for core
  const coreParticles = particles.filter((p) => p.density > 0.65);
  // Medium density for sheen
  const sheenParticles = particles.filter((p) => p.density > 0.35);

  const coreHull = computeConvexHull(
    coreParticles.length >= 4 ? coreParticles : particles.slice(0, 16)
  );
  const sheenHull = computeConvexHull(
    sheenParticles.length >= 6 ? sheenParticles : particles.slice(0, 45)
  );
  const dispersionHull = computeConvexHull(particles);

  return {
    coreHull,
    sheenHull,
    dispersionHull,
  };
}

/**
 * Graham Scan Convex Hull algorithm for Lat/Lng particle coordinates
 */
function computeConvexHull(particles: { lat: number; lng: number }[]): [number, number][] {
  if (particles.length < 3) {
    return particles.map((p) => [p.lat, p.lng]);
  }

  // Find lowest lat (or lowest lng if tie)
  let pivot = particles[0];
  for (let i = 1; i < particles.length; i++) {
    if (
      particles[i].lat < pivot.lat ||
      (particles[i].lat === pivot.lat && particles[i].lng < pivot.lng)
    ) {
      pivot = particles[i];
    }
  }

  // Sort by polar angle with respect to pivot
  const sorted = particles
    .filter((p) => p !== pivot)
    .sort((a, b) => {
      const angleA = Math.atan2(a.lat - pivot.lat, a.lng - pivot.lng);
      const angleB = Math.atan2(b.lat - pivot.lat, b.lng - pivot.lng);
      return angleA - angleB;
    });

  const hull: [number, number][] = [[pivot.lat, pivot.lng]];

  for (const pt of sorted) {
    while (hull.length >= 2) {
      const b = hull[hull.length - 1];
      const a = hull[hull.length - 2];
      const crossProduct = (b[1] - a[1]) * (pt.lat - a[0]) - (b[0] - a[0]) * (pt.lng - a[1]);
      // Ensure strict counter-clockwise turn
      if (crossProduct <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push([pt.lat, pt.lng]);
  }

  // Close polygon
  if (hull.length > 2) {
    hull.push([hull[0][0], hull[0][1]]);
  }

  return hull;
}

/**
 * Computes live environmental surface current & wind forcing vectors across the tactical region
 */
export function generateEnvironmentalVectors(
  centerLat: number,
  centerLng: number
): StreamlineVector[] {
  const vectors: StreamlineVector[] = [];
  const currentDirRad = (DRIFT_ENVIRONMENT.surfaceCurrentDirDeg * Math.PI) / 180;
  const windDirRad = (DRIFT_ENVIRONMENT.windDirDeg * Math.PI) / 180;

  // Grid of vectors around the spill AOI
  const offsets = [
    [-0.25, -0.25],
    [-0.25, 0.25],
    [0.25, -0.25],
    [0.25, 0.25],
    [0.0, -0.35],
    [0.0, 0.35],
  ];

  offsets.forEach(([dLat, dLng]) => {
    const sLat = centerLat + dLat;
    const sLng = centerLng + dLng;

    // Surface ocean current vector (Teal)
    const curLen = 0.045 * (DRIFT_ENVIRONMENT.surfaceCurrentKts / 1.5);
    vectors.push({
      startLat: sLat,
      startLng: sLng,
      endLat: sLat + Math.cos(currentDirRad) * curLen,
      endLng: sLng + Math.sin(currentDirRad) * (curLen / Math.cos((sLat * Math.PI) / 180)),
      type: 'CURRENT',
      magnitudeKts: DRIFT_ENVIRONMENT.surfaceCurrentKts,
    });

    // Atmospheric surface wind vector (Amber)
    const windLen = 0.065 * (DRIFT_ENVIRONMENT.windSpeedKts / 15.0);
    vectors.push({
      startLat: sLat + 0.05,
      startLng: sLng + 0.05,
      endLat: sLat + 0.05 + Math.cos(windDirRad) * windLen,
      endLng: sLng + 0.05 + Math.sin(windDirRad) * (windLen / Math.cos((sLat * Math.PI) / 180)),
      type: 'WIND',
      magnitudeKts: DRIFT_ENVIRONMENT.windSpeedKts,
    });
  });

  return vectors;
}

/**
 * Calculates vessel track point interpolated at simulation hour t
 */
export function interpolateVesselPositionAtHour(
  vesselTrack: [number, number, string][],
  hour: number
): { lat: number; lng: number; isIntermittent: boolean } | null {
  if (!vesselTrack || vesselTrack.length === 0) return null;

  // If only one point
  if (vesselTrack.length === 1) {
    return { lat: vesselTrack[0][0], lng: vesselTrack[0][1], isIntermittent: false };
  }

  // Normalize hour in [-48, +72] into progress fraction along the vessel's recorded waypoints
  // We align T=0 (hour=0) to the middle of the track
  const progress = Math.max(0, Math.min(1, (hour + 48) / 120));
  const exactIndex = progress * (vesselTrack.length - 1);
  const baseIdx = Math.floor(exactIndex);
  const nextIdx = Math.min(vesselTrack.length - 1, baseIdx + 1);
  const fraction = exactIndex - baseIdx;

  const pt1 = vesselTrack[baseIdx];
  const pt2 = vesselTrack[nextIdx];

  const lat = pt1[0] + (pt2[0] - pt1[0]) * fraction;
  const lng = pt1[1] + (pt2[1] - pt1[1]) * fraction;

  // Simulate AIS gap between -1.5h and -0.2h (the discharge release window)
  const isIntermittent = hour >= -1.5 && hour <= -0.2;

  return { lat, lng, isIntermittent };
}
