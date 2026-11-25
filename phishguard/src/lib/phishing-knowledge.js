// Reference content for the AI Explainability page: common phishing types and the techniques behind them.

export const PHISHING_TYPES = [
  {
    id: "credential",
    name: "Credential harvesting",
    overview: "The attacker copies a real sign-in page and sends the link by email, SMS or chat. Anything typed into the fake form goes straight to the attacker.",
    techniques: ["Cloned login page with a working-looking form", "Messages that ask the victim to verify or restore access", "Links that use words such as login, verify, secure or update"],
    characteristics: [
      "The page is a visual copy of a real login screen.",
      "No file is downloaded, so nothing looks harmful.",
      "Stolen credentials are reused quickly on the real service and on other sites.",
    ],
    goal: "Steal usernames, passwords and recovery or session codes.",
  },
  {
    id: "brand",
    name: "Brand impersonation and look-alike domains",
    overview: "The attacker registers a domain that contains a well-known brand name, or a near-miss spelling of it, so the link looks official at a glance.",
    techniques: ["Brand name placed in a subdomain or joined to extra words with hyphens", "Typosquatting: swapped, missing or doubled letters", "Digit-for-letter substitutions such as 0 for o or 1 for l"],
    characteristics: [
      "The domain owner is not the brand, even though the name suggests it.",
      "Logos, colours and wording are copied from the genuine site.",
      "Often combined with credential harvesting or payment fraud.",
    ],
    goal: "Borrow the brand's trust so victims drop their guard and hand over data or money.",
  },
  {
    id: "financial",
    name: "Banking and payment fraud (KYC and OTP scams)",
    overview: "The URL poses as a bank, wallet or payment service and pushes the victim to complete KYC, confirm a payment or enter a one-time password.",
    techniques: ["Fake net-banking and UPI pages", "Warnings that an account will be blocked unless details are updated", "Real-time relay of card details and OTPs to the attacker"],
    characteristics: [
      "Uses banking vocabulary such as kyc, otp, upi, wallet, card or netbanking.",
      "Collects card numbers, PINs and one-time passwords.",
      "The attacker often uses the OTP immediately to authorise a transfer.",
    ],
    goal: "Take over bank or wallet accounts and move money before the victim notices.",
  },
  {
    id: "prize",
    name: "Prize, reward and free-offer scams",
    overview: "The URL advertises something too good to be true, such as a free gift, bonus or lottery win, and uses it as bait to collect personal data, fees or card details.",
    techniques: ["Fake surveys, giveaways and lottery notices", "Countdown timers and limited-stock banners", "Small 'shipping fee' or 'processing fee' payments"],
    characteristics: [
      "Words like free, bonus, winner, reward or claim in the address.",
      "Victims are asked for personal details or card numbers to receive the prize.",
      "Links spread widely through social media, messaging groups and SMS.",
    ],
    goal: "Collect personal data and small payments, or lead victims on to further scams.",
  },
  {
    id: "urgency",
    name: "Account suspension and urgency scams",
    overview: "The attacker warns that an account is locked, limited or about to expire, then links to a fake page where the victim is told to act immediately.",
    techniques: ["Threats of account closure, fees or legal action within hours", "Fake security alerts and unusual-activity notices", "Time pressure that discourages checking the message"],
    characteristics: [
      "Urgent words such as suspended, locked, expired or alert appear in the URL or message.",
      "The linked page asks for sign-in or payment details to resolve the problem.",
      "Panic is the main tool: victims skip the checks they would normally make.",
    ],
    goal: "Rush the victim into entering credentials or payment data without thinking.",
  },
  {
    id: "ipHost",
    name: "IP-address hosted phishing",
    overview: "Instead of a registered domain name, the link points at a raw IP address, usually a compromised or temporary server that hosts a fake page.",
    techniques: ["Fake pages uploaded to compromised servers", "Long paths that mimic a real service's folders", "Short-lived hosts abandoned once reported"],
    characteristics: [
      "The host is four numbers separated by dots.",
      "Nothing ties the page to the organisation it imitates.",
      "Quick to set up and quick to abandon, which makes blocking harder.",
    ],
    goal: "Avoid domain registration and tracking while serving a fake page.",
  },
  {
    id: "obfuscation",
    name: "URL obfuscation and deception",
    overview: "The link is structured to hide its real destination, using tricks such as '@' symbols, long chains of subdomains, encoded characters or look-alike characters.",
    techniques: ["'@' trick: text before '@' is ignored by browsers", "Stacked subdomains that push the real domain out of sight", "Percent-encoding and punycode (xn--) homograph domains"],
    characteristics: [
      "Many dots, hyphens or digits in the hostname.",
      "Very long URLs bury the telling part beyond the visible address bar.",
      "Unusual characters that resemble normal letters.",
    ],
    goal: "Make a malicious address look harmless long enough for the click.",
  },
  {
    id: "infrastructure",
    name: "Low-reputation hosting and disposable domains",
    overview: "The page is served from a free hosting service, a URL shortener or a cheap top-level domain that attackers favour because it is easy to register and discard.",
    techniques: ["Cheap or free top-level domains such as .tk, .xyz or .top", "Free site builders and static hosts", "Shortened links that hide the destination"],
    characteristics: [
      "Campaigns are rotated across many domains once one is reported.",
      "Anyone can publish a page in minutes on a free host.",
      "A trusted-looking name on a free host proves nothing about who runs the page.",
    ],
    goal: "Host phishing pages cheaply and move on quickly when blocked.",
  },
  {
    id: "malware",
    name: "Malicious download lures",
    overview: "The link leads to a file such as an installer, archive or script, usually disguised as an invoice, update or document.",
    techniques: ["Fake software updates and 'required' installers", "Invoices and documents delivered as archives or macros", "Executable files with misleading names"],
    characteristics: [
      "The path ends in an executable or archive extension such as .exe, .apk, .zip or .scr.",
      "The file is presented as routine so opening it feels safe.",
      "Running it can install spyware, ransomware or credential stealers.",
    ],
    goal: "Get malware onto the victim's device.",
  },
];

export const ATTACK_TECHNIQUES = [
  { name: "Typosquatting", how: "Registering a domain that is one typo away from a real one.", example: "paypa1-support.example.com" },
  { name: "Subdomain stacking", how: "Putting a trusted name in a subdomain so it appears first, while the real domain sits at the end.", example: "login.bank-name.secure-check.example.com" },
  { name: "'@' symbol trick", how: "Browsers ignore everything before '@', so a trusted-looking name can hide the true host.", example: "https://bank-name.com@203.0.113.9/login" },
  { name: "Homograph (punycode) domains", how: "Using look-alike characters from other alphabets, which browsers encode as xn--.", example: "xn--pypal-4ve.example.com" },
  { name: "Hyphenated brand domains", how: "Joining a brand name to action words with hyphens to look official.", example: "brand-account-verify.example.com" },
  { name: "URL shortening", how: "Hiding the final destination behind a short link.", example: "short.example/AbC123" },
  { name: "IP-address links", how: "Pointing straight at a server address to skip domain registration.", example: "http://203.0.113.9/secure/login.php" },
  { name: "Urgency and social engineering", how: "Creating fear or excitement so the victim clicks before thinking.", example: "Your account will be closed in 24 hours" },
  { name: "HTTPS misuse", how: "Obtaining a free certificate so the padlock appears. HTTPS shows the connection is encrypted, not that the site is honest.", example: "https://secure-login.example.com" },
];
