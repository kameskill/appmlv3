"""Dataset-backed grooming recommendation model for Timmy Tails."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATA_DIR = Path(__file__).resolve().parent / "data"
BREED_DATASET_PATH = DATA_DIR / "breed_grooming_dataset.csv"
HAIRCUT_DATASET_PATH = DATA_DIR / "haircut_catalog.csv"
TRAINING_DATASET_PATH = DATA_DIR / "recommendation_training.csv"


CATEGORICAL_FEATURES = [
    "coat_type",
    "coat_length",
    "size",
    "shedding",
    "grooming_frequency",
    "style",
    "season",
]

NUMERIC_FEATURES = [
    "matting_risk",
    "heat_sensitivity",
    "moisture_sensitivity",
    "double_coat",
    "clipping_risk",
    "price",
    "maintenance_level",
    "season_fit",
    "clip_intensity",
    "undercoat_safe",
    "base_popularity",
    "coat_compatible",
    "size_compatible",
]

MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


@dataclass
class RecommendationModelInfo:
    name: str
    algorithm: str
    training_rows: int
    breed_rows: int
    haircut_rows: int
    features: list[str]
    datasets: list[dict[str, str]]


class GroomingRecommendationEngine:
    """Hybrid content-based model trained from grooming-specific datasets."""

    def __init__(self) -> None:
        self.breeds = self._load_breeds()
        self.haircuts = self._load_haircuts()
        self.training_data = self._build_training_dataset()
        self.pipeline = self._build_pipeline()
        self.pipeline.fit(
            self.training_data[MODEL_FEATURES],
            self.training_data["expert_score"],
        )

    @staticmethod
    def _load_breeds() -> pd.DataFrame:
        frame = pd.read_csv(BREED_DATASET_PATH)
        frame["breed_lookup"] = frame["breed"].str.strip().str.casefold()
        return frame

    @staticmethod
    def _load_haircuts() -> pd.DataFrame:
        frame = pd.read_csv(HAIRCUT_DATASET_PATH)
        frame["suitable_coats_list"] = frame["suitable_coats"].fillna("").apply(
            lambda value: {item.strip() for item in str(value).split("|") if item.strip()}
        )
        frame["suitable_sizes_list"] = frame["suitable_sizes"].fillna("").apply(
            lambda value: {item.strip() for item in str(value).split("|") if item.strip()}
        )
        return frame

    @staticmethod
    def _build_pipeline() -> Pipeline:
        transformer = ColumnTransformer(
            transformers=[
                (
                    "categorical",
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                    CATEGORICAL_FEATURES,
                ),
                ("numeric", "passthrough", NUMERIC_FEATURES),
            ],
            remainder="drop",
        )

        model = RandomForestRegressor(
            n_estimators=320,
            max_depth=12,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )

        return Pipeline([
            ("features", transformer),
            ("model", model),
        ])

    def _expert_score(self, breed: pd.Series, haircut: pd.Series, season: str) -> float:
        """Create the training target from curated grooming compatibility data."""
        score = float(haircut["base_popularity"]) * 28.0

        coat_compatible = breed["coat_type"] in haircut["suitable_coats_list"]
        size_compatible = breed["size"] in haircut["suitable_sizes_list"]

        score += 30.0 if coat_compatible else -24.0
        score += 10.0 if size_compatible else -9.0

        season_fit = float(haircut[f"{season}_fit"])
        score += season_fit * 23.0

        matting_risk = float(breed["matting_risk"])
        moisture_risk = float(breed["moisture_sensitivity"])
        maintenance = float(haircut["maintenance_level"])

        if season == "rainy":
            score += moisture_risk * (1.0 - maintenance) * 11.0
            if haircut["style"] in {"Sanitary Trim", "Bath & Brush Only"}:
                score += matting_risk * 10.0
        else:
            score += float(breed["heat_sensitivity"]) * season_fit * 7.0

        if breed["shedding"] == "high" and haircut["style"] == "De-shedding Treatment":
            score += 24.0

        if breed["coat_length"] == "long" and haircut["style"] in {
            "Puppy Cut",
            "Sanitary Trim",
            "Bath & Brush Only",
        }:
            score += matting_risk * 8.0

        if int(breed["double_coat"]) == 1:
            if int(haircut["undercoat_safe"]) == 0:
                score -= 38.0 * max(float(haircut["clip_intensity"]), 0.6)
            if haircut["style"] in {"Bath & Brush Only", "De-shedding Treatment"}:
                score += 16.0

        if float(breed["clipping_risk"]) >= 0.8 and float(haircut["clip_intensity"]) >= 0.75:
            score -= 22.0

        return float(np.clip(score, 5.0, 99.0))

    def _build_training_dataset(self) -> pd.DataFrame:
        rows: list[dict[str, Any]] = []

        for _, breed in self.breeds.iterrows():
            for _, haircut in self.haircuts.iterrows():
                for season in ("rainy", "dry"):
                    coat_compatible = int(
                        breed["coat_type"] in haircut["suitable_coats_list"]
                    )
                    size_compatible = int(
                        breed["size"] in haircut["suitable_sizes_list"]
                    )

                    rows.append({
                        "breed": breed["breed"],
                        "coat_type": breed["coat_type"],
                        "coat_length": breed["coat_length"],
                        "size": breed["size"],
                        "shedding": breed["shedding"],
                        "grooming_frequency": breed["grooming_frequency"],
                        "matting_risk": float(breed["matting_risk"]),
                        "heat_sensitivity": float(breed["heat_sensitivity"]),
                        "moisture_sensitivity": float(breed["moisture_sensitivity"]),
                        "double_coat": int(breed["double_coat"]),
                        "clipping_risk": float(breed["clipping_risk"]),
                        "style": haircut["style"],
                        "season": season,
                        "price": float(haircut["price"]),
                        "maintenance_level": float(haircut["maintenance_level"]),
                        "season_fit": float(haircut[f"{season}_fit"]),
                        "clip_intensity": float(haircut["clip_intensity"]),
                        "undercoat_safe": int(haircut["undercoat_safe"]),
                        "base_popularity": float(haircut["base_popularity"]),
                        "coat_compatible": coat_compatible,
                        "size_compatible": size_compatible,
                        "expert_score": self._expert_score(breed, haircut, season),
                    })

        frame = pd.DataFrame(rows)
        frame.to_csv(TRAINING_DATASET_PATH, index=False)
        return frame

    def resolve_breed(self, requested_breed: str | None) -> pd.Series:
        lookup = str(requested_breed or "Other").strip().casefold()
        matches = self.breeds[self.breeds["breed_lookup"] == lookup]

        if matches.empty:
            fallback = self.breeds[self.breeds["breed"] == "Other"]
            return fallback.iloc[0]

        return matches.iloc[0]

    @staticmethod
    def _normalize_popularity(history: dict[str, Any] | None, breed_name: str) -> dict[str, float]:
        history = history or {}
        breed_counts = history.get("breed", {}) if isinstance(history, dict) else {}
        global_counts = history.get("global", {}) if isinstance(history, dict) else {}

        if isinstance(breed_counts, dict) and breed_name in breed_counts:
            breed_counts = breed_counts.get(breed_name, {})

        if not isinstance(breed_counts, dict):
            breed_counts = {}
        if not isinstance(global_counts, dict):
            global_counts = {}

        combined: dict[str, float] = {}
        styles = set(breed_counts) | set(global_counts)

        for style in styles:
            combined[style] = (
                float(breed_counts.get(style, 0) or 0) * 0.7
                + float(global_counts.get(style, 0) or 0) * 0.3
            )

        maximum = max(combined.values(), default=0.0)
        if maximum <= 0:
            return {}

        return {style: value / maximum for style, value in combined.items()}

    @staticmethod
    def _reason(breed: pd.Series, haircut: pd.Series, season: str) -> str:
        reasons: list[str] = []

        if int(breed["double_coat"]) == 1:
            if haircut["style"] == "De-shedding Treatment":
                reasons.append("supports undercoat care without shaving the protective double coat")
            elif int(haircut["undercoat_safe"]) == 1:
                reasons.append("keeps the protective double coat intact")

        if season == "rainy":
            if haircut["style"] == "Sanitary Trim":
                reasons.append("reduces mud, dampness, and matting around hygiene-sensitive areas")
            elif haircut["style"] == "Bath & Brush Only":
                reasons.append("cleans and dries the coat while preserving natural protection")
            elif float(breed["matting_risk"]) >= 0.7:
                reasons.append("makes a high-matting coat easier to maintain in humid weather")
        else:
            if haircut["style"] == "De-shedding Treatment":
                reasons.append("removes loose undercoat during warm dry-season conditions")
            elif float(breed["heat_sensitivity"]) >= 0.8:
                reasons.append("reduces maintenance burden for a heat-sensitive breed")

        if breed["coat_type"] in haircut["suitable_coats_list"]:
            reasons.append(f"matches the breed's {breed['coat_type']} coat")

        if not reasons:
            reasons.append("balances coat compatibility, maintenance, and Philippine seasonal conditions")

        return reasons[0].capitalize() + "."

    def recommend(
        self,
        breed: str,
        season: str,
        top_n: int = 3,
        history: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        selected_season = "rainy" if season == "rainy" else "dry"
        breed_row = self.resolve_breed(breed)
        popularity = self._normalize_popularity(history, str(breed_row["breed"]))

        prediction_rows: list[dict[str, Any]] = []
        haircut_rows: list[pd.Series] = []

        for _, haircut in self.haircuts.iterrows():
            prediction_rows.append({
                "coat_type": breed_row["coat_type"],
                "coat_length": breed_row["coat_length"],
                "size": breed_row["size"],
                "shedding": breed_row["shedding"],
                "grooming_frequency": breed_row["grooming_frequency"],
                "style": haircut["style"],
                "season": selected_season,
                "matting_risk": float(breed_row["matting_risk"]),
                "heat_sensitivity": float(breed_row["heat_sensitivity"]),
                "moisture_sensitivity": float(breed_row["moisture_sensitivity"]),
                "double_coat": int(breed_row["double_coat"]),
                "clipping_risk": float(breed_row["clipping_risk"]),
                "price": float(haircut["price"]),
                "maintenance_level": float(haircut["maintenance_level"]),
                "season_fit": float(haircut[f"{selected_season}_fit"]),
                "clip_intensity": float(haircut["clip_intensity"]),
                "undercoat_safe": int(haircut["undercoat_safe"]),
                "base_popularity": float(haircut["base_popularity"]),
                "coat_compatible": int(
                    breed_row["coat_type"] in haircut["suitable_coats_list"]
                ),
                "size_compatible": int(
                    breed_row["size"] in haircut["suitable_sizes_list"]
                ),
            })
            haircut_rows.append(haircut)

        feature_frame = pd.DataFrame(prediction_rows)
        raw_scores = self.pipeline.predict(feature_frame[MODEL_FEATURES])

        raw_min = float(np.min(raw_scores))
        raw_max = float(np.max(raw_scores))
        raw_span = max(raw_max - raw_min, 1.0)

        results: list[dict[str, Any]] = []
        for haircut, raw_score in zip(haircut_rows, raw_scores):
            history_score = popularity.get(str(haircut["style"]), 0.0)
            relative_score = 55.0 + ((float(raw_score) - raw_min) / raw_span) * 40.0
            final_score = float(np.clip(relative_score + history_score * 4.0, 1.0, 99.0))
            popularity_percent = int(
                round(
                    np.clip(
                        (history_score if popularity else float(haircut["base_popularity"])) * 100,
                        1,
                        99,
                    )
                )
            )

            warnings: list[str] = []
            if int(breed_row["double_coat"]) == 1 and int(haircut["undercoat_safe"]) == 0:
                warnings.append("Not normally recommended for double coats without groomer approval.")

            results.append({
                "name": str(haircut["style"]),
                "description": str(haircut["description"]),
                "price": f"₱{int(haircut['price']):,}",
                "match": f"{int(round(final_score))}%",
                "match_score": round(final_score, 2),
                "popularity": f"{popularity_percent}%",
                "weather_reason": self._reason(breed_row, haircut, selected_season),
                "warnings": warnings,
                "model": "Random Forest grooming compatibility model",
            })

        results.sort(key=lambda item: item["match_score"], reverse=True)

        return {
            "breed": str(breed_row["breed"]),
            "breed_profile": {
                "coat_type": str(breed_row["coat_type"]),
                "coat_length": str(breed_row["coat_length"]),
                "size": str(breed_row["size"]),
                "shedding": str(breed_row["shedding"]),
                "double_coat": bool(breed_row["double_coat"]),
            },
            "recommendations": results[: max(1, min(int(top_n), 10))],
        }

    def model_info(self) -> RecommendationModelInfo:
        return RecommendationModelInfo(
            name="Timmy Tails Grooming Compatibility Model v3",
            algorithm="RandomForestRegressor with one-hot encoded breed, coat, style, and season features",
            training_rows=int(len(self.training_data)),
            breed_rows=int(len(self.breeds)),
            haircut_rows=int(len(self.haircuts)),
            features=MODEL_FEATURES,
            datasets=[
                {
                    "name": "breed_grooming_dataset.csv",
                    "purpose": "Breed coat, size, shedding, matting, heat, moisture, and clipping-risk traits",
                },
                {
                    "name": "haircut_catalog.csv",
                    "purpose": "Timmy Tails style prices, coat compatibility, maintenance, and seasonal fit",
                },
                {
                    "name": "recommendation_training.csv",
                    "purpose": "Generated breed-style-season training matrix used by the model",
                },
            ],
        )
