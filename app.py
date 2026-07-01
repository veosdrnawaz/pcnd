from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import os

# Initialize FastAPI
app = FastAPI(title="Pakistani Currency Note Predictor API")

# Mount static and templates folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Load Machine Learning Model
MODEL_PATH = os.path.join(BASE_DIR, "currency_model.pkl")
model = None

if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("Machine learning model loaded successfully.")
    except Exception as e:
        print(f"Error loading machine learning model: {e}")
else:
    print(f"Warning: {MODEL_PATH} not found. Running app.py will trigger fallback predictions.")

# Pydantic Schemas
class PredictRequest(BaseModel):
    amount: int = Field(..., description="The cash amount to distribute", ge=10, le=100000000000)

class PredictResponse(BaseModel):
    amount: int
    total: int
    n5000: int
    n1000: int
    n500: int
    n100: int
    n50: int
    n20: int
    n10: int

    class Config:
        populate_by_name = True

# -------------------------------------------------------------
# Exact Mathematical Distribution Algorithm
# -------------------------------------------------------------
def get_exact_distribution(amount: int) -> dict:
    """
    Applies the fixed distribution algorithm rules sequentially.
    """
    n5000 = n1000 = n500 = n100 = n50 = n20 = n10 = 0
    
    if amount >= 10:
        n10 = 1
        rem = amount - 10
    else:
        n10 = 0
        rem = amount
        
    target_map = {0: 0, 10: 3, 20: 1, 30: 4, 40: 2}
    rem_mod_50 = rem % 50
    target_n20 = target_map.get(rem_mod_50, 0)
    
    if rem >= 20 * target_n20:
        n20 = target_n20
    else:
        n20 = rem // 20
        
    rem -= 20 * n20
    
    if rem % 100 == 50 and rem >= 50:
        n50 = 1
        rem -= 50
    else:
        n50 = 0
        
    if rem >= 100:
        n100 = (rem % 500) // 100
        rem -= 100 * n100
    else:
        n100 = 0
        
    if rem >= 500:
        n500 = (rem % 1000) // 500
        rem -= 500 * n500
    else:
        n500 = 0
        
    if rem >= 1000:
        n1000 = (rem % 5000) // 1000
        rem -= 1000 * n1000
    else:
        n1000 = 0
        
    if rem >= 5000:
        n5000 = rem // 5000
        rem -= 5000 * n5000
    else:
        n5000 = 0
        
    if rem > 0:
        n10 += rem // 10
        rem = 0
        
    return {
        "5000": n5000,
        "1000": n1000,
        "500": n500,
        "100": n100,
        "50": n50,
        "20": n20,
        "10": n10
    }

# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    """
    Renders the homepage.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/predict")
async def post_predict(payload: PredictRequest):
    """
    Predicts note counts for a given amount using RandomForestRegressor.
    Falls back to the exact algorithm or corrects predictions if the sums don't match.
    """
    amount = payload.amount
    
    if amount % 10 != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be a multiple of 10."
        )

    # Initialize note counts
    note_counts = {
        "5000": 0,
        "1000": 0,
        "500": 0,
        "100": 0,
        "50": 0,
        "20": 0,
        "10": 0
    }

    prediction_source = "model"

    if model is not None:
        try:
            # Predict counts (Y has shape: ["n5000", "n1000", "n500", "n100", "n50", "n20", "n10"])
            pred = model.predict([[amount]])[0]
            
            # Map predictions to non-negative rounded integers
            note_counts["5000"] = max(0, int(round(pred[0])))
            note_counts["1000"] = max(0, int(round(pred[1])))
            note_counts["500"] = max(0, int(round(pred[2])))
            note_counts["100"] = max(0, int(round(pred[3])))
            note_counts["50"] = max(0, int(round(pred[4])))
            note_counts["20"] = max(0, int(round(pred[5])))
            note_counts["10"] = max(0, int(round(pred[6])))

            # Calculate total
            total = (
                5000 * note_counts["5000"] +
                1000 * note_counts["1000"] +
                500 * note_counts["500"] +
                100 * note_counts["100"] +
                50 * note_counts["50"] +
                20 * note_counts["20"] +
                10 * note_counts["10"]
            )

            # If totals don't match, or note_counts violate rules (e.g. n10 is 0 when amount >= 10)
            if total != amount or (amount >= 10 and note_counts["10"] == 0):
                note_counts = get_exact_distribution(amount)
                prediction_source = "model-corrected"
                
        except Exception as e:
            print(f"Prediction failed with exception: {e}. Falling back to exact math solver.")
            note_counts = get_exact_distribution(amount)
            prediction_source = "fallback-solver"
    else:
        # Fallback if model failed to load
        note_counts = get_exact_distribution(amount)
        prediction_source = "math-solver"

    # Re-calculate total to verify correctness
    final_total = (
        5000 * note_counts["5000"] +
        1000 * note_counts["1000"] +
        500 * note_counts["500"] +
        100 * note_counts["100"] +
        50 * note_counts["50"] +
        20 * note_counts["20"] +
        10 * note_counts["10"]
    )

    return {
        "amount": amount,
        "5000": note_counts["5000"],
        "1000": note_counts["1000"],
        "500": note_counts["500"],
        "100": note_counts["100"],
        "50": note_counts["50"],
        "20": note_counts["20"],
        "10": note_counts["10"],
        "total": final_total,
        "source_debug": prediction_source  # Internal tracker
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
