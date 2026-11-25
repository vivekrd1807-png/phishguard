"""Train a word-token URL classifier and save it as model.pkl.
Usage:  python train_model.py phishing_site_urls.csv
"""
import sys
from pathlib import Path
import joblib
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline

from textmodel import clean_url

if len(sys.argv) != 2:
    sys.exit("Usage: python train_model.py dataset.csv")

BASE_DIR = Path(__file__).resolve().parent
dataset = Path(sys.argv[1]).expanduser()
if not dataset.is_absolute():
    dataset = (Path.cwd() / dataset).resolve()
df = pd.read_csv(dataset)
df.columns = df.columns.str.strip().str.lower()
df = df.dropna(subset=["url", "label"]).drop_duplicates(subset="url")

y = df["label"].astype(str).str.lower().map(
    {"bad": "bad", "1": "bad", "phishing": "bad",
     "good": "good", "0": "good", "legitimate": "good"}
)
mask = y.notna()
X, y = df.loc[mask, "url"], y[mask]

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

model = make_pipeline(
    CountVectorizer(preprocessor=clean_url, token_pattern=r"[a-z]+", stop_words="english"),
    LogisticRegression(max_iter=1000, class_weight="balanced"),
)
model.fit(X_tr, y_tr)
print(classification_report(y_te, model.predict(X_te)))

joblib.dump(model, BASE_DIR / "model.pkl")
print("Saved model.pkl  classes =", list(model.classes_))
