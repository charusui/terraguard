// Mock SAR backscatter data for demo purposes
// In the real system, this comes from Google Earth Engine Sentinel-1 GRD queries

export type VerdictType = 'PRE_EXISTING' | 'NO_CHANGE_DETECTED' | 'CONSISTENT';

export interface BackscatterPoint {
  date: string;
  backscatter_db: number;
  smoothed_db: number;
}

export interface ChangePointResult {
  detected_date: string | null;
  confidence: number;
  days_difference: number | null;
}

export interface AnalysisResult {
  series: BackscatterPoint[];
  change_point: ChangePointResult;
  verdict: VerdictType;
  explanation: string;
  claimed_date: string;
  coordinates: { lat: number; lon: number };
  project_name: string;
}

export interface KnownCase {
  name: string;
  lat: number;
  lon: number;
  claimed_ntp_date: string;
  source: string;
  description: string;
}

// Known COA-flagged case studies (placeholder coords — real ones come from DPWH/COA records)
export const KNOWN_CASES: KnownCase[] = [
  {
    name: 'Bulacan — Brgy. Santo Cristo, Pulilan',
    lat: 14.9021,
    lon: 120.8456,
    claimed_ntp_date: '2023-01-15',
    source: 'COA Annual Report 2023',
    description: 'Road rehabilitation project — NTP issued Jan 2023, but satellite shows disturbance in Oct 2022.',
  },
  {
    name: 'Bulacan — Taal, Pulilan',
    lat: 14.8874,
    lon: 120.8312,
    claimed_ntp_date: '2023-03-01',
    source: 'COA Annual Report 2023',
    description: 'Drainage improvement project — SAR change point detected 47 days before NTP.',
  },
  {
    name: 'Davao — Infrastructure Case Study',
    lat: 7.1907,
    lon: 125.4553,
    claimed_ntp_date: '2022-06-01',
    source: 'COA Special Audit 2022',
    description: 'Bridge approach fill — no significant SAR change detected despite 100% billing claim.',
  },
];

// Generate realistic mock SAR time series
function generateSARSeries(
  claimedDate: string,
  scenario: VerdictType,
  numPoints = 60
): BackscatterPoint[] {
  const claimed = new Date(claimedDate);
  const startDate = new Date(claimed);
  startDate.setMonth(startDate.getMonth() - 10);

  const series: BackscatterPoint[] = [];
  const baseLevel = -14 + (Math.random() - 0.5) * 2; // typical urban backscatter ~-12 to -16 dB

  let changeIndex: number;
  if (scenario === 'PRE_EXISTING') {
    changeIndex = Math.floor(numPoints * 0.28); // change well before claimed date
  } else if (scenario === 'CONSISTENT') {
    changeIndex = Math.floor(numPoints * 0.62); // change right around claimed date
  } else {
    changeIndex = -1; // no change
  }

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor((i / numPoints) * 365 + i * 0.5));

    const noise = (Math.random() - 0.5) * 1.8;
    const spike = Math.random() < 0.05 ? (Math.random() - 0.5) * 3 : 0;

    let signal: number;
    if (changeIndex >= 0 && i >= changeIndex) {
      // Step up after change point (construction increases backscatter)
      const ramp = Math.min(1, (i - changeIndex) / 5);
      signal = baseLevel + 3.5 * ramp + noise + spike;
    } else {
      signal = baseLevel + noise + spike;
    }

    // Smoothed = rolling median approx
    const prevVals = series.slice(Math.max(0, i - 2), i).map(p => p.backscatter_db);
    const smoothed = prevVals.length > 0
      ? (prevVals.reduce((a, b) => a + b, 0) / prevVals.length + signal) / 2
      : signal;

    series.push({
      date: date.toISOString().split('T')[0],
      backscatter_db: Math.round(signal * 100) / 100,
      smoothed_db: Math.round(smoothed * 100) / 100,
    });
  }

  return series;
}

