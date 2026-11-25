"""Trusted-domain list check (a supplement to the ML ensemble).

Strict matching: only the exact domain or its 'www.' form is trusted, so
look-alikes such as google.com.evil.tk or axisbankkyc.example.com never match.
"""
from pathlib import Path

from features import _host_and_path

_LIST = Path(__file__).with_name("trusted_domains.txt")


def _load():
    try:
        lines = _LIST.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return set()
    return {l.strip().lower() for l in lines if l.strip() and not l.startswith("#")}


TRUSTED = _load()


def is_trusted(url: str) -> bool:
    host, _ = _host_and_path(str(url).strip())
    host = host.lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    return host in TRUSTED
