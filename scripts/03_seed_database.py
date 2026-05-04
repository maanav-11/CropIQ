"""
03_seed_database.py  (v2)
Loads cleaned CSV data into the CropIQ PostgreSQL database.
Run from the project root:  python scripts/03_seed_database.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sqlalchemy import create_engine, text
import os

# ── Paths ─────────────────────────────────────────────────────────────────────
data_dir  = Path("data")
clean_dir = data_dir / "clean"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:Maanav%4011@localhost:3000/cropiq"
)
engine = create_engine(DATABASE_URL)

# Meteorological subdivision → State_Name (as used in crop_production)
SUBDIVISION_TO_STATE = {
    "ANDAMAN & NICOBAR ISLANDS":            "ANDAMAN AND NICOBAR ISLANDS",
    "ARUNACHAL PRADESH":                    "ARUNACHAL PRADESH",
    "ASSAM & MEGHALAYA":                    "ASSAM",
    "BIHAR":                                "BIHAR",
    "CHHATTISGARH":                         "CHHATTISGARH",
    "COASTAL ANDHRA PRADESH":               "ANDHRA PRADESH",
    "COASTAL KARNATAKA":                    "KARNATAKA",
    "EAST MADHYA PRADESH":                  "MADHYA PRADESH",
    "EAST RAJASTHAN":                       "RAJASTHAN",
    "EAST UTTAR PRADESH":                   "UTTAR PRADESH",
    "GANGETIC WEST BENGAL":                 "WEST BENGAL",
    "GUJARAT REGION":                       "GUJARAT",
    "HARYANA DELHI & CHANDIGARH":           "HARYANA",
    "HIMACHAL PRADESH":                     "HIMACHAL PRADESH",
    "JAMMU & KASHMIR":                      "JAMMU AND KASHMIR",
    "JHARKHAND":                            "JHARKHAND",
    "KERALA":                               "KERALA",
    "KONKAN & GOA":                         "GOA",
    "LAKSHADWEEP":                          "LAKSHADWEEP",
    "MADHYA MAHARASHTRA":                   "MAHARASHTRA",
    "MATATHWADA":                           "MAHARASHTRA",
    "NAGA MANI MIZO TRIPURA":               "NAGALAND",
    "NORTH INTERIOR KARNATAKA":             "KARNATAKA",
    "ORISSA":                               "ODISHA",
    "PUNJAB":                               "PUNJAB",
    "RAYALSEEMA":                           "ANDHRA PRADESH",
    "SAURASHTRA & KUTCH":                   "GUJARAT",
    "SOUTH INTERIOR KARNATAKA":             "KARNATAKA",
    "SUB HIMALAYAN WEST BENGAL & SIKKIM":   "WEST BENGAL",
    "TAMIL NADU":                           "TAMIL NADU",
    "TELANGANA":                            "TELANGANA",
    "UTTARAKHAND":                          "UTTARAKHAND",
    "VIDARBHA":                             "MAHARASHTRA",
    "WEST MADHYA PRADESH":                  "MADHYA PRADESH",
    "WEST RAJASTHAN":                       "RAJASTHAN",
    "WEST UTTAR PRADESH":                   "UTTAR PRADESH",
}

MONTH_COLS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","ANNUAL"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def fetchdf(sql, **kwargs):
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn, params=kwargs)

# ─────────────────────────────────────────────────────────────────────────────
def clear_tables():
    print("Clearing existing data ...")
    with engine.begin() as conn:
        for tbl in ["rainfall_data", "crop_production", "crops", "states"]:
            conn.execute(text(f"TRUNCATE TABLE {tbl} RESTART IDENTITY CASCADE"))

def seed_states_and_crops():
    print("Loading CSVs ...")
    crop_df = pd.read_csv(clean_dir / "clean_crop_production.csv")

    states = sorted(crop_df["State_Name"].dropna().unique())
    print(f"  {len(states)} states")
    for i, name in enumerate(states):
        code = f"{name[:3]}{i}"
        with engine.begin() as conn:
            conn.execute(text(
                "INSERT INTO states (name, state_code) VALUES (:n, :c) "
                "ON CONFLICT (name) DO NOTHING"
            ), {"n": name, "c": code})

    crops = sorted(crop_df["Crop"].dropna().unique())
    print(f"  {len(crops)} crops")
    for crop in crops:
        with engine.begin() as conn:
            conn.execute(text(
                "INSERT INTO crops (name, category) VALUES (:n, :c) "
                "ON CONFLICT (name) DO NOTHING"
            ), {"n": crop, "c": "other"})

    return crop_df


def seed_crop_production(crop_df):
    state_map = {r["name"]: r["id"] for r in fetchdf("SELECT id, name FROM states").to_dict("records")}
    crop_map  = {r["name"]: r["id"] for r in fetchdf("SELECT id, name FROM crops").to_dict("records")}

    state_crop = (
        crop_df.groupby(["State_Name", "Crop_Year", "Crop"])
        .agg(Area=("Area", "sum"), Production=("Production", "sum"))
        .reset_index()
    )
    state_crop = state_crop[state_crop["Area"] > 0].copy()
    state_crop["Yield"] = (state_crop["Production"] / state_crop["Area"]).round(2)

    print(f"Inserting {len(state_crop):,} crop-production rows ...")
    rows = []
    for _, r in state_crop.iterrows():
        sid = state_map.get(r["State_Name"])
        cid = crop_map.get(r["Crop"])
        if sid is None or cid is None:
            continue
        rows.append({
            "year":   int(r["Crop_Year"]),
            "sid":    sid,
            "cid":    cid,
            "area":   float(r["Area"]),
            "prod":   float(r["Production"]),
            "yld":    float(r["Yield"]),
        })

    BATCH = 500
    for start in range(0, len(rows), BATCH):
        batch = rows[start:start + BATCH]
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO crop_production
                    (year, state_id, district_id, crop_id, area_hectares, production_tonnes, yield_kg_per_ha)
                VALUES
                    (:year, :sid, NULL, :cid, :area, :prod, :yld)
                ON CONFLICT (year, state_id, district_id, crop_id) DO NOTHING
            """), batch)
    print(f"  Done: {len(rows):,} rows")


