// URL-specific analysis for the AI Explainability page.
// Everything here is read from the scanned URL text itself. The verdict still comes from the same
// Logistic Regression model as the Dashboard; this file only explains what is visible in the URL.
// The model scores the words in a URL and does not publish per-indicator weights, so each finding carries
// a strength label (high / medium / low) that says how strongly the pattern is usually tied to phishing.
import { parseHost } from "@/lib/utils";

// Same word list the backend counts (backend/features.py), grouped by the kind of lure they belong to.
const KEYWORD_GROUPS = [
  { id: "credential", label: "sign-in / credential words", words: ["login", "signin", "verify", "update", "secure", "account", "password", "confirm"], edu: "credential",
    why: "Phishing links use these words to look like a routine account step. They push the reader to type credentials." },
  { id: "financial", label: "banking / payment words", words: ["bank", "kyc", "otp", "payment", "wallet"], edu: "financial",
    why: "Banking vocabulary is typical of KYC, OTP and payment-fraud pages that try to collect card details or one-time codes." },
  { id: "reward", label: "prize / free-offer words", words: ["free", "bonus"], edu: "reward",
    why: "Offers of something free are bait in prize and reward scams." },
  { id: "urgency", label: "urgency words", words: ["suspend"], edu: "urgency",
    why: "Threats of suspension create time pressure so the victim acts before checking." },
];

