from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

from data_pipeline import run_pipeline

MODEL_PATH = "model.joblib"
ENCODER_PATH = "encoder.joblib"

model: RandomForestRegressor | None = None
encoder: LabelEncoder | None = None
feature_columns: list[str] = ["event_type_encoded", "duration_minutes", "priority"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, encoder
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        model = joblib.load(MODEL_PATH)
        encoder = joblib.load(ENCODER_PATH)
    yield


app = FastAPI(title="GridLock Forecasting Engine", lifespan=lifespan)


class TrainResponse(BaseModel):
    status: str
    samples_trained: int
    feature_importances: dict[str, float]


class ForecastRequest(BaseModel):
    event_type: str
    duration_minutes: float
    priority: int


class ForecastResponse(BaseModel):
    congestion_impact_score: float
    recommended_manpower: int
    recommended_barricades: int
    requires_diversion: bool


def _compute_resources(score: float) -> dict:
    manpower = int(np.clip(np.ceil(score * 0.4), 2, 50))
    barricades = int(np.clip(np.ceil(score * 0.25), 1, 30))
    requires_diversion = score >= 65.0
    return {
        "recommended_manpower": manpower,
        "recommended_barricades": barricades,
        "requires_diversion": requires_diversion,
    }


def _prepare_training_data(df_clean: pd.DataFrame, df_agg: pd.DataFrame):
    global encoder

    event_col = next(
        (c for c in df_clean.columns if any(k in c for k in ["event_type", "type", "category", "event"])),
        None,
    )
    duration_col = next(
        (c for c in df_clean.columns if any(k in c for k in ["duration", "minutes", "length"])),
        None,
    )
    priority_col = next(
        (c for c in df_clean.columns if "priority" in c),
        None,
    )
    impact_col = next(
        (c for c in df_clean.columns if any(k in c for k in ["impact", "congestion", "score", "delay"])),
        None,
    )

    if not event_col:
        raise ValueError(f"Cannot locate event type column in: {df_clean.columns.tolist()}")

    df = df_clean.copy()

    encoder = LabelEncoder()
    df["event_type_encoded"] = encoder.fit_transform(df[event_col].astype(str))

    if duration_col:
        df["duration_minutes"] = pd.to_numeric(df[duration_col], errors="coerce").fillna(df[duration_col].median() if duration_col in df else 30)
    else:
        df["duration_minutes"] = 30.0

    if priority_col:
        df["priority"] = pd.to_numeric(df[priority_col], errors="coerce").fillna(1).astype(int)
    else:
        df["priority"] = 1

    if impact_col:
        df["congestion_impact_score"] = pd.to_numeric(df[impact_col], errors="coerce")
    else:
        df["congestion_impact_score"] = (
            df["event_type_encoded"] * 3.5
            + df["duration_minutes"] * 0.2
            + df["priority"] * 5.0
            + np.random.uniform(0, 10, len(df))
        ).clip(0, 100)

    df.dropna(subset=["congestion_impact_score"], inplace=True)

    X = df[feature_columns].values
    y = df["congestion_impact_score"].values

    return X, y


@app.get("/health")
def health():
    return {"status": "ok", "service": "gridlock-forecasting", "model_loaded": model is not None}


@app.post("/train", response_model=TrainResponse)
def train():
    """Load historical data, train a RandomForestRegressor, and persist the model."""
    global model, encoder

    try:
        _, df_clean, df_agg = run_pipeline()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {exc}")

    try:
        X, y = _prepare_training_data(df_clean, df_agg)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if len(X) < 5:
        raise HTTPException(status_code=422, detail="Insufficient data to train (minimum 5 samples).")

    model = RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42, n_jobs=-1)
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    importances = dict(zip(feature_columns, model.feature_importances_.round(4).tolist()))

    return TrainResponse(
        status="success",
        samples_trained=len(X),
        feature_importances=importances,
    )


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """Accept event parameters, return predicted congestion score and operational resources."""
    if model is None or encoder is None:
        raise HTTPException(status_code=503, detail="Model not trained. POST /train first.")

    if req.duration_minutes <= 0:
        raise HTTPException(status_code=422, detail="duration_minutes must be positive.")
    if req.priority < 1:
        raise HTTPException(status_code=422, detail="priority must be >= 1.")

    try:
        event_encoded = encoder.transform([req.event_type.lower()])[0]
    except ValueError:
        event_encoded = float(np.mean(encoder.transform(encoder.classes_)))

    X_input = np.array([[event_encoded, req.duration_minutes, req.priority]])
    score = float(np.clip(model.predict(X_input)[0], 0.0, 100.0))

    resources = _compute_resources(score)

    return ForecastResponse(congestion_impact_score=round(score, 2), **resources)