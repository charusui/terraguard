"""
verified_cases.py
-----------------
Ground truth for checking the engine against findings auditors actually
published. Run directly:

    python backend/tests/verified_cases.py

Coordinates, contract IDs and start dates come from the DPWH transparency
dataset (bettergovph/dpwh-transparency-data). Findings come from COA fraud-audit
reporting, matched to a contract by contractor, barangay, structure type and
cost. Each case carries a `tier` saying how strong its ground truth is:

  A  COA published a finding for this specific project and the contract match
     is unambiguous. The exact verdict is testable.
  B  COA flagged the project but reporting gave only a batch-level finding
     ("ghost projects, relocations, pre-existing structures"). Only the weaker
     claim is testable: the engine should call it anomalous, not on schedule.
  C  Completed work by a contractor absent from every COA flagged list, in the
     same districts and period. Presumptive control. Absence of a finding is
     not proof of legitimacy since COA audited a subset, so a miss here is
     softer evidence than a miss in tier A.

Controls exist so false positives are measurable. A set made only of fraudulent
projects would reward a tool that flags everything.

Caveats: COA findings are audit findings, not court judgments. Reporting has
said DPWH-published coordinates were manipulated for some projects, so a point
may not sit on the structure it names.
"""

# Verdicts that mean "something is off here".
ANOMALOUS = {"PRE_EXISTING", "NO_CHANGE_DETECTED", "DELAYED_START"}

# Verdicts that decline to judge. Not counted as wrong — the engine saying
# "I cannot read this site" is the correct output when the input is unusable.
DECLINED = {"LOCATION_MISMATCH", "INSUFFICIENT_DATA"}

PHILSTAR_SEP26 = (
    "https://www.philstar.com/nation/2025/09/26/2475562/"
    "irregularities-detailed-audit-reports-bulacan-flood-control-projects"
)
BMIRROR_P297 = (
    "https://businessmirror.com.ph/2025/11/29/"
    "coa-files-4-fraud-audit-reports-worth-over-p297-million-for-bulacan-flood-control-projects/"
)
GMA_P309 = (
    "https://www.gmanetwork.com/news/topstories/nation/963660/"
    "coa-finds-p309m-worth-of-ghost-flood-control-projects-in-bulacan/story/"
)
GMA_P325 = (
    "https://www.gmanetwork.com/news/topstories/nation/973514/"
    "coa-finds-fraud-in-over-p325-m-flood-control-projects-in-bulacan/story/"
)
INQ_SIPAT = (
    "https://newsinfo.inquirer.net/2111439/"
    "coa-fraud-audit-tags-4-more-flood-infra-projects-in-bulacan"
)
DPWH_DATASET = "https://huggingface.co/datasets/bettergovph/dpwh-transparency-data"