// Official registered domains of frequently impersonated brands.
const BRANDS = [
  { name: "PayPal", key: "paypal", domains: ["paypal.com", "paypal.me"] },
  { name: "Apple", key: "apple", domains: ["apple.com", "icloud.com"] },
  { name: "iCloud", key: "icloud", domains: ["icloud.com", "apple.com"] },
  { name: "Google", key: "google", domains: ["google.com", "gmail.com", "google.co.in", "google.co.uk", "google.de", "google.ca", "google.fr", "googleusercontent.com", "youtube.com"] },
  { name: "Microsoft", key: "microsoft", domains: ["microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com"] },
  { name: "Outlook", key: "outlook", domains: ["outlook.com", "live.com", "office.com", "microsoft.com"] },
  { name: "Amazon", key: "amazon", domains: ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.ca", "amazon.fr", "amazon.it", "amazon.es", "amazon.co.jp", "amazonaws.com"] },
  { name: "Facebook", key: "facebook", domains: ["facebook.com", "fb.com"] },
  { name: "Instagram", key: "instagram", domains: ["instagram.com"] },
  { name: "WhatsApp", key: "whatsapp", domains: ["whatsapp.com", "whatsapp.net"] },
  { name: "Netflix", key: "netflix", domains: ["netflix.com"] },
  { name: "LinkedIn", key: "linkedin", domains: ["linkedin.com"] },
  { name: "Twitter", key: "twitter", domains: ["twitter.com", "x.com"] },
  { name: "Dropbox", key: "dropbox", domains: ["dropbox.com"] },
  { name: "eBay", key: "ebay", domains: ["ebay.com", "ebay.co.uk", "ebay.in", "ebay.de"] },
  { name: "Adobe", key: "adobe", domains: ["adobe.com"] },
  { name: "Steam", key: "steam", domains: ["steampowered.com", "steamcommunity.com"] },
  { name: "Paytm", key: "paytm", domains: ["paytm.com"] },
  { name: "PhonePe", key: "phonepe", domains: ["phonepe.com"] },
  { name: "HDFC Bank", key: "hdfc", domains: ["hdfcbank.com"] },
  { name: "ICICI Bank", key: "icici", domains: ["icicibank.com"] },
  { name: "State Bank of India", key: "sbi", domains: ["sbi.co.in", "onlinesbi.com", "onlinesbi.sbi"] },
  { name: "Chase", key: "chase", domains: ["chase.com"] },
  { name: "Wells Fargo", key: "wellsfargo", domains: ["wellsfargo.com"] },
  { name: "Citibank", key: "citibank", domains: ["citibank.com", "citi.com"] },
  { name: "HSBC", key: "hsbc", domains: ["hsbc.com", "hsbc.co.uk"] },
  { name: "Barclays", key: "barclays", domains: ["barclays.co.uk", "barclays.com"] },
  { name: "DHL", key: "dhl", domains: ["dhl.com", "dhl.de"] },
  { name: "FedEx", key: "fedex", domains: ["fedex.com"] },
  { name: "USPS", key: "usps", domains: ["usps.com"] },
];

const SUSPICIOUS_TLDS = ["tk", "ml", "ga", "cf", "gq", "xyz", "top", "click", "work", "buzz", "icu", "cyou", "cfd", "zip", "mov", "rest", "monster"];
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy"];
const FREE_HOSTS = ["web.app", "firebaseapp.com", "herokuapp.com", "github.io", "netlify.app", "vercel.app", "pages.dev", "workers.dev", "blogspot.com", "weebly.com", "wixsite.com", "000webhostapp.com", "glitch.me", "godaddysites.com", "sites.google.com"];
const EXECUTABLE_EXT = ["exe", "apk", "zip", "rar", "scr", "msi", "bat", "jar", "dmg", "iso", "cmd", "vbs"];
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
// Look-alike digit substitutions; "1" can stand for l or i.
const LOOKALIKE_MAPS = [
  { "0": "o", "1": "l", "3": "e", "5": "s" },
  { "0": "o", "1": "i", "3": "e", "5": "s" },
];
const deLeet = (s, map) => s.replace(/[0135]/g, (c) => map[c]);

/** Education entries: which general phishing type / technique each finding belongs to, plus prevention tips. */
export const EDUCATION = {
  ipHost: { typeId: "ipHost", technique: "IP-address links", tips: [
    "Treat any link whose address is just numbers as untrustworthy, no matter what the page looks like.",
    "Never sign in or pay on a page opened from a raw-IP link; go to the service by typing its name or using a bookmark.",
  ] },
  atTrick: { typeId: "obfuscation", technique: "'@' symbol trick", tips: [
    "Everything before the '@' is ignored by the browser. Read what comes after it to find the real host.",
    "If a link contains '@' in its address part, do not open it.",
  ] },
  punycode: { typeId: "obfuscation", technique: "Homograph (punycode) domains", tips: [
    "A domain that starts a label with 'xn--' uses look-alike characters from another alphabet. Treat it as suspicious.",
    "Reach important sites through bookmarks or a typed address instead of links in messages.",
  ] },
  typosquatting: { typeId: "brand", technique: "Typosquatting", tips: [
    "Read the domain letter by letter. Digits such as 0, 1 and 5 are often used in place of o, l and s.",
    "Open the real site from a bookmark or by typing it yourself.",
    "A password manager will not autofill on a look-alike domain, which is a useful warning sign.",
  ] },
  brandSubdomain: { typeId: "brand", technique: "Subdomain stacking", tips: [
    "The real owner of a link is the domain just before the first '/', read from the right (for example, in login.brand.evil.com the owner is evil.com).",
    "A brand name on the left of the owner's domain proves nothing, because anyone can create subdomains.",
  ] },
  brandDomain: { typeId: "brand", technique: "Hyphenated brand domains", tips: [
    "Official sites rarely join a brand to words like login, secure or support with hyphens in a different domain.",
    "Check the brand's official address from a trusted source before you sign in anywhere.",
    "Turn on two-factor authentication so a stolen password alone is not enough.",
  ] },
  subdomain: { typeId: "obfuscation", technique: "Subdomain stacking", tips: [
    "Find the real domain by reading from the right until the first '/', then ignore the labels to its left.",
    "Be wary of long chains of dotted labels before the real domain.",
  ] },
  hyphens: { typeId: "brand", technique: "Hyphenated brand domains", tips: [
    "Be cautious with domains made of several words joined by hyphens, especially with login, secure or account in them.",
    "Prefer addresses you have saved or typed yourself.",
  ] },
  shortener: { typeId: "infrastructure", technique: "URL shortening", tips: [
    "Use a link-preview or unshorten tool, or hover to expand the link, before opening a short link from someone you do not know.",
    "Do not enter credentials on a page reached through a short link.",
  ] },
  cheapTld: { typeId: "infrastructure", example: "secure-login.example.top", tips: [
    "A cheap or free top-level domain is not proof of fraud, but combined with login or brand words it deserves a second look.",
    "Check who really runs the site before entering any details.",
  ] },
  freeHost: { typeId: "infrastructure", example: "brand-login.example.web.app", tips: [
    "A trusted-looking name on a free host shows nothing about who runs the page. Anyone can publish there.",
    "Sign-in pages for real companies live on the company's own domain.",
  ] },
  download: { typeId: "malware", example: "http://example.com/invoice-2026.zip", tips: [
    "Do not open or run files delivered through links in unexpected messages, especially installers, archives and scripts.",
    "Download software only from the vendor's official site or an official app store.",
  ] },
  longUrl: { typeId: "obfuscation", example: "https://example.com/a/very/long/path/with/many/segments?session=...&ref=...", tips: [
    "Look at the domain first, since long paths can bury the telling part beyond the visible address bar.",
    "If a very long link arrives unexpectedly, go to the site directly instead.",
  ] },
  encoding: { typeId: "obfuscation", example: "example.com/%6C%6F%67%69%6E", tips: [
    "Heavy percent-encoding hides readable words from the eye. Be cautious with links full of %XX codes.",
    "Do not enter sensitive details on a page opened through such a link.",
  ] },
  insecure: { technique: "HTTPS misuse", tips: [
    "Do not enter passwords or payment details on a page that starts with http://.",
    "HTTPS only shows that the connection is encrypted. Check the domain as well.",
  ] },
  credential: { typeId: "credential", tips: [
    "Do not sign in from a link in a message; open the service yourself and sign in there.",
    "Use a password manager and two-factor authentication so a fake page cannot reuse your login.",
  ] },
  financial: { typeId: "financial", tips: [
    "Banks do not ask you to confirm KYC details, card numbers or OTPs through links. Call or visit the bank using a number you already trust.",
    "Never share an OTP with anyone, including a page that asks for it.",
  ] },
  reward: { typeId: "prize", tips: [
    "If an offer sounds too good to be true, assume it is a scam, especially if it asks for a fee or card details.",
    "Do not forward such links; report them.",
  ] },
  urgency: { typeId: "urgency", tips: [
    "Pause when a message threatens suspension or a deadline. Go to the service directly to check your account.",
    "Real providers rarely require you to sign in through a link under time pressure.",
  ] },
};

function registeredDomain(host) {
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];
  return tld.length === 2 && SECOND_LEVEL.has(sld) ? labels.slice(-3).join(".") : labels.slice(-2).join(".");
}

