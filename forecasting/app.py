from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import List

app = FastAPI(title="GridLock Forecasting Engine")

class ForecastRequest(BaseModel):
timestamps: List[str]
values: List[float]
horizon: int = 24

class ForecastResponse(BaseModel):
forecast: List[float]
horizon: int

@app.get("/health")
def health():
return {"status": "ok", "service": "gridlock-forecasting"}

@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
if len(req.timestamps) != len(req.values):
raise HTTPException(status_code=422, detail="timestamps and values length mismatch")
if len(req.values) < 2:
raise HTTPException(status_code=422, detail="Not enough data points")
X = np.arange(len(req.values)).reshape(-1, 1)
y = np.array(req.values)
model = LinearRegression()
model.fit(X, y)
future_X = np.arange(len(req.values), len(req.values) + req.horizon).reshape(-1, 1)
predictions = model.predict(future_X).tolist()
return ForecastResponse(forecast=predictions, horizon=req.horizon)