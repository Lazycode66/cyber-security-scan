export const GUIDES = [
  {
    id: "phishing",
    title: "How to read a link before you tap",
    kicker: "Phishing",
    body: [
      "The only part of a web address that names the company is the domain — the bit just before .com, .in, .gov, and similar. Everything in front of it (login., secure., appleid.) can be invented.",
      "Hover on a computer; press-and-hold on a phone. If the domain is a jumble, a lookalike (paypa1, apple-support-id), or a shortener, do not tap. Open the official app or type the company name yourself.",
      "A padlock only means the connection is encrypted. Scam sites buy certificates too. Encryption does not prove identity.",
    ],
  },
  {
    id: "digital-arrest",
    title: "Digital arrest and fake officials",
    kicker: "Voice & video scams",
    body: [
      "In this scam, someone claiming to be from a cyber cell, CBI, customs, the IRS, or a court keeps you on a video call, shows a forged warrant, and demands money or gift cards to ‘avoid arrest’.",
      "Police do not collect fines in Bitcoin. They do not ask you to stay on the line, install AnyDesk, or keep the call a secret from family. Isolation is the method.",
      "Hang up. Tell someone in the room. Call 1930 in India or your local non-emergency police number from a number you look up — not the one on the screen.",
    ],
  },
  {
    id: "apps",
    title: "Sideloaded apps and greedy permissions",
    kicker: "Malicious apps",
    body: [
      "An APK from WhatsApp, Telegram, or a ‘mod’ site skips the store review. Loan apps, job-task apps, and cracked games are the usual bait.",
      "Accessibility, SMS, device admin, and ‘draw over other apps’ let malware read OTPs and put a fake bank screen on top of the real one. A torch, PDF reader, or cleaner does not need those.",
      "Install money, chat, and government apps only from Google Play or the App Store. If you already sideloaded, uninstall, revoke extra permissions, and change banking passwords from another device.",
    ],
  },
  {
    id: "already",
    title: "If you already tapped, paid, or installed",
    kicker: "After a mistake",
    body: [
      "You are not the first, and you still have moves. Use a different device if you can. The compromised one may still be watched.",
      "Change the password of the account you typed, then email, then banking. Turn on two-factor authentication with an app — not SMS — if offered. Call your bank’s number from the back of the card.",
      "In India report at cybercrime.gov.in or 1930. In the US: reportfraud.ftc.gov and ic3.gov. Tell a person you trust. Shame is part of the scam; talking breaks it.",
    ],
  },
];

export const QUIZ = [
  {
    id: "q1",
    prompt: "Which address is the real PayPal site?",
    options: [
      { id: "a", label: "paypal-login-verification.com", correct: false },
      { id: "b", label: "secure.paypal.com.account-help.net", correct: false },
      { id: "c", label: "paypal.com", correct: true },
      { id: "d", label: "paypal.com.verify-id.xyz", correct: false },
    ],
    why: "Only paypal.com (and a few official PayPal domains) belong to PayPal. Extra words before or after the real name are a costume.",
  },
  {
    id: "q2",
    prompt:
      "A caller says they are from the cyber cell, shows a warrant on video, and tells you not to hang up. What do you do?",
    options: [
      {
        id: "a",
        label: "Stay on the line and pay to clear your name",
        correct: false,
      },
      {
        id: "b",
        label: "Hang up, tell someone, and call a number you look up yourself",
        correct: true,
      },
      {
        id: "c",
        label: "Install AnyDesk so they can show the court portal",
        correct: false,
      },
      {
        id: "d",
        label: "Share an OTP to prove you are cooperating",
        correct: false,
      },
    ],
    why: "Digital arrest scams rely on fear plus isolation. Breaking the call is the whole defence.",
  },
  {
    id: "q3",
    prompt:
      "A loan APK arrives on WhatsApp and asks for SMS and Accessibility permission. What is the safest move?",
    options: [
      {
        id: "a",
        label: "Install it — loans always need those permissions",
        correct: false,
      },
      {
        id: "b",
        label: "Do not install. Use the lender’s listing on Google Play or the App Store, or walk away",
        correct: true,
      },
      {
        id: "c",
        label: "Install, then deny permissions later",
        correct: false,
      },
      {
        id: "d",
        label: "Forward it to a friend who needs money",
        correct: false,
      },
    ],
    why: "SMS plus Accessibility is how stealers lift OTPs. A file on chat is not a store listing.",
  },
  {
    id: "q4",
    prompt:
      "You typed a password on a page that now looks fake. What is the first useful step?",
    options: [
      {
        id: "a",
        label: "Wait and see if money moves",
        correct: false,
      },
      {
        id: "b",
        label: "Change that password from another device, then alert the bank if it was a financial login",
        correct: true,
      },
      {
        id: "c",
        label: "Reply to the message and ask them to delete it",
        correct: false,
      },
      {
        id: "d",
        label: "Post the link so others can check it",
        correct: false,
      },
    ],
    why: "Assume the password is burned. Change it on a device you trust, and treat any OTP SMS that follows as the thief trying to finish the job.",
  },
  {
    id: "q5",
    prompt:
      "A padlock appears next to the address of a site asking you to “re-verify KYC”. What does the padlock actually prove?",
    options: [
      {
        id: "a",
        label: "The site is the real bank",
        correct: false,
      },
      {
        id: "b",
        label: "The connection is encrypted — not that the domain is official",
        correct: true,
      },
      {
        id: "c",
        label: "The page cannot steal a password",
        correct: false,
      },
      {
        id: "d",
        label: "The site passed a government check",
        correct: false,
      },
    ],
    why: "Certificates are cheap. A lock only means the path is encrypted. Read the domain itself.",
  },
];

export const REPORT_CHANNELS = [
  {
    region: "India",
    items: [
      { name: "National Cyber Crime Portal", href: "https://cybercrime.gov.in" },
      { name: "Helpline 1930", href: "tel:1930" },
    ],
  },
  {
    region: "United States",
    items: [
      { name: "FTC ReportFraud", href: "https://reportfraud.ftc.gov" },
      { name: "FBI IC3", href: "https://www.ic3.gov" },
    ],
  },
  {
    region: "Companies",
    items: [
      { name: "Google phishing report", href: "https://safebrowsing.google.com/safebrowsing/report_phish/" },
      { name: "PayPal spoof@paypal.com", href: "mailto:spoof@paypal.com" },
    ],
  },
];