const endsWithDomain = (host, d) => host === d || host.endsWith(`.${d}`);

/**
 * Analyse the scanned URL. `features` is the structural data the backend already returns with the prediction.
 * Returns { host, registered, findings, clear } where findings are the indicators actually detected in this URL
 * and clear lists the checks that found nothing.
 */
export function analyzeUrl(url, features = {}) {
  const raw = String(url).trim();
  const explicitScheme = (raw.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//) || [])[1]?.toLowerCase() ?? null;
  const stripped = raw.replace(SCHEME, "").replace(/^www\./i, "");
  const lower = stripped.toLowerCase();
  const host = parseHost(raw);
  const authority = stripped.split(/[/?#]/)[0];
  const rest = stripped.slice(authority.length);
  const path = rest.split(/[?#]/)[0];
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  const labels = host.split(".").filter(Boolean);
  const registered = isIp ? host : registeredDomain(host);
  const regLabels = registered.split(".").length;
  const subLabels = isIp ? [] : labels.slice(0, Math.max(labels.length - regLabels, 0));
  const tld = labels[labels.length - 1] ?? "";

  const findings = [];
  const clear = [];
  const add = (f) => findings.push(f);
  const check = (label, hit) => { if (!hit) clear.push(label); };

  // 1. IP address as host
  check("IP address as host", isIp);
  if (isIp) add({
    id: "ip", severity: "high", edu: "ipHost", title: "IP address used instead of a domain name", evidence: [host],
    why: "Legitimate services almost always use a registered domain. A raw IP usually means a temporary or compromised server, which is a strong phishing signal.",
  });

  // 2. '@' symbol
  const at = raw.includes("@");
  check("'@' symbol", at);
  if (at) {
    const inAuthority = authority.includes("@");
    const before = authority.slice(0, authority.lastIndexOf("@"));
    add(inAuthority
      ? { id: "at", severity: "high", edu: "atTrick", title: "'@' symbol in the address", evidence: [`“${before}” is ignored; the browser actually opens “${host}”`],
          why: "Browsers discard the text before '@', so a trusted-looking name can hide the real destination. This is a deliberate disguise." }
      : { id: "at", severity: "low", edu: "atTrick", title: "'@' symbol after the domain", evidence: ["'@' appears in the path or query"],
          why: "An '@' outside the domain part does not change the destination, but it is unusual and sometimes used to confuse readers." });
  }

  // 3. Punycode
  const puny = labels.some((l) => l.startsWith("xn--"));
  check("Punycode (xn--) characters", puny);
  if (puny) add({
    id: "puny", severity: "high", edu: "punycode", title: "Punycode (xn--) look-alike characters in the domain", evidence: labels.filter((l) => l.startsWith("xn--")),
    why: "Punycode is how look-alike letters from other alphabets are written. Attackers use it to imitate real brand names.",
  });

  // 4. Brand impersonation (brand name on a domain the brand does not own)
  let brandHit = null;
  if (!isIp) {
    for (const b of BRANDS) {
      if (b.domains.some((d) => endsWithDomain(host, d))) continue; // genuinely the brand's own domain
      const tokens = labels.flatMap((l, idx) => l.split("-").map((t) => ({ t, idx })));
      for (const { t, idx } of tokens) {
        const variants = [t, ...LOOKALIKE_MAPS.map((m) => deLeet(t, m))];
        const match = (v) => (b.key.length >= 6 ? v.includes(b.key) : v === b.key);
        const exact = match(t);
        const lookalike = !exact && variants.slice(1).some(match);
        if (exact || lookalike) {
          const inSub = idx < labels.length - regLabels;
          brandHit = { b, token: t, exact, lookalike, inSub };
          break;
        }
      }
      if (brandHit) break;
    }
  }
  check("Brand impersonation", brandHit);
  if (brandHit) {
    const { b, token, lookalike, inSub } = brandHit;
    const edu = lookalike ? "typosquatting" : inSub ? "brandSubdomain" : "brandDomain";
    const where = lookalike ? `look-alike spelling “${token}”` : inSub ? `${b.name} placed in a subdomain` : `${b.name} joined to other words in the domain name`;
    add({
      id: "brand", severity: "high", edu, title: `${b.name} name used on a domain that is not ${b.name}'s`,
      evidence: [`${where}`, `registered domain is “${registered}”; ${b.name}'s real domain is “${b.domains[0]}”`],
      why: `The URL borrows ${b.name}'s name so it looks official, but the domain that actually controls the page (${registered}) is not ${b.name}'s. This is the core trick of brand-impersonation phishing.`,
    });
  }

  // 5. Stacked subdomains
  const stacked = subLabels.length >= 2;
  check("Stacked subdomains", stacked);
  if (stacked) add({
    id: "subdomains", severity: "medium", edu: "subdomain", title: `${subLabels.length} stacked subdomains`, evidence: [`${subLabels.join(".")}.${registered}`],
    why: "Long chains of labels push the real domain to the far right where it is easy to miss. Phishing hosts often place trusted-sounding words on the left.",
  });

  // 6. Hyphens in the host
  const hostHyphens = labels.filter((l) => !l.startsWith("xn--")).join(".").split("-").length - 1;
  const hyphenated = hostHyphens >= 2;
  check("Many hyphens in the domain", hyphenated);
  if (hyphenated) add({
    id: "hyphens", severity: hostHyphens >= 3 ? "medium" : "low", edu: "hyphens", title: `${hostHyphens} hyphens in the domain name`, evidence: [host],
    why: "Look-alike domains often join several words with hyphens (for example brand-secure-login) to appear official.",
  });

  // 7. Digits in host
  const hostDigits = isIp ? 0 : (host.match(/\d/g) || []).length;
  const digitsHeavy = hostDigits >= 4;
  check("Many digits in the domain", digitsHeavy);
  if (digitsHeavy) add({
    id: "digits", severity: "low", edu: "typosquatting", title: `${hostDigits} digits in the domain name`, evidence: [host],
    why: "Machine-generated hosts and digit-for-letter swaps both put numbers in domain names. On its own this is a weak signal.",
  });

  // 8. Cheap / free top-level domain, free hosting, shorteners
  const cheap = !isIp && SUSPICIOUS_TLDS.includes(tld);
  check("Low-reputation top-level domain", cheap);
  if (cheap) add({
    id: "tld", severity: "medium", edu: "cheapTld", title: `Low-reputation top-level domain “.${tld}”`, evidence: [host],
    why: `“.${tld}” domains are cheap or free to register and are over-represented in phishing campaigns, so the model's training data links them with higher risk.`,
  });
  const short = SHORTENERS.find((d) => endsWithDomain(host, d));
  check("URL shortener", short);
  if (short) add({
    id: "short", severity: "medium", edu: "shortener", title: "Shortened link hides the final destination", evidence: [short],
    why: "A short link tells you nothing about where it leads. Attackers use them to hide a phishing address.",
  });
  const free = FREE_HOSTS.find((d) => endsWithDomain(host, d) && host !== d);
  check("Free hosting service", free);
  if (free) add({
    id: "freehost", severity: "medium", edu: "freeHost", title: "Page hosted on a free hosting service", evidence: [`hosted under “${free}”`],
    why: "Anyone can publish a page on a free host in minutes, so attackers use them for short-lived phishing pages.",
  });

  // 9. Executable / archive download
  const ext = (path.match(/\.([a-zA-Z0-9]{2,5})$/) || [])[1]?.toLowerCase();
  const download = ext && EXECUTABLE_EXT.includes(ext);
  check("Executable or archive download", download);
  if (download) add({
    id: "download", severity: "high", edu: "download", title: `Link points to a “.${ext}” file`, evidence: [path],
    why: "Links that lead straight to an installer, archive or script are a common way of delivering malware rather than a web page.",
  });

  // 10. Length
  const length = features.url_length ?? stripped.length;
  const pathLen = features.path_length ?? path.length;
  const long = length > 75 || pathLen > 40;
  check("Excessive length", long);
  if (long) add({
    id: "long", severity: length > 120 ? "medium" : "low", edu: "longUrl", title: "Unusually long URL",
    evidence: [`${length} characters in total${pathLen > 40 ? `, ${pathLen} in the path` : ""}`],
    why: "Long URLs can bury the telling part past the visible address bar and hide tracking tokens or lures. Many legitimate links are long too, so this is a weak signal alone.",
  });

  // 11. Percent-encoding
  const encoded = (lower.match(/%[0-9a-f]{2}/g) || []).length;
  const heavilyEncoded = encoded >= 3;
  check("Heavy percent-encoding", heavilyEncoded);
  if (heavilyEncoded) add({
    id: "encoding", severity: "low", edu: "encoding", title: `${encoded} percent-encoded characters`, evidence: [`${encoded} × %XX sequences`],
    why: "Encoding letters as %XX codes hides readable words from the reader and from simple filters.",
  });

  // 12. Plain http:// typed
  const insecure = explicitScheme === "http";
  check("Plain HTTP typed", insecure);
  if (insecure) add({
    id: "http", severity: "low", edu: "insecure", title: "Address uses http:// (no encryption)", evidence: ["http://"],
    why: "Legitimate sign-in pages use HTTPS. A missing padlock is a weak signal, since phishing sites can use HTTPS as well.",
  });

  // 13. Keyword groups (same word list the backend counts)
  const foundWords = KEYWORD_GROUPS.map((g) => ({ g, hits: g.words.filter((w) => lower.includes(w)) })).filter((x) => x.hits.length);
  const totalWords = foundWords.reduce((n, x) => n + x.hits.length, 0);
  check("Phishing-style keywords", foundWords.length);
  for (const { g, hits } of foundWords) {
    const where = hits.map((w) => `${w} (${host.includes(w) ? "domain" : "path"})`);
    add({
      id: `kw-${g.id}`, severity: hits.length >= 2 || totalWords >= 3 ? "medium" : "low", edu: g.edu,
      title: `${g.label[0].toUpperCase()}${g.label.slice(1)} in the URL`, evidence: where, why: g.why,
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return { host, registered, findings, clear };
}

/** Plain-language account of the result, tying the model verdict to the indicators actually found. */
export function explainVerdict({ verdict, confidence }, findings) {
  const n = findings.length;
  const strong = findings.filter((f) => f.severity !== "low").length;
  const conf = confidence != null ? `${(confidence * 100).toFixed(1)}%` : null;
  const names = findings.slice(0, 3).map((f) => f.title).join("; ");

  if (verdict === "phishing") {
    return n
      ? `The model classified this URL as phishing${conf ? ` with ${conf} confidence` : ""}. ${n} pattern${n > 1 ? "s" : ""} typical of phishing ${n > 1 ? "were" : "was"} found in the address itself, including: ${names}. Together with the words in the URL, these make it resemble known phishing links.`
      : `The model classified this URL as phishing${conf ? ` with ${conf} confidence` : ""}. No single structural red flag (such as an IP host or '@' trick) was found, so the decision comes from the combination of words and fragments in the URL, which resemble those in known phishing links.`;
  }
  if (verdict === "suspicious") {
    return `The model's confidence${conf ? ` (${conf})` : ""} is below the 75% needed for a firm verdict, so the URL is marked Suspicious. ${n ? `${n} pattern${n > 1 ? "s" : ""} found in the address ${n > 1 ? "are" : "is"} listed below.` : "No structural red flags were found in the address."} Treat the link with caution.`;
  }
  return n
    ? `The model classified this URL as safe${conf ? ` with ${conf} confidence` : ""}. ${strong ? "Some patterns that are sometimes linked to phishing were found" : "Only weak signals were found"} (${names}), but the words and structure of the URL as a whole look like those of legitimate sites, so they did not outweigh the rest. A Safe result is not a guarantee, so still check the domain before signing in.`
    : `The model classified this URL as safe${conf ? ` with ${conf} confidence` : ""}. None of the phishing patterns checked for were found in the address, and its words and structure resemble those of legitimate sites. A Safe result is not a guarantee, so still check the domain before signing in.`;
}
