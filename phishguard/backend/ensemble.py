"""Three-model phishing ensemble: Logistic Regression + Random Forest + XGBoost.

* Logistic Regression  -> word tokens of the URL
* Random Forest, XGBoost -> top-300 word tokens + structural URL features
Verdict = majority vote (at least 2 of 3 models say phishing).
"""
import numpy as np
import scipy.sparse as sp

from features import to_vector
import textmodel  # noqa: F401  (clean_url must be importable when unpickling)

MODEL_NAMES = ["Logistic Regression", "Random Forest", "XGBoost"]


def struct_matrix(urls):
    rows = [to_vector(u)[0] for u in urls]
    return sp.csr_matrix(np.array(rows, dtype=np.float32))


def combine(prob_list):
    """prob_list: three arrays of P(phishing). Returns (is_phishing, confidence, agree_count)."""
    P = np.vstack(prob_list)                      # 3 x n
    votes = P >= 0.5
    phishing = votes.sum(axis=0) >= 2
    agree = np.where(phishing, votes.sum(axis=0), 3 - votes.sum(axis=0))
    # confidence = mean probability of the verdict, over the models that agree with it
    agreeing = votes == phishing                  # 3 x n boolean
    win_p = np.where(phishing, P, 1 - P)
    confidence = (win_p * agreeing).sum(axis=0) / agreeing.sum(axis=0)
    return phishing, confidence, agree


class PhishEnsemble:
    def __init__(self, vec_full, vec_small, models):
        self.vec_full = vec_full      # full-vocabulary CountVectorizer (Logistic Regression)
        self.vec_small = vec_small    # 300-word CountVectorizer (tree models)
        self.models = models          # {name: fitted classifier}, class 1 = phishing

    def matrices(self, urls):
        urls = list(urls)
        full = self.vec_full.transform(urls)
        tree = sp.hstack(
            [self.vec_small.transform(urls).astype(np.float32), struct_matrix(urls)]
        ).tocsr()
        return full, tree

    def phishing_probabilities(self, urls):
        full, tree = self.matrices(urls)
        inputs = {"Logistic Regression": full, "Random Forest": tree, "XGBoost": tree}
        return [self.models[n].predict_proba(inputs[n])[:, 1] for n in MODEL_NAMES]

    def predict_url(self, url):
        probs = self.phishing_probabilities([url])
        phishing, confidence, agree = combine(probs)
        per_model = []
        for name, p in zip(MODEL_NAMES, probs):
            p = float(p[0])
            is_p = p >= 0.5
            per_model.append({
                "name": name,
                "prediction": "phishing" if is_p else "legitimate",
                "confidence": round(p if is_p else 1 - p, 4),
            })
        return {
            "prediction": "phishing" if bool(phishing[0]) else "legitimate",
            "confidence": round(float(confidence[0]), 4),
            "agreement": f"{int(agree[0])}/3",
            "models": per_model,
        }
