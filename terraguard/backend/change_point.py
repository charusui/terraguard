"""
change_point.py
---------------
Detects change points in Sentinel-1 SAR backscatter time series
using ruptures.Pelt with RBF cost function.
"""

import numpy as np
import pandas as pd
import ruptures as rpt
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ChangePointResult:
    detected_date: Optional[datetime]   # None if no significant change found
    confidence: float                    # 0.0–1.0
    smoothed_series: pd.DataFrame        # Smoothed series for plotting
    breakpoint_index: Optional[int]      # Raw index into smoothed_series


def detect_change_point(df: pd.DataFrame) -> ChangePointResult:
    """
    Detect the most significant change point in a SAR backscatter time series.

    Args:
        df: DataFrame with columns 'date' (datetime) and 'backscatter_db' (float)

    Returns:
        ChangePointResult — detected_date is None if no significant change found
    """
    if len(df) < 6:
        return ChangePointResult(
            detected_date=None,
            confidence=0.0,
            smoothed_series=df.copy(),
            breakpoint_index=None,
        )

    # --- Preprocessing ---
    # 1. Rolling median (window=7) to heavily suppress temporary SAR speckle and transient events (trucks/floods)
    values = df["backscatter_db"].values.copy()
    smoothed = pd.Series(values).rolling(window=7, center=True, min_periods=1).median().values.copy()

    # 2. Z-score outlier removal (>3σ replaced with rolling median)
    z_scores = np.abs((smoothed - smoothed.mean()) / (smoothed.std() + 1e-9))
    smoothed[z_scores > 3] = np.nan
    smoothed = pd.Series(smoothed).interpolate().values

    smoothed_df = df.copy()
    smoothed_df["smoothed_db"] = smoothed

    # --- Change point detection with ruptures.Pelt ---
    signal = smoothed.reshape(-1, 1)
    try:
        algo = rpt.Pelt(model="rbf").fit(signal)
        # pen=5 penalty to detect breakpoints in a focused time window
        breakpoints = algo.predict(pen=5)
        # Pelt always includes len(signal) as last breakpoint — remove it
        breakpoints = [b for b in breakpoints if b < len(signal)]
    except Exception:
        breakpoints = []

    if not breakpoints:
        return ChangePointResult(
            detected_date=None,
            confidence=0.0,
            smoothed_series=smoothed_df,
            breakpoint_index=None,
        )

    # Take the breakpoint with the largest significant shift (> 0.35 dB)
    best_bp = None
    best_shift = 0.0
    for bp in breakpoints:
        if bp < 2 or bp > len(signal) - 2:
            continue
        before = smoothed[max(0, bp-15):bp].mean()
        after = smoothed[bp:min(len(smoothed), bp+15)].mean()
        shift = abs(after - before)
        
        if shift > 0.35:
            if best_bp is None or shift > best_shift:
                best_shift = shift
                best_bp = bp

    if best_bp is None:
        return ChangePointResult(
            detected_date=None,
            confidence=0.0,
            smoothed_series=smoothed_df,
            breakpoint_index=None,
        )

    # --- Significance thresholds ---
    # 0.35 dB threshold to detect real structural changes (which typically range from 0.7 - 1.5 dB)
    MIN_SHIFT_DB = 0.35
    MIN_CONFIDENCE = 0.3

    overall_variance = smoothed.std()
    snr = best_shift / (overall_variance + 1e-9)
    
    # Map the Signal-to-Noise Ratio (SNR) to a more realistic probability curve.
    confidence = float(np.clip(0.65 + (snr * 0.15), 0.0, 0.99))

    if best_shift < MIN_SHIFT_DB or confidence < MIN_CONFIDENCE:
        return ChangePointResult(
            detected_date=None,
            confidence=confidence,
            smoothed_series=smoothed_df,
            breakpoint_index=None,
        )

    detected_date = df.iloc[best_bp]["date"]
    if isinstance(detected_date, str):
        detected_date = datetime.strptime(detected_date, "%Y-%m-%d")

    return ChangePointResult(
        detected_date=detected_date,
        confidence=round(confidence, 3),
        smoothed_series=smoothed_df,
        breakpoint_index=best_bp,
    )
