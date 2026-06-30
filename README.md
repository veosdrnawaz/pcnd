# Pakistani Currency Note Distribution Predictor Web App

A modern, responsive dashboard to predict the optimal distribution of Pakistani currency notes (Rs.1000, Rs.500, Rs.100, Rs.50, Rs.20, and Rs.10) for any given amount. The system uses a trained Machine Learning model (`MultiOutputRegressor` wrapping `RandomForestRegressor`), a FastAPI backend, and an interactive glassmorphism HTML/CSS/JS frontend.

---

## 🛠️ Project Structure

```text
website/
│── app.py                   # FastAPI server, API routes, and correction logic
│── train_model.py           # ML Model training script using Scikit-Learn
│── generate_dataset.py       # Custom data generator for all denominations (50,000 samples)
│── currency_model.pkl       # Saved RandomForest model file (generated during training)
│── dataset.csv              # Saved dataset file (generated)
│
│── templates/
│     └── index.html         # Responsive, Glassmorphic HTML5 Dashboard
│
│── static/
│     ├── style.css          # Vanilla CSS layout, dark/light themes, animations
│     └── script.js          # Interactive JavaScript, LocalStorage, CSV/PDF export
│
│── requirements.txt         # Core dependencies
└── README.md                # Documentation & instructions (this file)
```

---

## 📋 Note Distribution Rules

The dataset and predictions are based on the following fixed algorithm:
1. **At least one Rs.10 note** is included whenever possible (for any amount $\ge$ 10).
2. **Rs.20 notes** are included to bring the remaining amount down to a multiple of 50.
3. **One Rs.50 note** is included if needed to make the remainder a multiple of 100.
4. **Rs.100 notes** are included to make the remainder a multiple of 500.
5. **Rs.500 notes** are used to make the remainder a multiple of 1000.
6. **Rs.1000 notes** are used to fill the remaining bulk amount.

---

## 🚀 Execution & Setup Instructions

### 1. Prerequisites
Ensure Python 3.8+ is installed on your system.

### 2. Install Dependencies
Open your shell and run the following command to install the required libraries:
```bash
pip install -r requirements.txt
```

### 3. Generate Dataset (Optional - already generated)
If you want to re-generate the 50,000 rows (`dataset.csv`), run:
```bash
python generate_dataset.py
```

### 4. Train Model
Train the Scikit-Learn Random Forest model and output `currency_model.pkl` by running:
```bash
python train_model.py
```

### 5. Run the Web Application
Start the FastAPI server:
```bash
python app.py
```
Or run directly using Uvicorn:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 💡 Technical Features

- **Robust Backend Verification:** The server automatically checks if the model's rounded predictions match the input amount. If there is a discrepancy (which can happen with tree-based models on unseen splits), it runs the exact math resolver to correct the distribution, ensuring the sum of note values is **always** equal to the target amount.
- **Glassmorphism Theme UI:** Translucent cards with blur effects, neon borders, and Outfitted typography.
- **Micro-Animations:** Success checkmark drawing, spinner state loaders, and list sliding animations.
- **Premium Themes:** Light and Dark mode toggling.
- **Data Export:** Generate and download prediction records as a CSV spreadsheet or a clean A4 PDF statement using client-side jsPDF.
- **Query History:** The last 10 predictions are saved locally in the browser's `localStorage` and shown in an interactive history log.
