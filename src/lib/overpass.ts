/**
 * Overpass API helper — query nearby POIs from OpenStreetMap
 * No API key required. Uses overpass-api.de public endpoint.
 */
export interface OverpassPoi {
  id: number;
  lat: number;
  lon: number;
  name?: string;
  type: string;
  distance?: number; // meters from query center
}

const CATEGORIES: Record<string, string> = {
  school: 'amenity=school',
  hospital: 'amenity=hospital',
  clinic: 'amenity=clinic',
  pharmacy: 'amenity=pharmacy',
  supermarket: 'shop=supermarket',
  mosque: 'amenity=place_of_worship',
  bank: 'amenity=bank',
  restaurant: 'amenity=restaurant',
  park: 'leisure=park',
  bus_stop: 'highway=bus_stop',
  fuel: 'amenity=fuel',
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function fetchNearbyPois(
  lat: number,
  lon: number,
  radiusM: number = 1000,
  categories: string[] = Object.keys(CATEGORIES),
): Promise<Record<string, OverpassPoi[]>> {
  const filters = categories
    .map((c) => `nwr[${CATEGORIES[c]}](around:${radiusM},${lat},${lon});`)
    .join('');
  const query = `[out:json][timeout:25];(${filters});out center 60;`;
  const url = 'https://overpass-api.de/api/interpreter';
  const res = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) throw new Error('Overpass request failed');
  const json = await res.json();
  const grouped: Record<string, OverpassPoi[]> = {};
  for (const c of categories) grouped[c] = [];
  for (const el of json.elements ?? []) {
    const elat = el.lat ?? el.center?.lat;
    const elon = el.lon ?? el.center?.lon;
    if (!elat || !elon) continue;
    const tags = el.tags ?? {};
    let cat: string | null = null;
    for (const c of categories) {
      const [k, v] = CATEGORIES[c].split('=');
      if (tags[k] === v) { cat = c; break; }
    }
    if (!cat) continue;
    grouped[cat].push({
      id: el.id,
      lat: elat,
      lon: elon,
      name: tags.name || tags['name:ar'] || tags['name:en'],
      type: cat,
      distance: haversine(lat, lon, elat, elon),
    });
  }
  for (const c of categories) grouped[c].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return grouped;
}

export const CATEGORY_LABELS_AR: Record<string, string> = {
  school: 'مدارس',
  hospital: 'مستشفيات',
  clinic: 'عيادات',
  pharmacy: 'صيدليات',
  supermarket: 'سوبر ماركت',
  mosque: 'مساجد',
  bank: 'بنوك',
  restaurant: 'مطاعم',
  park: 'حدائق',
  bus_stop: 'محطات أتوبيس',
  fuel: 'محطات وقود',
};

/** Walkability score 0-100 based on POI counts within radius */
export function computeWalkability(pois: Record<string, OverpassPoi[]>): number {
  const weights: Record<string, number> = {
    supermarket: 20, school: 15, pharmacy: 10, mosque: 10,
    bus_stop: 15, park: 10, bank: 5, restaurant: 5,
    hospital: 5, clinic: 3, fuel: 2,
  };
  let score = 0;
  for (const [cat, items] of Object.entries(pois)) {
    const w = weights[cat] ?? 1;
    score += Math.min(items.length, 3) * (w / 3);
  }
  return Math.min(100, Math.round(score));
}

/** Approximate isochrone radii (meters) for walking minutes */
export function isochroneRadius(minutes: number, mode: 'walk' | 'drive' = 'walk'): number {
  const speedMps = mode === 'walk' ? 1.3 : 8.3; // 4.7 km/h walking, 30 km/h urban driving
  return Math.round(speedMps * minutes * 60);
}
