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

// Known COA-flagged case studies (Real-world coordinates for testing the SAR engine)
export const KNOWN_CASES: KnownCase[] = [
  {
    name: 'Barangay Calero Flood Control (Wawao Builders)',
    lat: 14.8242,
    lon: 120.8097,
    claimed_ntp_date: '2024-01-01',
    source: 'COA Ghost Project Report',
    description: 'COA flagged multiple Wawao Builders projects in Barangay Calero as ghost projects. The SAR engine should detect NO change here, which will be visually confirmed by the optical layer.',
  },
  {
    name: 'Sangley Point Airport Expansion',
    lat: 14.4960,
    lon: 120.9850,
    claimed_ntp_date: '2022-06-01',
    source: 'Real World Anomaly Test',
    description: 'Massive land clearing actually occurred around December 2021. With an NTP of June 2022, the SAR engine should flag this as a PRE-EXISTING structure fraud.',
  },
  {
    name: 'BGC Commercial Development',
    lat: 14.5500,
    lon: 121.0500,
    claimed_ntp_date: '2021-06-01',
    source: 'Real World Baseline Test',
    description: 'Actual construction started around July 2021. Since the NTP is June 2021, the SAR engine should correctly classify this as CONSISTENT with the contract timeline.',
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
