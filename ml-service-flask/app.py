"""Timmy Tails AI/ML microservice.

Features:
- Dataset-backed grooming recommendations
- Philippine rainy/dry season context
- Time-series sales forecasting trained from Timmy Tails appointment records
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from recommendation_engine import GroomingRecommendationEngine
from sales_forecasting import forecast_sales

load_dotenv()

app = Flask(__name__)

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://timmytails.vercel.app",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

CORS(app, origins=allowed_origins)

COUNTRY_WEATHER_PROFILES = {
    "philippines": {
        "dry": {
            "season_label": "Dry Season",
            "humidity": 0.63,
            "heat_index": 0.85,
            "rainfall": 0.25,
        },
        "rainy": {
            "season_label": "Rainy Season",
            "humidity": 0.82,
            "heat_index": 0.74,
            "rainfall": 0.83,
        },
    }
}

RECOMMENDATION_ENGINE: GroomingRecommendationEngine | None = None
MODEL_STARTUP_ERROR: str | None = None

try:
    RECOMMENDATION_ENGINE = GroomingRecommendationEngine()
except Exception as error:  # pragma: no cover - startup safeguard
    MODEL_STARTUP_ERROR = str(error)
    print(f"Recommendation model startup error: {error}")


def get_current_season() -> str:
    """PAGASA-aligned major seasons: rainy Jun-Nov, dry Dec-May."""
    month = datetime.now(ZoneInfo("Asia/Manila")).month
    return "rainy" if 6 <= month <= 11 else "dry"


def get_weather_context(country: str = "philippines", season: str | None = None) -> dict:
    normalized_country = str(country or "philippines").strip().lower()
    country_profile = COUNTRY_WEATHER_PROFILES.get(
        normalized_country,
        COUNTRY_WEATHER_PROFILES["philippines"],
    )
    selected_season = season if season in {"rainy", "dry"} else get_current_season()
    return country_profile[selected_season]


def parse_request_payload() -> dict:
    if request.method == "POST":
        return request.get_json(silent=True) or {}
    return request.args.to_dict()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "message": "Timmy Tails AI/ML service is running",
        "recommendation_model_ready": RECOMMENDATION_ENGINE is not None,
        "model_startup_error": MODEL_STARTUP_ERROR,
        "current_season": get_current_season(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/recommend", methods=["GET", "POST"])
def recommend():
    if RECOMMENDATION_ENGINE is None:
        return jsonify({
            "success": False,
            "message": "Recommendation model is unavailable",
            "detail": MODEL_STARTUP_ERROR,
        }), 503

    data = parse_request_payload()
    breed = str(data.get("breed", "Other")).strip() or "Other"
    requested_season = str(data.get("season", get_current_season())).strip().lower()
    season = requested_season if requested_season in {"rainy", "dry"} else get_current_season()
    country = str(data.get("country", "philippines")).strip().lower() or "philippines"

    try:
        top_n = max(1, min(int(data.get("top_n", 3)), 10))
    except (TypeError, ValueError):
        top_n = 3

    history = data.get("history") if isinstance(data, dict) else None
    result = RECOMMENDATION_ENGINE.recommend(
        breed=breed,
        season=season,
        top_n=top_n,
        history=history if isinstance(history, dict) else None,
    )
    weather_context = get_weather_context(country, season)

    return jsonify({
        "success": True,
        "breed": result["breed"],
        "breed_profile": result["breed_profile"],
        "country": country.title(),
        "season": weather_context["season_label"],
        "season_key": season,
        "current_season": get_current_season(),
        "weather_context": weather_context,
        "recommendations": result["recommendations"],
        "model_info": {
            "name": "Timmy Tails Grooming Compatibility Model v3",
            "engine": "scikit-learn",
            "uses_live_booking_popularity": bool(history),
        },
    })


@app.route("/forecast/sales", methods=["POST"])
def sales_forecast():
    data = request.get_json(silent=True) or {}
    appointments = data.get("appointments", [])

    if not isinstance(appointments, list):
        return jsonify({
            "success": False,
            "message": "appointments must be an array",
        }), 400

    try:
        forecast = forecast_sales(
            appointments_payload=appointments,
            today_value=data.get("today"),
        )
    except Exception as error:
        app.logger.exception("Sales forecast failed")
        return jsonify({
            "success": False,
            "message": "Sales forecasting failed",
            "detail": str(error),
        }), 500

    return jsonify({
        "success": True,
        "forecast": forecast,
        "dataset": {
            "name": "Timmy Tails appointment history",
            "records": len(appointments),
            "production_data_only": True,
        },
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    recommendation_info = None
    if RECOMMENDATION_ENGINE is not None:
        info = RECOMMENDATION_ENGINE.model_info()
        recommendation_info = {
            "name": info.name,
            "algorithm": info.algorithm,
            "training_rows": info.training_rows,
            "breed_rows": info.breed_rows,
            "haircut_rows": info.haircut_rows,
            "features": info.features,
            "datasets": info.datasets,
        }

    return jsonify({
        "success": True,
        "recommendation": recommendation_info,
        "sales_forecast": {
            "name": "Timmy Tails Sales Forecasting Model v1",
            "algorithms_compared": [
                "Ridge Regression",
                "Random Forest Regressor",
                "Gradient Boosting Regressor when enough data is available",
            ],
            "validation": "TimeSeriesSplit; the lowest-MAE candidate is selected",
            "features": [
                "calendar and Philippine season",
                "booking counts and pipeline value",
                "service mix",
                "revenue lags and rolling averages",
            ],
            "minimum_data": "45 calendar days and 10 revenue-producing days",
            "fallback": "Transparent statistical forecast when ML training data is insufficient",
        },
        "sources": [
            {
                "name": "PAGASA climate seasons",
                "purpose": "Philippine rainy/dry season mapping",
            },
            {
                "name": "AKC breed profiles and grooming references",
                "purpose": "Curated breed coat and grooming traits",
            },
            {
                "name": "Timmy Tails service catalog",
                "purpose": "Prices, haircut compatibility, and maintenance requirements",
            },
            {
                "name": "Timmy Tails MongoDB appointments",
                "purpose": "Production sales training and live booking popularity",
            },
        ],
    })


@app.route("/breeds", methods=["GET"])
def list_breeds():
    if RECOMMENDATION_ENGINE is None:
        return jsonify({"success": False, "breeds": ["Other"]}), 503

    breeds = sorted(RECOMMENDATION_ENGINE.breeds["breed"].astype(str).tolist())
    return jsonify({"success": True, "breeds": breeds})


@app.route("/season", methods=["GET"])
def current_season():
    season_key = get_current_season()
    weather_context = get_weather_context("philippines", season_key)
    return jsonify({
        "success": True,
        "season": weather_context["season_label"],
        "season_key": season_key,
        "weather_context": weather_context,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"Timmy Tails AI/ML Service running on port {port}")
    print(f"Current Philippine season: {get_current_season()}")
    app.run(host="0.0.0.0", port=port, debug=debug)
