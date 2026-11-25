// The API returns phishing | legitimate. The UI adds a third state, "suspicious",
// for results the models are not sure about:
//   single model : confidence below 75%
//   ensemble     : the three models do not all agree (2/3 vote), unless the domain is on the trusted list
export const SUSPICIOUS_CONFIDENCE = 0.75;

export function toVerdict(result, mode) {
  if (result.source === "trusted_list") return "safe";
  const phishing = result.prediction === "phishing";
  if (mode === "ensemble") {
    if (result.agreement && result.agreement !== "3/3") return "suspicious";
    return phishing ? "phishing" : "safe";
  }
  if (result.confidence != null && result.confidence < SUSPICIOUS_CONFIDENCE) return "suspicious";
  return phishing ? "phishing" : "safe";
}

export const VERDICT_META = {
  safe: { label: "Safe", color: "#0F9D6B", text: "text-safe", soft: "bg-safe/10 text-safe border-safe/30" },
  suspicious: { label: "Suspicious", color: "#C77A00", text: "text-warn", soft: "bg-warn/10 text-warn border-warn/30" },
  phishing: { label: "Phishing", color: "#D64045", text: "text-danger", soft: "bg-danger/10 text-danger border-danger/30" },
};

// Plain-language reading of the structural features the backend returns.
// These are rule-of-thumb indicators, not learned model weights.
export const FEATURE_INFO = [
  { key: "url_length", label: "URL length", flag: (f) => f.url_length > 75, note: "Long URLs often hide the real destination." },
  { key: "dots", label: "Dots", flag: (f) => f.dots > 4, note: "Many dots usually mean stacked subdomains." },
  { key: "digits", label: "Digits", flag: (f) => f.digits > 8, note: "Heavy digit use is common in generated hosts." },
  { key: "subdomains", label: "Subdomains", flag: (f) => f.subdomains >= 2, note: "Brand names placed in subdomains imitate trusted sites." },
  { key: "https", label: "HTTPS typed", flag: (f) => !f.https, note: "No https:// in the URL as entered. Phishing sites can use HTTPS too." },
  { key: "has_ip", label: "IP address as host", flag: (f) => !!f.has_ip, note: "Legitimate services rarely use a raw IP." },
  { key: "has_at", label: "'@' symbol", flag: (f) => !!f.has_at, note: "Text before '@' is ignored by browsers and can mislead." },
  { key: "hyphens", label: "Hyphens", flag: (f) => f.hyphens >= 3, note: "Hyphenated look-alike domains are common." },
  { key: "special_chars", label: "Special characters", flag: (f) => f.special_chars > 6, note: "Unusual symbols can be used to obfuscate." },
  { key: "keyword_count", label: "Phishing keywords", flag: (f) => f.keyword_count >= 2, note: "Words like login, verify, secure, account, bank." },
  { key: "path_length", label: "Path length", flag: (f) => f.path_length > 40, note: "Long paths can bury lures and tracking tokens." },
];
