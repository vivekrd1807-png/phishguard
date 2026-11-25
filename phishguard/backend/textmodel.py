import re

_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def clean_url(url):
    """Lower-case and strip scheme and www so the prefix can't bias the model."""
    url = _SCHEME.sub("", str(url).strip().lower())
    return re.sub(r"^www\.", "", url)
