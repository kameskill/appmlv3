"""Machine-learning sales forecasting for Timmy Tails appointment data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


REVENUE_STATUSES = {"confirmed", "completed"}
ACTIVE_STATUSES = {"pending", "confirmed", "completed"}
SERVICE_COLUMNS = {
    "Full Grooming Package": "service_full_grooming",
    "Bath & Brush": "service_bath_brush",
    "Haircut Special": "service_haircut",
    "Quick Trim": "service_quick_trim",
    "Teeth Cleaning": "service_teeth",
    "De-shedding Treatment": "service_deshedding",
}

BASE_FEATURES = [
    "month",
    "day_of_month",
    "day_of_week",
    "week_of_year",
    "quarter",
    "is_weekend",
    "is_rainy_season",
    "booked_count",
    "committed_count",
    "pending_count",
    "cancelled_count",
    "booked_value",
    "committed_value",
    "pending_value",
    "average_ticket",
    *SERVICE_COLUMNS.values(),
]

LAG_FEATURES = [
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "rolling_7",
    "rolling_14",
    "rolling_28",
    "same_weekday_4w",
]

FEATURE_COLUMNS = BASE_FEATURES + LAG_FEATURES


@dataclass
class ModelResult:
    name: str
    estimator: Any
    mae: float
    smape: float


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not np.isfinite(number):
        return default
    return number


def _smape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denominator = np.abs(actual) + np.abs(predicted)
    ratio = np.zeros_like(denominator, dtype=float)
    np.divide(
        2.0 * np.abs(predicted - actual),
        denominator,
        out=ratio,
        where=denominator > 0,
    )
    return float(np.mean(ratio) * 100.0)


def _round_peso(value: float, nearest: int = 100) -> int:
    if not np.isfinite(value):
        return 0
    return max(0, int(round(value / nearest) * nearest))


def _season_key(timestamp: pd.Timestamp) -> int:
    return int(6 <= int(timestamp.month) <= 11)


def _normalize_appointments(appointments: list[dict[str, Any]]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []

    for appointment in appointments:
        appointment_date = pd.to_datetime(appointment.get("date"), errors="coerce")
        if pd.isna(appointment_date):
            continue

        status = str(appointment.get("status") or "pending").strip().lower()
        service = str(appointment.get("service") or "Unknown").strip()
        price = max(0.0, _safe_float(appointment.get("price")))

        rows.append({
            "date": appointment_date.normalize(),
            "status": status,
            "service": service,
            "price": price,
            "created_at": pd.to_datetime(appointment.get("createdAt"), errors="coerce"),
        })

    if not rows:
        return pd.DataFrame(columns=["date", "status", "service", "price", "created_at"])

    return pd.DataFrame(rows).sort_values("date").reset_index(drop=True)


def _daily_pipeline_frame(
    appointments: pd.DataFrame,
    index: pd.DatetimeIndex,
) -> pd.DataFrame:
    frame = pd.DataFrame(index=index)

    if appointments.empty:
        for column in [
            "booked_count",
            "committed_count",
            "pending_count",
            "cancelled_count",
            "booked_value",
            "committed_value",
            "pending_value",
            *SERVICE_COLUMNS.values(),
        ]:
            frame[column] = 0.0
        return frame

    working = appointments.copy()
    working["is_active"] = working["status"].isin(ACTIVE_STATUSES).astype(int)
    working["is_committed"] = working["status"].isin(REVENUE_STATUSES).astype(int)
    working["is_pending"] = (working["status"] == "pending").astype(int)
    working["is_cancelled"] = (working["status"] == "cancelled").astype(int)
    working["active_value"] = working["price"] * working["is_active"]
    working["committed_value"] = working["price"] * working["is_committed"]
    working["pending_value"] = working["price"] * working["is_pending"]

    aggregate = working.groupby("date").agg(
        booked_count=("is_active", "sum"),
        committed_count=("is_committed", "sum"),
        pending_count=("is_pending", "sum"),
        cancelled_count=("is_cancelled", "sum"),
        booked_value=("active_value", "sum"),
        committed_value=("committed_value", "sum"),
        pending_value=("pending_value", "sum"),
    )

    frame = frame.join(aggregate, how="left")

    for service, column in SERVICE_COLUMNS.items():
        counts = (
            working[(working["service"] == service) & working["status"].isin(ACTIVE_STATUSES)]
            .groupby("date")
            .size()
            .rename(column)
        )
        frame = frame.join(counts, how="left")

    frame = frame.fillna(0.0)
    return frame


def _calendar_features(index: pd.DatetimeIndex) -> pd.DataFrame:
    calendar = pd.DataFrame(index=index)
    calendar["month"] = index.month.astype(float)
    calendar["day_of_month"] = index.day.astype(float)
    calendar["day_of_week"] = index.dayofweek.astype(float)
    calendar["week_of_year"] = index.isocalendar().week.astype(float).to_numpy()
    calendar["quarter"] = index.quarter.astype(float)
    calendar["is_weekend"] = (index.dayofweek >= 5).astype(float)
    calendar["is_rainy_season"] = np.array([_season_key(item) for item in index], dtype=float)
    return calendar


def _lag_features(revenue: pd.Series) -> pd.DataFrame:
    lagged = pd.DataFrame(index=revenue.index)
    lagged["lag_1"] = revenue.shift(1)
    lagged["lag_7"] = revenue.shift(7)
    lagged["lag_14"] = revenue.shift(14)
    lagged["lag_28"] = revenue.shift(28)
    lagged["rolling_7"] = revenue.shift(1).rolling(7, min_periods=1).mean()
    lagged["rolling_14"] = revenue.shift(1).rolling(14, min_periods=1).mean()
    lagged["rolling_28"] = revenue.shift(1).rolling(28, min_periods=1).mean()
    lagged["same_weekday_4w"] = pd.concat(
        [revenue.shift(7), revenue.shift(14), revenue.shift(21), revenue.shift(28)],
        axis=1,
    ).mean(axis=1)
    return lagged.fillna(0.0)


def _build_training_frame(appointments: pd.DataFrame, today: pd.Timestamp) -> pd.DataFrame:
    if appointments.empty:
        return pd.DataFrame()

    earliest = appointments["date"].min()
    start = min(earliest, today - pd.Timedelta(days=60))
    index = pd.date_range(start=start, end=today, freq="D")

    pipeline = _daily_pipeline_frame(appointments, index)
    calendar = _calendar_features(index)

    committed = appointments[appointments["status"].isin(REVENUE_STATUSES)]
    revenue = committed.groupby("date")["price"].sum().reindex(index, fill_value=0.0)
    revenue.name = "revenue"

    frame = calendar.join(pipeline)
    frame["average_ticket"] = np.where(
        frame["booked_count"] > 0,
        frame["booked_value"] / frame["booked_count"],
        0.0,
    )
    frame = frame.join(_lag_features(revenue))
    frame["revenue"] = revenue
    frame = frame.replace([np.inf, -np.inf], 0.0).fillna(0.0)
    return frame


def _candidate_models(row_count: int) -> list[tuple[str, Any]]:
    models: list[tuple[str, Any]] = [
        (
            "Ridge Regression",
            Pipeline([
                ("scale", StandardScaler()),
                ("model", Ridge(alpha=12.0)),
            ]),
        ),
        (
            "Random Forest Regressor",
            RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_leaf=2,
                max_features=0.8,
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ]

    if row_count >= 90:
        models.append((
            "Gradient Boosting Regressor",
            GradientBoostingRegressor(
                n_estimators=140,
                learning_rate=0.04,
                max_depth=3,
                min_samples_leaf=4,
                loss="huber",
                random_state=42,
            ),
        ))

    return models


def _evaluate_models(X: pd.DataFrame, y: pd.Series) -> ModelResult:
    splitter = TimeSeriesSplit(n_splits=3)
    best: ModelResult | None = None

    for name, estimator in _candidate_models(len(X)):
        actual_parts: list[np.ndarray] = []
        predicted_parts: list[np.ndarray] = []

        for train_index, test_index in splitter.split(X):
            X_train = X.iloc[train_index]
            y_train = y.iloc[train_index]
            X_test = X.iloc[test_index]
            y_test = y.iloc[test_index]

            estimator.fit(X_train, y_train)
            predicted = np.clip(estimator.predict(X_test), 0.0, None)
            actual_parts.append(y_test.to_numpy(dtype=float))
            predicted_parts.append(np.asarray(predicted, dtype=float))

        actual = np.concatenate(actual_parts)
        predicted = np.concatenate(predicted_parts)
        result = ModelResult(
            name=name,
            estimator=estimator,
            mae=float(mean_absolute_error(actual, predicted)),
            smape=_smape(actual, predicted),
        )

        if best is None or result.mae < best.mae:
            best = result

    if best is None:
        raise RuntimeError("No forecasting model could be evaluated")

    best.estimator.fit(X, y)
    return best


def _historical_monthly_metrics(frame: pd.DataFrame, today: pd.Timestamp) -> dict[str, float]:
    monthly = frame["revenue"].resample("MS").sum()
    completed = monthly[monthly.index < today.replace(day=1)]
    positive = completed[completed > 0]
    recent = positive.tail(6)
    historical_baseline = float(recent.mean()) if not recent.empty else 0.0

    current_start = today.replace(day=1)
    current_revenue = float(frame.loc[current_start:today, "revenue"].sum())
    elapsed_days = max(1, int(today.day))
    month_end = current_start + pd.offsets.MonthEnd(0)
    current_run_rate = current_revenue / elapsed_days * int(month_end.day)

    return {
        "historical_baseline": historical_baseline,
        "current_revenue": current_revenue,
        "current_run_rate": current_run_rate,
        "history_months": float(len(positive)),
    }


def _confirmation_rate(appointments: pd.DataFrame) -> float:
    successful = int(appointments["status"].isin(REVENUE_STATUSES).sum())
    cancelled = int((appointments["status"] == "cancelled").sum())
    decided = successful + cancelled
    if decided == 0:
        return 0.60
    return float(np.clip(successful / decided, 0.25, 0.95))


def _future_pipeline(
    appointments: pd.DataFrame,
    start: pd.Timestamp,
    end: pd.Timestamp,
) -> pd.DataFrame:
    index = pd.date_range(start=start, end=end, freq="D")
    return _calendar_features(index).join(_daily_pipeline_frame(appointments, index))


def _build_recursive_row(
    base_row: pd.Series,
    predicted_history: pd.Series,
    current_date: pd.Timestamp,
) -> pd.DataFrame:
    history_before = predicted_history[predicted_history.index < current_date]

    def lag(days: int) -> float:
        target = current_date - pd.Timedelta(days=days)
        return float(predicted_history.get(target, 0.0))

    same_weekdays = [lag(7), lag(14), lag(21), lag(28)]
    row = base_row.to_dict()
    row["average_ticket"] = (
        float(row.get("booked_value", 0.0)) / float(row.get("booked_count", 1.0))
        if float(row.get("booked_count", 0.0)) > 0
        else 0.0
    )
    row.update({
        "lag_1": lag(1),
        "lag_7": lag(7),
        "lag_14": lag(14),
        "lag_28": lag(28),
        "rolling_7": float(history_before.tail(7).mean()) if not history_before.empty else 0.0,
        "rolling_14": float(history_before.tail(14).mean()) if not history_before.empty else 0.0,
        "rolling_28": float(history_before.tail(28).mean()) if not history_before.empty else 0.0,
        "same_weekday_4w": float(np.mean(same_weekdays)),
    })

    return pd.DataFrame([row], index=[current_date])[FEATURE_COLUMNS]


def _feature_importance(estimator: Any, X: pd.DataFrame, y: pd.Series) -> list[dict[str, Any]]:
    values: np.ndarray | None = None

    if hasattr(estimator, "feature_importances_"):
        values = np.asarray(estimator.feature_importances_, dtype=float)
    elif isinstance(estimator, Pipeline) and hasattr(estimator.named_steps.get("model"), "coef_"):
        values = np.abs(np.asarray(estimator.named_steps["model"].coef_, dtype=float))
    else:
        try:
            sample_size = min(30, len(X))
            result = permutation_importance(
                estimator,
                X.tail(sample_size),
                y.tail(sample_size),
                n_repeats=2,
                random_state=42,
                scoring="neg_mean_absolute_error",
            )
            values = np.maximum(result.importances_mean, 0.0)
        except Exception:
            values = None

    if values is None or len(values) != len(FEATURE_COLUMNS):
        return []

    total = float(values.sum())
    if total <= 0:
        return []

    ranked = sorted(
        zip(FEATURE_COLUMNS, values / total * 100.0),
        key=lambda item: item[1],
        reverse=True,
    )[:8]

    return [
        {"feature": feature.replace("_", " ").title(), "importance": round(float(score), 1)}
        for feature, score in ranked
    ]


def _fallback_forecast(
    frame: pd.DataFrame,
    appointments: pd.DataFrame,
    today: pd.Timestamp,
    reason: str,
) -> dict[str, Any]:
    next_start = today.replace(day=1) + pd.offsets.MonthBegin(1)
    next_end = next_start + pd.offsets.MonthEnd(0)
    metrics = _historical_monthly_metrics(frame, today) if not frame.empty else {
        "historical_baseline": 0.0,
        "current_revenue": 0.0,
        "current_run_rate": 0.0,
        "history_months": 0.0,
    }

    next_appointments = appointments[
        (appointments["date"] >= next_start) & (appointments["date"] <= next_end)
    ]
    confirmation = _confirmation_rate(appointments)
    committed = float(
        next_appointments[next_appointments["status"].isin(REVENUE_STATUSES)]["price"].sum()
    )
    pending = float(next_appointments[next_appointments["status"] == "pending"]["price"].sum())
    expected_pending = pending * confirmation
    pipeline = committed + expected_pending

    baseline = max(metrics["historical_baseline"], metrics["current_run_rate"])
    predicted = max(committed, baseline * 0.8 + pipeline * 0.2 if baseline and pipeline else baseline or pipeline)
    predicted = _round_peso(predicted)

    uncertainty = 0.45
    return {
        "month": next_start.strftime("%b"),
        "monthKey": next_start.strftime("%Y-%m"),
        "predictedRevenue": predicted,
        "rangeLow": _round_peso(max(committed, predicted * (1 - uncertainty))),
        "rangeHigh": _round_peso(predicted * (1 + uncertainty)),
        "confidence": 35,
        "confidenceLabel": "Low data confidence",
        "signal": "stable",
        "growthDelta": _round_peso(predicted - metrics["historical_baseline"]),
        "committedRevenue": _round_peso(committed),
        "expectedPendingRevenue": _round_peso(expected_pending),
        "expectedPipelineRevenue": _round_peso(pipeline),
        "confirmationRate": round(confirmation * 100),
        "currentMonthRevenue": _round_peso(metrics["current_revenue"], 1),
        "currentMonthRunRate": _round_peso(metrics["current_run_rate"]),
        "historicalBaseline": _round_peso(metrics["historical_baseline"]),
        "statisticalBaseline": _round_peso(baseline),
        "historyMonths": int(metrics["history_months"]),
        "historicalBookings": int(len(appointments)),
        "backtestAccuracy": None,
        "model": "Transparent statistical fallback",
        "engine": "fallback",
        "fallbackUsed": True,
        "fallbackReason": reason,
        "trainingRows": int(len(frame)),
        "trainingAppointments": int(len(appointments)),
        "metrics": {"mae": None, "smape": None},
        "featureImportance": [],
        "trainingPeriod": {
            "start": frame.index.min().strftime("%Y-%m-%d") if not frame.empty else None,
            "end": frame.index.max().strftime("%Y-%m-%d") if not frame.empty else None,
        },
        "forecastDays": int((next_end - next_start).days + 1),
    }


def forecast_sales(
    appointments_payload: list[dict[str, Any]],
    today_value: str | None = None,
) -> dict[str, Any]:
    appointments = _normalize_appointments(appointments_payload)
    today = pd.to_datetime(today_value or date.today().isoformat(), errors="coerce")
    if pd.isna(today):
        today = pd.Timestamp.today().normalize()
    today = today.normalize()

    frame = _build_training_frame(appointments, today)
    revenue_days = int((frame.get("revenue", pd.Series(dtype=float)) > 0).sum())

    if len(frame) < 45 or revenue_days < 10:
        return _fallback_forecast(
            frame,
            appointments,
            today,
            "At least 45 calendar days and 10 revenue-producing days are required before ML training is reliable.",
        )

    training = frame.iloc[28:].copy()
    X = training[FEATURE_COLUMNS]
    y = training["revenue"]

    if len(X) < 30:
        return _fallback_forecast(
            frame,
            appointments,
            today,
            "Not enough lag-complete daily rows are available for time-series validation.",
        )

    best = _evaluate_models(X, y)

    next_start = today.replace(day=1) + pd.offsets.MonthBegin(1)
    next_end = next_start + pd.offsets.MonthEnd(0)
    future = _future_pipeline(appointments, next_start, next_end)
    confirmation = _confirmation_rate(appointments)

    predicted_history = frame["revenue"].copy()
    daily_predictions: list[dict[str, Any]] = []

    for current_date, base_row in future.iterrows():
        row = _build_recursive_row(base_row, predicted_history, current_date)
        model_prediction = max(0.0, float(best.estimator.predict(row)[0]))
        pipeline_floor = float(base_row.get("committed_value", 0.0)) + (
            float(base_row.get("pending_value", 0.0)) * confirmation
        )
        prediction = max(model_prediction, pipeline_floor)
        predicted_history.loc[current_date] = prediction
        daily_predictions.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "predictedRevenue": round(prediction, 2),
            "pipelineFloor": round(pipeline_floor, 2),
        })

    raw_prediction = float(sum(item["predictedRevenue"] for item in daily_predictions))
    metrics = _historical_monthly_metrics(frame, today)

    next_appointments = appointments[
        (appointments["date"] >= next_start) & (appointments["date"] <= next_end)
    ]
    committed = float(
        next_appointments[next_appointments["status"].isin(REVENUE_STATUSES)]["price"].sum()
    )
    pending = float(next_appointments[next_appointments["status"] == "pending"]["price"].sum())
    expected_pending = pending * confirmation
    expected_pipeline = committed + expected_pending

    predicted = _round_peso(max(raw_prediction, committed))
    accuracy = float(np.clip(100.0 - best.smape, 20.0, 95.0))
    history_score = min(1.0, len(training) / 365.0)
    revenue_day_score = min(1.0, revenue_days / 60.0)
    confidence = int(round(np.clip(accuracy * 0.65 + history_score * 20 + revenue_day_score * 15, 30, 92)))
    confidence_label = (
        "High data confidence" if confidence >= 75 else
        "Moderate data confidence" if confidence >= 55 else
        "Low data confidence"
    )

    uncertainty = float(np.clip(best.smape / 100.0, 0.12, 0.50))
    range_low = _round_peso(max(committed, predicted * (1.0 - uncertainty)))
    range_high = _round_peso(predicted * (1.0 + uncertainty))

    comparison = metrics["historical_baseline"] or metrics["current_run_rate"]
    growth_delta = _round_peso(predicted - comparison)
    change = (predicted - comparison) / comparison if comparison > 0 else 0.0
    signal = "uptrend" if change > 0.05 else "cooldown" if change < -0.05 else "stable"

    importance = _feature_importance(best.estimator, X, y)

    return {
        "month": next_start.strftime("%b"),
        "monthKey": next_start.strftime("%Y-%m"),
        "predictedRevenue": predicted,
        "rangeLow": range_low,
        "rangeHigh": range_high,
        "confidence": confidence,
        "confidenceLabel": confidence_label,
        "signal": signal,
        "growthDelta": growth_delta,
        "committedRevenue": _round_peso(committed),
        "expectedPendingRevenue": _round_peso(expected_pending),
        "expectedPipelineRevenue": _round_peso(expected_pipeline),
        "confirmationRate": round(confirmation * 100),
        "currentMonthRevenue": _round_peso(metrics["current_revenue"], 1),
        "currentMonthRunRate": _round_peso(metrics["current_run_rate"]),
        "historicalBaseline": _round_peso(metrics["historical_baseline"]),
        "statisticalBaseline": _round_peso(max(metrics["historical_baseline"], metrics["current_run_rate"])),
        "historyMonths": int(metrics["history_months"]),
        "historicalBookings": int(len(appointments)),
        "backtestAccuracy": round(accuracy),
        "model": best.name,
        "engine": "scikit-learn",
        "fallbackUsed": False,
        "trainingRows": int(len(training)),
        "trainingAppointments": int(len(appointments)),
        "metrics": {
            "mae": round(best.mae, 2),
            "smape": round(best.smape, 2),
        },
        "featureImportance": importance,
        "trainingPeriod": {
            "start": training.index.min().strftime("%Y-%m-%d"),
            "end": training.index.max().strftime("%Y-%m-%d"),
        },
        "forecastDays": int(len(daily_predictions)),
        "dailyForecast": daily_predictions,
        "featureSet": FEATURE_COLUMNS,
    }