CASES = [
    # ------------------------------------------------------------------ tier A
    {
        "name": "Bambang, Bocaue (slope protection)", "contract_id": "24CC0149",
        "lat": 14.76360, "lon": 120.92071, "claimed_ntp_date": "2024-04-23",
        "expected": "PRE_EXISTING", "tier": "A",
        "finding": "Satellite imagery from 29 Feb 2024, two months before the 23 Apr NTP, already showed a structure at the approved site.",
        "source": PHILSTAR_SEP26,
    },
    {
        "name": "Turo (Sitio Hangga), Bocaue", "contract_id": "24CC0401",
        "lat": 14.81336, "lon": 120.94254, "claimed_ntp_date": "2024-04-23",
        "expected": "PRE_EXISTING", "tier": "A",
        "finding": "Approved location already had an existing structure; what was built deviated from the plans.",
        "source": PHILSTAR_SEP26,
    },
    {
        "name": "Malis Section, Guiguinto River", "contract_id": "24CC0142",
        "lat": 14.83255, "lon": 120.87768, "claimed_ntp_date": "2024-03-20",
        "expected": "PRE_EXISTING", "tier": "A",
        "finding": "A flood control structure already existed at the approved site years before contract effectivity.",
        "source": BMIRROR_P297,
    },
    {
        "name": "Lumang Bayan Section, Angat River", "contract_id": "24CC0468",
        "lat": 14.89894, "lon": 120.85426, "claimed_ntp_date": "2024-05-28",
        "expected": "PRE_EXISTING", "tier": "A",
        "finding": "Existing structures at the site at least 90 days before contract effectivity, per satellite imagery and inspection.",
        "source": GMA_P309,
    },
    {
        "name": "Sipat Section, Plaridel (Angat River)", "contract_id": "24CC0144",
        "lat": 14.90360, "lon": 120.82639, "claimed_ntp_date": "2024-03-20",
        "expected": "NO_CHANGE_DETECTED", "tier": "A",
        "finding": "Reported complete on 11 Jun 2024; satellite imagery showed no structure as of 7 Apr 2025.",
        "source": INQ_SIPAT,
    },
    {
        "name": "Santa Monica (Purok 6 to 7)", "contract_id": "24CC0195",
        "lat": 14.83836, "lon": 120.73759, "claimed_ntp_date": "2024-04-18",
        "expected": "NO_CHANGE_DETECTED", "tier": "A",
        "finding": "No structure at the designated site despite being declared 100% complete on 11 Jun 2024 and fully paid.",
        "source": GMA_P309,
    },
    {
        "name": "San Nicolas, Hagonoy", "contract_id": "23CC0109",
        "lat": 14.82593, "lon": 120.72726, "claimed_ntp_date": "2023-02-13",
        "expected": "NO_CHANGE_DETECTED", "tier": "A",
        "finding": "No flood control structure at the approved site despite documents claiming 100% completion. Wawao Builders, P77.2M.",
        "source": BMIRROR_P297,
    },
    {
        "name": "Virgen Delos Flores, Baliuag", "contract_id": "22CC0316",
        "lat": 14.94158, "lon": 120.89645, "claimed_ntp_date": "2022-04-05",
        "expected": "NO_CHANGE_DETECTED", "tier": "A",
        "finding": "No flood control structure at the approved site despite reported completion. Wawao and SYMS joint venture.",
        "source": BMIRROR_P297,
    },
    {
        "name": "Slope Protection Works, Pampanga", "contract_id": None,
        "lat": 15.2215, "lon": 120.5755, "claimed_ntp_date": "2016-06-01",
        "expected": "PRE_EXISTING", "tier": "A",
        "finding": "A wall already being built by DPWH was awarded again by the local government; P92.5M ordered returned.",
        "source": "https://www.philstar.com/nation/2019/01/17/1885650/return-p925-million-ex-pampanga-mayor-told",
    },
    {
        "name": "Betis River Flood Protection, Pampanga", "contract_id": "22CH0082",
        # Was 14.9818/120.6433, an approximate point 780 m from the contract
        # location. These are 22CH0082's own published coordinates.
        "lat": 14.9748306, "lon": 120.6427306, "claimed_ntp_date": "2022-06-01",
        "expected": "CONSISTENT", "tier": "A",
        "finding": "Legitimate project, construction photo-documented on site.",
        "source": "https://commons.wikimedia.org/wiki/File:Flood_protection_in_Betis_River_(Pampanga;_2023-08-22)_E911a_08.jpg",
    },

    # ------------------------------------------------------------------ tier B
    {
        "name": "Santa Cruz, Guiguinto", "contract_id": "24CC0052",
        "lat": 14.84514, "lon": 120.87529, "claimed_ntp_date": "2024-02-07",
        "expected": "ANOMALOUS", "tier": "B",
        "finding": "In the P325M batch COA flagged for ghost projects, relocations and pre-existing structures. Wawao Builders.",
        "source": GMA_P325,
    },
    {
        "name": "Perez, Bulakan (Maycapiz-Taliptip)", "contract_id": "24CC0604",
        "lat": 14.76579, "lon": 120.89223, "claimed_ntp_date": "2024-12-18",
        "expected": "ANOMALOUS", "tier": "B",
        "finding": "Named in a COA flagged batch. SYMS Construction Trading, P92.59M.",
        "source": GMA_P309,
    },
    {
        "name": "Piel, Baliuag (riverwall)", "contract_id": "23CC0130",
        "lat": 14.98031, "lon": 120.87733, "claimed_ntp_date": "2023-02-13",
        "expected": "ANOMALOUS", "tier": "B",
        "finding": "Named in a COA flagged batch. L.R. Tiqui Builders and M3 Konstract, P96.5M.",
        "source": GMA_P309,
    },
    {
        "name": "San Juan, Balagtas (Balagtas River)", "contract_id": "25CC0241",
        "lat": 14.80995, "lon": 120.89751, "claimed_ntp_date": "2025-02-25",
        "expected": "ANOMALOUS", "tier": "B",
        "finding": "Named in a COA flagged batch. SYMS Construction Trading, P46.3M.",
        "source": GMA_P309,
    },

    # ------------------------------------------------------------------ tier C
    {
        "name": "CONTROL Bocaue River (Bunlo-Lolomboy)", "contract_id": "20CC0199",
        "lat": 14.77717, "lon": 120.93303, "claimed_ntp_date": "2020-11-23",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. A.R.L. Construction, absent from every COA flagged list.",
        "source": DPWH_DATASET,
    },
    {
        "name": "CONTROL San Jose River, San Jose del Monte", "contract_id": "21CD0070",
        "lat": 14.78509, "lon": 121.04469, "claimed_ntp_date": "2021-03-15",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. Royal Crown Monarch Construction, not flagged.",
        "source": DPWH_DATASET,
    },
    {
        "name": "CONTROL Sto. Cristo, San Jose del Monte", "contract_id": "21CD0074",
        "lat": 14.81768, "lon": 121.04413, "claimed_ntp_date": "2021-03-14",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. Triple 8 Construction and Supply, not flagged.",
        "source": DPWH_DATASET,
    },
    {
        "name": "CONTROL Marilao River (Poblacion)", "contract_id": "21CD0127",
        "lat": 14.75409, "lon": 120.94157, "claimed_ntp_date": "2021-03-31",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. Triple 8 Construction and Supply, not flagged.",
        "source": DPWH_DATASET,
    },
    {
        "name": "CONTROL Marilao River (tributaries)", "contract_id": "21CD0128",
        "lat": 14.75250, "lon": 120.94335, "claimed_ntp_date": "2021-03-31",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. Alpha and Omega Gen. Contractor, not flagged.",
        "source": DPWH_DATASET,
    },
    {
        "name": "CONTROL Marilao River (Constantino)", "contract_id": "21CD0126",
        "lat": 14.75735, "lon": 120.93347, "claimed_ntp_date": "2021-03-31",
        "expected": "CONSISTENT", "tier": "C",
        "finding": "Completed. St. Timothy Construction, not flagged.",
        "source": DPWH_DATASET,
    },
]


