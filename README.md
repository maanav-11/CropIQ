# 🌱 CropIQ

AI-powered crop yield prediction using rainfall, soil, and regional data.

## 🚀 Overview
CropIQ is a full-stack web application designed to forecast crop yields based on historical data and rainfall patterns. It features an AI-powered pipeline (Random Forest) for accurate predictions and a premium, responsive React dashboard to display trends, forecasts, and interactive simulations.

## 🛠️ Technology Stack
### Frontend
- **React 19** & **Vite**
- **Tailwind CSS v4** for styling, fully supporting Dark/Light mode
- **Recharts** for data visualization
- **Lucide React** for beautiful icons

### Backend
- **FastAPI** (Python)
- **PostgreSQL** for database management
- **SQLAlchemy** for ORM layer
- **Pandas** & **Scikit-Learn (Joblib)** for the Machine Learning pipeline

## 📂 Project Structure
- `/client` - Frontend React application.
- `/server` - FastAPI backend application and ML models.
- `/scripts` - Database schema and setup SQL scripts.
- `/data` - Datasets used for training the machine learning model.

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [PostgreSQL](https://www.postgresql.org/)

### 1. Database Setup
1. Create a PostgreSQL database (e.g., `cropiq`).
2. Run the SQL schema script to create the necessary tables. Using `psql` or your preferred database client:
   ```bash
   psql -U your_username -d cropiq -f scripts/Schema.sql
   ```
3. *(Optional)* Load your historical crop and rainfall data into the tables.

### 2. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   
   # On Windows
   .venv\Scripts\activate
   
   # On macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn pandas joblib sqlalchemy psycopg2-binary pydantic
   ```
4. Set the `DATABASE_URL` environment variable if your database credentials differ from the default (`postgresql://postgres:postgres@localhost:5432/cropiq`):
   ```powershell
   # On Windows (PowerShell)
   $env:DATABASE_URL="postgresql://username:password@localhost:5432/cropiq"
   ```
   ```bash
   # On macOS/Linux
   export DATABASE_URL="postgresql://username:password@localhost:5432/cropiq"
   ```
5. Run the FastAPI server:
   ```bash
   fastapi dev main.py
   # Or alternatively: uvicorn main:app --reload
   ```
   The backend will start and typically run on `http://127.0.0.1:8000`.

### 3. Frontend Setup
1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## 🌟 Features
- **Interactive Dashboard:** View historical trends and correlations between rainfall and crop yield.
- **AI Forecasting:** Predict future crop yields using a pre-trained Random Forest model.
- **Real-time Simulations:** Test different rainfall scenarios to see how they affect yields.
- **Dark/Light Mode:** Full theme support across the entire application for the best user experience.

## 📝 License
This project is licensed under the MIT License. See the `LICENSE` file for details.
