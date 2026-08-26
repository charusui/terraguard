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

# SNR at which a detection is considered an even bet. A shift twice the
# residual noise is suggestive; three times is convincing.
CONFIDENCE_MIDPOINT_SNR = 2.5


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

    # Prefer the detrended series: site minus surrounding reference, which
    # cancels whatever moved across the whole area (moisture, seasonal drying)
    # and leaves what is local to the site. Falls back to the raw reading for
    # callers and fixtures that predate the reference column.
    source_column = "relative_db" if "relative_db" in df.columns else "backscatter_db"

    # --- Preprocessing ---
    # 1. Rolling median (window=7) to heavily suppress temporary SAR speckle and transient events (trucks/floods)
    values = df[source_column].values.copy()
    smoothed = pd.Series(values).rolling(window=7, center=True, min_periods=1).median().values.copy()

    # 2. Z-score outlier removal (>3σ replaced with rolling median)
    z_scores = np.abs((smoothed - smoothed.mean()) / (smoothed.std() + 1e-9))
    smoothed[z_scores > 3] = np.nan
    # limit_direction fills leading/trailing gaps too. Plain interpolate()
    # leaves a NaN at index 0 if the first sample was an outlier, and that
    # NaN then propagates all the way into the reported confidence.
    smoothed = pd.Series(smoothed).interpolate(limit_direction="both").values

    smoothed_df = df.copy()
    # The chart stays in raw dB, which is the readable unit and keeps the plotted
    # line comparable across sites. Detection runs on the detrended series above.
    # A marked change point may therefore not sit on an obvious step in the raw
    # line — that gap is the regional signal detrending removed.
    if source_column != "backscatter_db":
        display = pd.Series(df["backscatter_db"].values).rolling(
            window=7, center=True, min_periods=1
        ).median().values
        smoothed_df["smoothed_db"] = display
        smoothed_df["smoothed_relative_db"] = smoothed
    else:
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
    # Now reachable: a detection below this is reported as no change rather than
    # being surfaced with a reassuring-looking number attached. Sits just under
    # the logistic midpoint, which is a judgement call rather than a bright line;
    # measured as neither adding nor removing matches on the audited set.
    MIN_CONFIDENCE = 0.45

    # Noise is the variation left *within* each segment once the step is taken
    # out. Dividing by the whole-series std, as this used to, is self-defeating:
    # a large step inflates that std and so suppresses its own score.
    before_segment = smoothed[:best_bp]
    after_segment = smoothed[best_bp:]
    residuals = np.concatenate([
        before_segment - before_segment.mean(),
        after_segment - after_segment.mean(),
    ])
    snr = best_shift / (residuals.std() + 1e-9)
    
    # Logistic on the signal-to-noise ratio, centred at CONFIDENCE_MIDPOINT_SNR.
    # The previous mapping was `0.65 + snr * 0.15`, which put a 65% floor under
    # every detection — weak evidence was indistinguishable from strong, and the
    # MIN_CONFIDENCE check below could never fire. This starts near zero, so a
    # shift that barely clears the noise now reports as barely credible.
    confidence = float(
        np.clip(1.0 / (1.0 + np.exp(-(snr - CONFIDENCE_MIDPOINT_SNR))), 0.0, 0.99)
    )

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

# A site reading this far above the land around it is carrying something hard —
# concrete, rock armour, a wall. Bare ground and water sit at or below zero.
PRIOR_STRUCTURE_MIN_DB = 2.0

# How much the level must climb across the NTP to count as work done under this
# contract. Below this the site ends the contract looking as it began.
CONTRACT_ERA_RISE_DB = 0.5


def assess_prior_structure(df: pd.DataFrame, claimed_date: datetime) -> dict:
    """
    Decide whether a structure was already standing when the contract began.

    Change point detection cannot answer this. It reports when the signal moved,
    so a structure built before the analysis window opens produces no change to
    find and the site reads as flat — which is why such projects were coming
    back as DELAYED_START off some unrelated later shift.

    This reads the level instead. `relative_db` is the site minus the land
    around it, so it says how much harder the surface is than its own
    surroundings, independent of season or moisture.

    A structure already present shows two things together: the site sits well
    above its surroundings before the NTP, and it does not climb further during
    the contract. Both are needed. A legitimate project can also start from a
    high baseline — a riverbank already carries rock and revetment — and there
    the level keeps rising as work proceeds.

    Returns:
        {"exists_before_ntp": bool, "pre_ntp_db": float|None,
         "post_ntp_db": float|None, "rise_db": float|None}
    """
    unknown = {
        "exists_before_ntp": False,
        "pre_ntp_db": None,
        "post_ntp_db": None,
        "rise_db": None,
    }
    if "relative_db" not in df.columns or len(df) < 6:
        return unknown

    before = df[df["date"] < claimed_date]["relative_db"]
    after = df[df["date"] >= claimed_date]["relative_db"]
    # Need real coverage on both sides, or the comparison means nothing.
    if len(before) < 3 or len(after) < 3:
        return unknown

    # Medians, so a single flooded or windy pass cannot swing the answer.
    pre_db = float(before.median())
    post_db = float(after.median())
    rise_db = post_db - pre_db

    return {
        "exists_before_ntp": (
            pre_db >= PRIOR_STRUCTURE_MIN_DB and rise_db < CONTRACT_ERA_RISE_DB
        ),
        "pre_ntp_db": round(pre_db, 2),
        "post_ntp_db": round(post_db, 2),
        "rise_db": round(rise_db, 2),
    }
