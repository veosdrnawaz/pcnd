import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib
import time

def main():
    print("Loading dataset...")
    df = pd.read_csv("dataset.csv")
    
    X = df[["Amount"]]
    Y = df[["n1000", "n500", "n100", "n50", "n20", "n10"]]
    
    print("Splitting dataset into train and test sets...")
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42)
    
    print("Initializing MultiOutputRegressor with RandomForestRegressor...")
    # Using n_estimators=20 and max_depth=20 for a balance of speed and precision
    model = MultiOutputRegressor(
        RandomForestRegressor(n_estimators=20, max_depth=20, random_state=42, n_jobs=-1)
    )
    
    print("Training model (this may take a few moments)...")
    start_time = time.time()
    model.fit(X_train, Y_train)
    elapsed_time = time.time() - start_time
    print(f"Model trained in {elapsed_time:.2f} seconds.")
    
    print("Evaluating model performance on test set...")
    score = model.score(X_test, Y_test)
    print(f"Test Set R^2 Score: {score:.5f}")
    
    # Save the model
    model_filename = "currency_model.pkl"
    print(f"Saving model to {model_filename}...")
    joblib.dump(model, model_filename)
    print("Model saved successfully.")

if __name__ == "__main__":
    main()
