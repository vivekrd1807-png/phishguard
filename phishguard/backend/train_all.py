"""Train the 3-model ensemble and save ensemble.pkl + metrics.json.

Usage:  python train_all.py phishing_site_urls.csv
"""
import json
import sys
import time
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from ensemble import MODEL_NAMES, PhishEnsemble, combine
from textmodel import clean_url

MAX_ROWS = 300_000   # lower this (e.g. 100_000) if training is too slow

if len(sys.argv) != 2:
    sys.exit("Usage: python train_all.py dataset.csv")

BASE_DIR = Path(__file__).resolve().parent
dataset = Path(sys.argv[1]).expanduser()
if not dataset.is_absolute():
    dataset = (Path.cwd() / dataset).resolve()
df = pd.read_csv(dataset)
df.columns = df.columns.str.strip().str.lower()
df = df.dropna(subset=["url", "label"]).drop_duplicates(subset="url")
y = df["label"].astype(str).str.lower().map(
    {"bad": 1, "1": 1, "phishing": 1, "good": 0, "0": 0, "legitimate": 0}
)
df, y = df[y.notna()], y[y.notna()].astype(int)
if len(df) > MAX_ROWS:
    df = df.sample(MAX_ROWS, random_state=42)
    y = y.loc[df.index]
X = df["url"]
print(f"Using {len(df):,} URLs  (phishing: {int(y.sum()):,}, legitimate: {int((1 - y).sum()):,})")

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

vec_full = CountVectorizer(preprocessor=clean_url, token_pattern=r"[a-z]+", stop_words="english")
vec_small = CountVectorizer(preprocessor=clean_url, token_pattern=r"[a-z]+",
                            stop_words="english", max_features=300)
vec_full.fit(X_tr)
vec_small.fit(X_tr)

ens = PhishEnsemble(vec_full, vec_small, models={})
print("Extracting features…")
t0 = time.time()
full_tr, tree_tr = ens.matrices(X_tr)
full_te, tree_te = ens.matrices(X_te)
print(f"  done in {time.time() - t0:.0f}s")

classifiers = {
    "Logistic Regression": (LogisticRegression(max_iter=1000, class_weight="balanced"), full_tr, full_te),
    "Random Forest": (RandomForestClassifier(n_estimators=100, max_depth=25, min_samples_leaf=3,
                                             class_weight="balanced", n_jobs=-1, random_state=42),
                      tree_tr, tree_te),
    "XGBoost": (XGBClassifier(n_estimators=300, max_depth=8, learning_rate=0.2,
                              tree_method="hist", n_jobs=-1, eval_metric="logloss",
                              random_state=42), tree_tr, tree_te),
}


def scores(y_true, y_pred):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
    }


metrics, test_probs = {}, []
for name in MODEL_NAMES:
    clf, Xtr, Xte = classifiers[name]
    t0 = time.time()
    clf.fit(Xtr, y_tr)
    p = clf.predict_proba(Xte)[:, 1]
    test_probs.append(p)
    ens.models[name] = clf
    metrics[name] = scores(y_te, p >= 0.5)
    print(f"Trained {name} in {time.time() - t0:.0f}s")

phish, _, _ = combine(test_probs)
metrics["Ensemble (majority vote)"] = scores(y_te, phish)

print("\n{:<26}{:>10}{:>11}{:>9}{:>9}".format("Model", "Accuracy", "Precision", "Recall", "F1"))
for name, m in metrics.items():
    print("{:<26}{:>10.4f}{:>11.4f}{:>9.4f}{:>9.4f}".format(
        name, m["accuracy"], m["precision"], m["recall"], m["f1"]))

joblib.dump(ens, BASE_DIR / "ensemble.pkl", compress=3)
with (BASE_DIR / "metrics.json").open("w", encoding="utf-8") as f:
    json.dump({"test_rows": int(len(y_te)), "train_rows": int(len(y_tr)), "scores": metrics}, f, indent=2)
print("\nSaved ensemble.pkl and metrics.json")
