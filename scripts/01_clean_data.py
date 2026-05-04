import pandas as pd
import numpy as np
from pathlib import Path

# Setup directories
data_dir = Path("../data") if Path("../data").exists() else Path("data")
clean_dir = data_dir / "clean"
clean_dir.mkdir(parents=True, exist_ok=True)

def clean_crop_production():
    print("Cleaning Crop Production Data...")
    df = pd.read_csv(data_dir / "crop_production.csv")
    
    # 1. Strip whitespaces from string columns
    str_cols = df.select_dtypes(include=['object', 'string']).columns
    for col in str_cols:
        df[col] = df[col].str.strip()
        
    # 2. Drop rows where Production is null (since we can't calculate yield)
    df = df.dropna(subset=['Production'])
    
    # 3. Calculate Yield (Production / Area)
    # Avoid division by zero
    df = df[df['Area'] > 0]
    df['Yield'] = df['Production'] / df['Area']
    
    # 4. Remove any duplicates
    df = df.drop_duplicates()
    
    # Normalize state names to match rainfall data
    df['State_Name'] = df['State_Name'].str.upper()
    
    return df

def clean_rainfall_data():
    print("Cleaning Rainfall Data...")
    df = pd.read_csv(data_dir / "rainfall in india 1901-2015.csv")
    
    # Strip whitespaces
    str_cols = df.select_dtypes(include=['object', 'string']).columns
    for col in str_cols:
        df[col] = df[col].str.strip()
        
    df = df.drop_duplicates()
    
    # Ensure YEAR is int
    df['YEAR'] = df['YEAR'].astype(int)
    
    # Filter for the last ~20 years based on crop data (1997-2015)
    df = df[(df['YEAR'] >= 1997) & (df['YEAR'] <= 2015)]
    
    # Normalize subdivision names to match crop states as closely as possible
    # Rainfall is by meteorological subdivision, we'll map to State_Name
    df['SUBDIVISION'] = df['SUBDIVISION'].str.upper()
    
    return df

def run_pipeline():
    crop_df = clean_crop_production()
    rain_df = clean_rainfall_data()
    
    # Save cleaned intermediate datasets
    crop_df.to_csv(clean_dir / "clean_crop_production.csv", index=False)
    rain_df.to_csv(clean_dir / "clean_rainfall.csv", index=False)
    
    # To join them, we need to map SUBDIVISION to State_Name roughly.
    # Since they aren't perfect 1:1 mappings, we'll do an aggregation at State level.
    # We will do a simple mapping or just use SUBDIVISION as State for now, 
    # and users can pick the matching string. 
    # Let's save a combined state-level dataset for the ML model and Charts.
    
    state_crop = crop_df.groupby(['State_Name', 'Crop_Year', 'Crop']).agg({
        'Area': 'sum',
        'Production': 'sum'
    }).reset_index()
    state_crop['Yield'] = state_crop['Production'] / state_crop['Area']
    
    # We rename SUBDIVISION to State_Name for joining
    rain_df = rain_df.rename(columns={'SUBDIVISION': 'State_Name', 'YEAR': 'Crop_Year'})
    
    # Merge
    merged_df = pd.merge(state_crop, rain_df[['State_Name', 'Crop_Year', 'ANNUAL', 'Jun-Sep']], 
                         on=['State_Name', 'Crop_Year'], how='inner')
    
    merged_df.to_csv(clean_dir / "merged_crop_weather.csv", index=False)
    print(f"Data pipeline complete. Files saved to {clean_dir}")
    
    # Print some stats
    print(f"Merged Dataset Shape: {merged_df.shape}")
    print(f"Total Unique Crops: {merged_df['Crop'].nunique()}")

if __name__ == "__main__":
    run_pipeline()