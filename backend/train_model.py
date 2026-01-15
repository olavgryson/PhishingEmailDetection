import pandas as pd
import numpy as np
import joblib
import os
import sys
import requests
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.metrics import classification_report

# Add current directory to path so we can import features
sys.path.append(os.getcwd())
from backend.features import HtmlFeatureExtractor, UrlFeatureExtractor, UrlTokenizer

# Dataset URL (Phishing Site Classification from Hugging Face)
DATASET_URL = "https://huggingface.co/datasets/shawhin/phishing-site-classification/resolve/main/data/train-00000-of-00001.parquet"
DATASET_PATH = "backend/data/phishing_dataset.parquet"

def download_dataset():
    """Downloads the dataset if it doesn't exist."""
    if os.path.exists(DATASET_PATH):
        print(f"Dataset already exists at {DATASET_PATH}")
        return

    print(f"Downloading dataset from {DATASET_URL}...")
    os.makedirs('backend/data', exist_ok=True)
    try:
        response = requests.get(DATASET_URL)
        response.raise_for_status()
        with open(DATASET_PATH, 'wb') as f:
            f.write(response.content)
        print("Download complete.")
    except Exception as e:
        print(f"Failed to download dataset: {e}")
        sys.exit(1)

def load_data():
    """Loads the dataset and prepares it for training."""
    download_dataset()
    
    try:
        df = pd.read_parquet(DATASET_PATH)
        print(f"Loaded {len(df)} samples.")
        
        # The dataset has 'text' (URL) and 'labels' (0/1)
        # Rename 'text' to 'body' to match our pipeline expectation
        df = df.rename(columns={'text': 'body', 'labels': 'label'})
        
        # Ensure labels are integers
        df['label'] = df['label'].astype(int)
        
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        sys.exit(1)

def train_pipeline():
    df = load_data()
    
    X = df['body'] # This contains URLs
    y = df['label']
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    features = FeatureUnion([
        # Use a custom tokenizer for URLs to capture words like "login", "secure", "account" inside the URL
        ('url_tfidf', TfidfVectorizer(tokenizer=UrlTokenizer(), token_pattern=None, max_features=500)),
        ('html_features', HtmlFeatureExtractor()),        
        ('url_features', UrlFeatureExtractor())           
    ])
    
    # Complete pipeline
    pipeline = Pipeline([
        ('features', features),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    # Train
    print("Training model on real phishing URLs...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    # Save
    os.makedirs('backend/models', exist_ok=True)
    joblib.dump(pipeline, 'backend/models/phishing_model.joblib')
    print("Model saved to backend/models/phishing_model.joblib")
    
    # Save a sample CSV for the graph generator to use
    sample_df = df.sample(min(len(df), 1000), random_state=42)
    sample_df.to_csv('backend/data/dataset.csv', index=False)
    print("Sample dataset saved to backend/data/dataset.csv for visualization.")

if __name__ == "__main__":
    train_pipeline()
