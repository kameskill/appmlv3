# Timmy Tails AI/ML Upgrade

## What changed

### 1. Dataset-trained grooming recommendations

The grooming service is now a real scikit-learn model rather than only a fixed score formula.

- Algorithm: `RandomForestRegressor`
- Training rows: generated breed × haircut × Philippine season combinations
- Inputs:
  - breed coat type and length
  - size and shedding level
  - grooming frequency and matting risk
  - heat and moisture sensitivity
  - double-coat and clipping-risk flags
  - haircut compatibility, maintenance level, price, and seasonal fit
  - rainy or dry Philippine season
- Live learning signal: completed and confirmed Timmy Tails haircut bookings are sent to the model as popularity evidence.
- Safety: clipping-heavy styles are penalized for double-coated breeds, and a warning is returned when a style normally needs groomer approval.

The production recommendation model uses:

- `ml-service-flask/data/breed_grooming_dataset.csv`
- `ml-service-flask/data/haircut_catalog.csv`
- `ml-service-flask/data/recommendation_training.csv`
- live confirmed/completed appointment popularity from MongoDB

### 2. Machine-learning sales prediction

The admin analytics route now sends real appointment history to the Python ML service.

The service converts appointment records into a daily business dataset and creates:

- calendar features
- Philippine rainy/dry season
- booked, confirmed, pending, and cancelled counts
- pipeline and committed values
- average ticket value
- service-mix counts
- 1, 7, 14, and 28-day revenue lags
- 7, 14, and 28-day rolling averages
- same-weekday history

Models compared:

- Ridge Regression
- Random Forest Regressor
- Gradient Boosting Regressor when enough data exists

`TimeSeriesSplit` is used so the model trains on earlier dates and validates on later dates. The candidate with the lowest mean absolute error is selected.

The response includes:

- forecast and likely range
- confidence and backtest accuracy
- MAE and sMAPE
- selected model
- training period and row counts
- feature importance
- confirmed and expected pending revenue
- daily forecast details

### 3. Honest fallback for limited data

The system does not claim that a model is reliable when the business has insufficient history.

ML training requires at least:

- 45 calendar days
- 10 revenue-producing days

Before that threshold, the ML service returns a clearly labeled statistical fallback using historical revenue, current run rate, and the next-month booking pipeline. It automatically switches to the trained model after enough real data is collected.

### 4. Admin dashboard improvements

The **ML Trends** tab now displays:

- whether ML or fallback mode is active
- model name and engine
- training appointment count
- daily training-row count
- training period
- MAE, sMAPE, and backtest accuracy
- feature-importance bars
- datasets used
- the reason ML is not active yet when data is insufficient
- a revised explanation of how the forecast is produced

### 5. Booking and user-dashboard integration

Recommendations now flow through the Express backend first. The backend adds real Timmy Tails booking-popularity data before calling the ML service.

If the backend recommendation proxy is unavailable, the frontend safely falls back to the direct ML endpoint.

The breed list is now loaded from the dataset through `/breeds`, with the original list kept as a frontend fallback.

## Business datasets

### Breed grooming dataset

The breed traits are a curated, structured dataset based on recognized breed coat/grooming information and Timmy Tails local-market profiles. It includes common breeds and local categories such as Aspin and Mixed Breed.

Reference sources used when structuring the fields:

- American Kennel Club breed profiles and grooming references: https://www.akc.org/dog-breeds/
- AKC double-coat grooming guidance: https://www.akc.org/expert-advice/health/how-to-groom-a-double-coated-dog/
- PAGASA Philippine climate seasons: https://www.pagasa.dost.gov.ph/information/climate-philippines

### Timmy Tails internal appointment dataset

Sales forecasting and popularity adjustment use the application's own MongoDB appointment records. This is the most relevant dataset for the actual business because it reflects Timmy Tails prices, services, customers, cancellations, and booking patterns.

### Demonstration dataset

`sample_sales_history.csv` is included only for development demonstrations. Production forecasting does not use it by default and does not mix sample records with real business predictions.

## New ML endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/recommend` | Dataset-trained grooming recommendations |
| POST | `/forecast/sales` | Train/evaluate a sales model and forecast next month |
| GET | `/model-info` | Model, feature, and dataset metadata |
| GET | `/breeds` | Breed names from the dataset |
| GET | `/season` | Current Philippine season |
| GET | `/health` | ML-service readiness |

## Important files

- `ml-service-flask/recommendation_engine.py`
- `ml-service-flask/sales_forecasting.py`
- `ml-service-flask/app.py`
- `backend-express/routes/admin.js`
- `backend-express/routes/appointments.js`
- `appml/src/pages/Admin.jsx`
- `appml/src/pages/Booking.jsx`
- `appml/src/pages/UserDashboard.jsx`
- `appml/src/utils/api.js`

## Deployment notes

The Express backend must have:

```env
ML_SERVICE_URL=https://your-ml-service.example.com
```

The ML service should have:

```env
FRONTEND_URL=https://your-frontend.example.com
PORT=5001
FLASK_DEBUG=0
```

Node.js 18 or newer is required because the backend uses the built-in `fetch` API to call the Python ML service.