def seed_rainfall():
    state_map = {r["name"]: r["id"] for r in fetchdf("SELECT id, name FROM states").to_dict("records")}

    rain_df = pd.read_csv(data_dir / "rainfall in india 1901-2015.csv")
    rain_df.columns = [c.strip().upper() for c in rain_df.columns]
    rain_df["SUBDIVISION"] = rain_df["SUBDIVISION"].str.strip().str.upper()

    # Map subdivision to state
    rain_df["State_Name"] = rain_df["SUBDIVISION"].map(SUBDIVISION_TO_STATE)
    rain_df = rain_df.dropna(subset=["State_Name"])

    # Aggregate: mean rainfall per state per year
    agg_cols = {col: "mean" for col in MONTH_COLS if col in rain_df.columns}
    rain_agg = rain_df.groupby(["State_Name", "YEAR"]).agg(agg_cols).reset_index()

    print(f"Inserting {len(rain_agg):,} rainfall rows ...")
    rows = []
    for _, r in rain_agg.iterrows():
        sid = state_map.get(str(r["State_Name"]))
        if sid is None:
            continue

        def safe(col):
            v = r.get(col, None)
            if v is None or (isinstance(v, float) and np.isnan(v)):
                return None
            return round(float(v), 2)

        rows.append({
            "year": int(r["YEAR"]),
            "sid":  sid,
            "jan":  safe("JAN"), "feb": safe("FEB"), "mar": safe("MAR"),
            "apr":  safe("APR"), "may": safe("MAY"), "jun": safe("JUN"),
            "jul":  safe("JUL"), "aug": safe("AUG"), "sep": safe("SEP"),
            "oct":  safe("OCT"), "nov": safe("NOV"), "dec": safe("DEC"),
            "ann":  safe("ANNUAL"),
        })

    BATCH = 500
    for start in range(0, len(rows), BATCH):
        batch = rows[start:start + BATCH]
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO rainfall_data
                    (year, state_id, district_id,
                     jan_mm, feb_mm, mar_mm, apr_mm, may_mm, jun_mm,
                     jul_mm, aug_mm, sep_mm, oct_mm, nov_mm, dec_mm, annual_mm)
                VALUES
                    (:year, :sid, NULL,
                     :jan, :feb, :mar, :apr, :may, :jun,
                     :jul, :aug, :sep, :oct, :nov, :dec, :ann)
                ON CONFLICT (year, state_id, district_id) DO NOTHING
            """), batch)
    print(f"  Done: {len(rows):,} rows")


def verify():
    print("\nVerification:")
    for tbl in ("states", "crops", "crop_production", "rainfall_data"):
        cnt = fetchdf(f"SELECT COUNT(*) AS c FROM {tbl}").iloc[0]["c"]
        print(f"  {tbl:<25} {int(cnt):>8,} rows")

    # Check how many states have BOTH crop and rainfall data
    matched = fetchdf("""
        SELECT COUNT(DISTINCT s.name) AS c
        FROM crop_production cp
        JOIN states s ON cp.state_id = s.id
        WHERE s.id IN (SELECT state_id FROM rainfall_data)
    """).iloc[0]["c"]
    print(f"\n  States with crop+rainfall data: {int(matched)}")


if __name__ == "__main__":
    print("=== CropIQ Database Seeder v2 ===")
    clear_tables()
    crop_df = seed_states_and_crops()
    seed_crop_production(crop_df)
    seed_rainfall()
    verify()
    print("\nDone!")
