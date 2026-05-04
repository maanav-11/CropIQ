import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error
import joblib

# Setup directories
data_dir = Path("../data") if Path("../data").exists() else Path("data")
clean_dir = data_dir / "clean"
model_dir = Path("../server/models") if Path("../server").exists() else Path("server/models")
model_dir.mkdir(parents=True, exist_ok=True)

def train_yield_model():
    print("Loading cleaned dataset...")
    # Load the cleaned merged dataset
    df = pd.read_csv(clean_dir / "merged_crop_weather.csv")
    
    # We will use the following features for our model:
    # Categorical: State_Name, Crop
    # Numerical: Crop_Year, ANNUAL (Rainfall)
    # Target: Yield
    
    # Filter out extreme outliers in Yield for better model accuracy
    upper_limit = df['Yield'].quantile(0.99)
    df = df[df['Yield'] <= upper_limit]

    X = df[['State_Name', 'Crop', 'Crop_Year', 'ANNUAL']]
    y = df['Yield']
    
    print(f"Dataset shape for training: {X.shape}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Create preprocessing steps
    # We one-hot encode State and Crop, and scale Year and Rainfall
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['State_Name', 'Crop']),
            ('num', StandardScaler(), ['Crop_Year', 'ANNUAL'])
        ]
    )
    
    # Create the Random Forest pipeline
    rf_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    ])
    
    print("Training Random Forest model (this may take a moment)...")
    rf_pipeline.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = rf_pipeline.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"R² Score: {r2:.4f}")
    print(f"Mean Absolute Error: {mae:.4f}")
    
    # Save the full pipeline (including the preprocessor) so the server 
    # can easily pass in raw strings and numbers from the API.
    model_path = model_dir / "rf_yield_model.pkl"
    joblib.dump(rf_pipeline, model_path)
    print(f"Model saved successfully to {model_path}")
    
    # Let's do a quick test prediction
    sample_data = pd.DataFrame([{
        'State_Name': 'MAHARASHTRA',
        'Crop': 'Wheat',
        'Crop_Year': 2026,
        'ANNUAL': 1200.5
    }])
    test_pred = rf_pipeline.predict(sample_data)
    print(f"Test Prediction (Maharashtra, Wheat, 2026, 1200.5mm Rain): {test_pred[0]:.2f} Yield")

if __name__ == "__main__":
    train_yield_model()
