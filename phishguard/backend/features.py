"""URL feature extraction – shared by training and the Flask API."""
import re
from urllib.parse import urlparse

KEYWORDS = ["login", "signin", "verify", "update", "secure", "account", "bank",
            "kyc", "confirm", "password", "wallet", "free", "bonus", "suspend",
            "otp", "payment"]

# Features given to the Random Forest / XGBoost models (https is shown to the
# user but not used for training: most URLs in the dataset have no scheme).
FEATURE_NAMES = ["url_length", "dots", "digits", "subdomains", "has_ip",
                 "has_at", "hyphens", "special_chars", "keyword_count", "path_length"]

_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def _host_and_path(url: str):
    """Return (host, path). Never raises, even on malformed URLs."""
    candidate = url if _SCHEME.match(url) else "http://" + url
    try:
        parsed = urlparse(candidate)
        return (parsed.hostname or ""), parsed.path
    except ValueError:
        rest = _SCHEME.sub("", candidate)
        host, _, path = rest.partition("/")
        host = re.split(r"[?#:]", host.split("@")[-1])[0]
        return host, "/" + path


def extract_features(url: str) -> dict:
    url = str(url).strip()
    https = int(url.lower().startswith("https://"))
    url = _SCHEME.sub("", url)
    url = re.sub(r"^www\.", "", url, flags=re.I)
    host, path = _host_and_path(url)
    has_ip = bool(re.fullmatch(r"(\d{1,3}\.){3}\d{1,3}", host))
    labels = [p for p in host.split(".") if p]
    low = url.lower()
    return {
        "url_length": len(url),
        "dots": url.count("."),
        "digits": sum(c.isdigit() for c in url),
        "subdomains": 0 if has_ip else max(len(labels) - 2, 0),
        "https": https,
        "has_ip": int(has_ip),
        "has_at": int("@" in url),
        "hyphens": url.count("-"),
        "special_chars": len(re.findall(r"[^a-zA-Z0-9./:]", url)),
        "keyword_count": sum(k in low for k in KEYWORDS),
        "path_length": len(path),
    }


def to_vector(url: str):
    f = extract_features(url)
    return [f[name] for name in FEATURE_NAMES], f
