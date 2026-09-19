/**
 * Formatting utilities for OceanGuard Tactical Command Console.
 * Enforces strict defense-grade formatting for telemetry and nautical units.
 * Never displays raw floating-point outputs.
 */

/**
 * Format latitude & longitude in nautical hemisphere format
 * Example: 18.7005° N, 82.1089° E
 */
export function formatCoordinates(lat?: number | null, lng?: number | null, precision = 4): string {
  if (lat === undefined || lat === null || isNaN(lat) || lng === undefined || lng === null || isNaN(lng)) {
    return '—';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat).toFixed(precision);
  const absLng = Math.abs(lng).toFixed(precision);
  return `${absLat}° ${latDir}, ${absLng}° ${lngDir}`;
}

export function formatLat(lat?: number | null, precision = 4): string {
  if (lat === undefined || lat === null || isNaN(lat)) return '—';
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(precision)}° ${dir}`;
}

export function formatLng(lng?: number | null, precision = 4): string {
  if (lng === undefined || lng === null || isNaN(lng)) return '—';
  const dir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lng).toFixed(precision)}° ${dir}`;
}

/**
 * Format area in km²
 * Example: 3.71 km²
 */
export function formatArea(km2?: number | null, precision = 2): string {
  if (km2 === undefined || km2 === null || isNaN(km2)) return '—';
  return `${km2.toFixed(precision)} km²`;
}

/**
 * Format distance in Nautical Miles (NM)
 * Example: 224.9 NM
 */
export function formatDistance(nm?: number | null, precision = 1): string {
  if (nm === undefined || nm === null || isNaN(nm)) return '—';
  return `${nm.toFixed(precision)} NM`;
}

/**
 * Format speed in Knots (kts)
 * Example: 13.4 kts
 */
export function formatSpeed(sog?: number | null, precision = 1): string {
  if (sog === undefined || sog === null || isNaN(sog)) return '—';
  return `${sog.toFixed(precision)} kts`;
}

/**
 * Format course over ground (COG) in zero-padded 3-digit degrees
 * Example: 045° or 180°
 */
export function formatCourse(cog?: number | null): string {
  if (cog === undefined || cog === null || isNaN(cog)) return '—';
  const norm = Math.round(((cog % 360) + 360) % 360);
  return `${norm.toString().padStart(3, '0')}°`;
}

/**
 * Format estimated slick volume in Megaliters (ML)
 * Example: 4.80 ML
 */
export function formatVolume(liters?: number | null): string {
  if (liters === undefined || liters === null || isNaN(liters)) return '—';
  const ml = liters / 1_000_000;
  return `${ml.toFixed(2)} ML`;
}

/**
 * Format percentage with single decimal or integer
 * Example: 94.2%
 */
export function formatPercent(val?: number | null, precision = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(precision)}%`;
}

/**
 * Format UTC timestamps
 * Example: 2026-09-19 18:25:00 UTC
 */
export function formatTimestampUTC(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return String(isoOrDate);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    const secs = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs} UTC`;
  } catch {
    return String(isoOrDate);
  }
}

/**
 * Format short time in UTC (HH:mm:ssZ)
 */
export function formatTimeOnlyUTC(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    const secs = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${mins}:${secs}Z`;
  } catch {
    return '—';
  }
}

/**
 * Format MMSI identifier
 */
export function formatMMSI(mmsi?: string | number | null): string {
  if (!mmsi) return '—';
  return String(mmsi);
}

/**
 * Format IMO identifier
 */
export function formatIMO(imo?: string | number | null): string {
  if (!imo) return 'IMO —';
  const s = String(imo);
  return s.startsWith('IMO') ? s : `IMO ${s}`;
}
