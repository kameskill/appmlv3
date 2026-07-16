# Timmy Tails AI/ML Service

This Flask service contains two business-specific machine-learning systems:

1. A dataset-trained grooming recommendation model.
2. A time-series sales forecasting model trained on Timmy Tails appointment history.

## Run

```bash
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Default address: `http://localhost:5001`

## Datasets

- `data/breed_grooming_dataset.csv`
- `data/haircut_catalog.csv`
- `data/recommendation_training.csv` — generated when the recommendation model starts
- `data/sample_sales_history.csv` — development demonstration only, not production training data

## Endpoints

- `GET /health`
- `GET /model-info`
- `GET /breeds`
- `GET /season`
- `GET|POST /recommend`
- `POST /forecast/sales`

See `../AI_ML_UPGRADE.md` for the full architecture and integration notes.
