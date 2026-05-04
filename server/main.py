from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
from pathlib import Path
import os
from sqlalchemy import create_engine, text

app = FastAPI(title="CropIQ API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data and model on startup
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "rf_yield_model.pkl"

# Global variables
model = None
engine = None

# Using environment variable for database URL, with a default fallback to localhost
# Update credentials as needed: postgresql://username:password@host:port/database
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:Maanav%4011@localhost:3000/cropiq")

@app.on_event("startup")
def load_assets():
    global model, engine
    try:
        engine = create_engine(DATABASE_URL)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Successfully connected to PostgreSQL database at {DATABASE_URL}")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("Please ensure PostgreSQL is running and the credentials are correct.")
        
    try:
        model = joblib.load(MODEL_PATH)
        print("Loaded Random Forest model.")
    except Exception as e:
        print(f"Error loading model: {e}")

class SimulationRequest(BaseModel):
    state: str
    crop: str
    year: int
    rainfall: float

@app.get("/api/options")
def get_options():
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        states_query = "SELECT name FROM states ORDER BY name"
        states = pd.read_sql(states_query, engine)['name'].tolist()
        return {"states": states}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crops")
def get_crops_for_state(state: str):
    """Return only the crops that have production data for the given state."""
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        query = text("""
            SELECT DISTINCT c.name
            FROM crops c
            JOIN crop_production cp ON cp.crop_id = c.id
            JOIN states s ON cp.state_id = s.id
            WHERE s.name = :state
            ORDER BY c.name
        """)
        crops = pd.read_sql(query, engine, params={"state": state})['name'].tolist()
        return {"crops": crops}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trends")
def get_trends(state: str, crop: str):
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        query = text("""
            SELECT cp.year AS "Crop_Year", cp.yield_kg_per_ha AS "Yield", rf.annual_mm AS "ANNUAL"
            FROM crop_production cp
            JOIN states s ON cp.state_id = s.id
            JOIN crops c ON cp.crop_id = c.id
            JOIN rainfall_data rf ON rf.state_id = s.id AND rf.year = cp.year
            WHERE s.name = :state AND c.name = :crop AND cp.district_id IS NULL AND rf.district_id IS NULL
            ORDER BY cp.year
        """)
        filtered = pd.read_sql(query, engine, params={"state": state, "crop": crop})
        
        if filtered.empty:
            raise HTTPException(status_code=404, detail="No data found for this state and crop")
            
        return {
            "trends": filtered.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/correlation")
def get_correlation(state: str, crop: str):
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    try:
        query = text("""
            SELECT rf.annual_mm AS x, cp.yield_kg_per_ha AS y
            FROM crop_production cp
            JOIN states s ON cp.state_id = s.id
            JOIN crops c ON cp.crop_id = c.id
            JOIN rainfall_data rf ON rf.state_id = s.id AND rf.year = cp.year
            WHERE s.name = :state AND c.name = :crop AND cp.district_id IS NULL AND rf.district_id IS NULL
        """)
        filtered = pd.read_sql(query, engine, params={"state": state, "crop": crop})
        if filtered.empty:
            raise HTTPException(status_code=404, detail="No data found")
            
        return {"data": filtered.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forecast")
def get_forecast(state: str, crop: str, year: int = None):
    if model is None or engine is None:
        raise HTTPException(status_code=500, detail="Model or Database not loaded")
        
    try:
        # Get last 5 years average rainfall for this state
        query = text("""
            SELECT rf.annual_mm, rf.year
            FROM rainfall_data rf
            JOIN states s ON rf.state_id = s.id
            WHERE s.name = :state AND rf.district_id IS NULL
            ORDER BY rf.year DESC LIMIT 5
        """)
        last_5_years = pd.read_sql(query, engine, params={"state": state})
        
        if last_5_years.empty:
             raise HTTPException(status_code=404, detail="No historical data to base forecast on")
             
        avg_rainfall = last_5_years['annual_mm'].mean()
        max_year = int(last_5_years['year'].max())
        start_year = year if year else max_year + 1
        
        forecasts = []
        for i in range(0, 3):
            future_year = start_year + i
            
            sample = pd.DataFrame([{
                'State_Name': state,
                'Crop': crop,
                'Crop_Year': future_year,
                'ANNUAL': avg_rainfall
            }])
            
            pred_yield = model.predict(sample)[0]
            forecasts.append({
                "year": future_year,
                "forecast_yield": float(pred_yield),
                "expected_rainfall": float(avg_rainfall)
            })
            
        return {
            "r2_score": 0.9474, # Hardcoded from our evaluation script
            "forecasts": forecasts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
def simulate_yield(req: SimulationRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
        
    sample = pd.DataFrame([{
        'State_Name': req.state,
        'Crop': req.crop,
        'Crop_Year': req.year,
        'ANNUAL': req.rainfall
    }])
    
    pred_yield = model.predict(sample)[0]
    
    return {
        "predicted_yield": float(pred_yield)
    }