def score(case: dict, verdict: str) -> bool:
    """Tier B only asserts "not on schedule"; every other tier asserts a verdict."""
    if case["expected"] == "ANOMALOUS":
        return verdict in ANOMALOUS
    return verdict == case["expected"]


def main() -> None:
    import os
    import sys
    from collections import Counter

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from analyze import analyze

    matched: Counter = Counter()
    total: Counter = Counter()
    rows = []

    for case in CASES:
        # Every case here is a flood control project, so the description the
        # site check reads must say so — it keys off the contract wording.
        description = f"flood control structure {case['name']}"
        result = analyze(case["lat"], case["lon"], case["claimed_ntp_date"], description)
        verdict = result["verdict"]
        declined = verdict in DECLINED
        is_match = (not declined) and score(case, verdict)
        total[case["tier"]] += 1
        matched[case["tier"]] += is_match
        rows.append((case, verdict, is_match, declined))

        mark = "DECLINED" if declined else ("MATCH" if is_match else "MISS")
        distance = (result.get("site_check") or {}).get("water_distance_m")
        water = f"{distance:>6.0f}m" if distance is not None else "     -"
        print(f"[{case['tier']}] {case['name'][:38]:<39} "
              f"exp={case['expected']:<19} got={verdict:<19} "
              f"water={water}  {mark}")

    committed = [r for r in rows if not r[3]]
    correct = sum(1 for r in committed if r[2])

    print()
    for tier in ("A", "B", "C"):
        if total[tier]:
            print(f"  tier {tier}: {matched[tier]}/{total[tier]}")
    print(f"  overall: {sum(matched.values())}/{len(CASES)}")
    print()
    print(f"  declined to judge : {len(rows) - len(committed)}/{len(rows)}")
    if committed:
        pct = 100.0 * correct / len(committed)
        print(f"  correct when it committed: {correct}/{len(committed)} ({pct:.0f}%)")

    # A control the engine actively accused. Declining is not an accusation.
    false_positives = [c["name"] for c, _, ok, dec in rows
                       if c["tier"] == "C" and not ok and not dec]
    print(f"  false accusations on controls: {len(false_positives)}/{total['C']}")
    for name in false_positives:
        print(f"    - {name}")


if __name__ == "__main__":
    main()