function getDetectedDate(series: BackscatterPoint[], scenario: VerdictType, claimedDate: string): ChangePointResult {
  if (scenario === 'NO_CHANGE_DETECTED') {
    return { detected_date: null, confidence: 0.18, days_difference: null };
  }

  const changeIndex = scenario === 'PRE_EXISTING'
    ? Math.floor(series.length * 0.28)
    : Math.floor(series.length * 0.62);

  const detectedDate = series[changeIndex]?.date ?? null;
  const claimed = new Date(claimedDate);
  const detected = detectedDate ? new Date(detectedDate) : null;
  const daysDiff = detected ? Math.round((detected.getTime() - claimed.getTime()) / 86400000) : null;
  const confidence = 0.72 + Math.random() * 0.22;

  return {
    detected_date: detectedDate,
    confidence: Math.round(confidence * 100) / 100,
    days_difference: daysDiff,
  };
}

function getExplanation(verdict: VerdictType, changePoint: ChangePointResult): string {
  if (verdict === 'PRE_EXISTING') {
    const days = Math.abs(changePoint.days_difference ?? 0);
    return `Satellite backscatter data shows significant ground disturbance approximately ${days} days BEFORE the contract Notice-to-Proceed date. This indicates the structure may have already existed prior to the contract award — a potential indicator of pre-existing infrastructure fraud.`;
  }
  if (verdict === 'NO_CHANGE_DETECTED') {
    return `No statistically significant change in backscatter was detected at this coordinate during the entire analysis window. Despite billing claims, the satellite record shows no evidence of construction activity. This may indicate ghost billing or a project that has not yet broken ground.`;
  }
  return `The detected construction start date is consistent with the contract timeline. Backscatter change was observed within the expected window following the Notice-to-Proceed date. No anomaly detected for this location.`;
}

// Simulate an analysis (mock GEE call + ruptures detection)
export async function analyzeCoordinate(
  lat: number,
  lon: number,
  claimedDate: string,
  projectName = 'Custom Lookup',
  scenario?: VerdictType
): Promise<AnalysisResult> {
  // --- Real GEE mode ---
  if (process.env.NEXT_PUBLIC_USE_REAL_GEE === 'true') {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('tg_token') ?? '' : '';
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ lat, lon, claimed_date: claimedDate, project_name: projectName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'GEE analysis failed');
    }
    return res.json();
  }

  // --- Mock / demo mode (no GEE required) ---
  await new Promise(resolve => setTimeout(resolve, 2500 + Math.random() * 1500));

  let resolvedScenario: VerdictType;
  if (scenario) {
    resolvedScenario = scenario;
  } else {
    const hash = Math.abs(Math.round(lat * 100 + lon * 10)) % 3;
    resolvedScenario = hash === 0 ? 'PRE_EXISTING' : hash === 1 ? 'NO_CHANGE_DETECTED' : 'CONSISTENT';
  }

  const series = generateSARSeries(claimedDate, resolvedScenario);
  const changePoint = getDetectedDate(series, resolvedScenario, claimedDate);
  const explanation = getExplanation(resolvedScenario, changePoint);

  return {
    series,
    change_point: changePoint,
    verdict: resolvedScenario,
    explanation,
    claimed_date: claimedDate,
    coordinates: { lat, lon },
    project_name: projectName,
  };
}

// Batch mode: process multiple rows
export async function analyzeBatch(
  rows: Array<{ name: string; lat: number; lon: number; claimed_ntp_date: string }>
): Promise<Array<AnalysisResult & { error?: string }>> {
  const results = [];
  for (const row of rows) {
    try {
      const result = await analyzeCoordinate(row.lat, row.lon, row.claimed_ntp_date, row.name);
      results.push(result);
    } catch (e) {
      results.push({
        series: [],
        change_point: { detected_date: null, confidence: 0, days_difference: null },
        verdict: 'NO_CHANGE_DETECTED' as VerdictType,
        explanation: '',
        claimed_date: row.claimed_ntp_date,
        coordinates: { lat: row.lat, lon: row.lon },
        project_name: row.name,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }
  return results;
}
