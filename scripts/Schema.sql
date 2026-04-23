-- =============================================
-- CropIQ Database Schema
-- Run this entire file in your Postgres client
-- =============================================

-- Core lookup tables
CREATE TABLE states (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  state_code  VARCHAR(10)  NOT NULL UNIQUE  -- e.g. 'MH', 'UP', 'PB'
);

CREATE TABLE districts (
  id            SERIAL PRIMARY KEY,
        state_id      INT NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  district_code VARCHAR(10),
  UNIQUE(state_id, name)
);

CREATE TABLE crops (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50)  NOT NULL  -- 'cereal', 'pulse', 'oilseed', 'vegetable', 'fruit'
);

-- Main fact tables
CREATE TABLE crop_production (
  id                  SERIAL PRIMARY KEY,
  year                INT  NOT NULL,       -- crop year e.g. 2022
  state_id            INT  NOT NULL REFERENCES states(id),
  district_id         INT  REFERENCES districts(id),  -- nullable: some data is state-level only
  crop_id             INT  NOT NULL REFERENCES crops(id),
  area_hectares       NUMERIC(12, 2),
  production_tonnes   NUMERIC(12, 2),
  yield_kg_per_ha     NUMERIC(10, 2),      -- computed: (production*1000) / area
  UNIQUE(year, state_id, district_id, crop_id)
);

CREATE TABLE rainfall_data (
  id           SERIAL PRIMARY KEY,
  year         INT NOT NULL,
  state_id     INT NOT NULL REFERENCES states(id),
  district_id  INT REFERENCES districts(id),
  jan_mm       NUMERIC(8, 2),
  feb_mm       NUMERIC(8, 2),
  mar_mm       NUMERIC(8, 2),
  apr_mm       NUMERIC(8, 2),
  may_mm       NUMERIC(8, 2),
  jun_mm       NUMERIC(8, 2),
  jul_mm       NUMERIC(8, 2),
  aug_mm       NUMERIC(8, 2),
  sep_mm       NUMERIC(8, 2),
  oct_mm       NUMERIC(8, 2),
  nov_mm       NUMERIC(8, 2),
  dec_mm       NUMERIC(8, 2),
  annual_mm    NUMERIC(10, 2),             -- sum of all months
  UNIQUE(year, state_id, district_id)
);

CREATE TABLE msp_prices (
  id              SERIAL PRIMARY KEY,
  year            INT NOT NULL,
  crop_id         INT NOT NULL REFERENCES crops(id),
  msp_per_quintal NUMERIC(10, 2) NOT NULL,  -- Minimum Support Price in INR
  UNIQUE(year, crop_id)
);

CREATE TABLE yield_predictions (
  id              SERIAL PRIMARY KEY,
  state_id        INT NOT NULL REFERENCES states(id),
  crop_id         INT NOT NULL REFERENCES crops(id),
  predicted_year  INT NOT NULL,
  predicted_yield NUMERIC(10, 2),  -- kg/hectare
  lower_bound     NUMERIC(10, 2),  -- 90% confidence interval
  upper_bound     NUMERIC(10, 2),
  model_r2        NUMERIC(5, 4),   -- R² score of the regression
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state_id, crop_id, predicted_year)
);

-- =============================================
-- Indexes — critical for dashboard query speed
-- =============================================
CREATE INDEX idx_cp_year        ON crop_production(year);
CREATE INDEX idx_cp_state       ON crop_production(state_id);
CREATE INDEX idx_cp_crop        ON crop_production(crop_id);
CREATE INDEX idx_cp_state_crop  ON crop_production(state_id, crop_id);
CREATE INDEX idx_rf_state_year  ON rainfall_data(state_id, year);
CREATE INDEX idx_msp_crop_year  ON msp_prices(crop_id, year);