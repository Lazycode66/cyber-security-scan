import type { AnalyzePayload, InputKind } from "./types";

export type Sample = {
  id: string;
  kind: InputKind;
  label: string;
  blurb: string;
  payload: AnalyzePayload;
};

export const SAMPLES: Sample[] = [
  {
    id: "paypal-lookalike",
    kind: "link",
    label: "PayPal lookalike",
    blurb: "A verification domain that is not PayPal",
    payload: {
      kind: "link",
      text: "http://paypal-login-verification.com/secure/update?session=1",
    },
  },
  {
    id: "short-link",
    kind: "link",
    label: "Short bank link",
    blurb: "A shortener wrapping a KYC scare",
    payload: {
      kind: "link",
      text: "Your SBI KYC expires in 24 hours. Update now to avoid account freeze: https://bit.ly/sbi-kyc-urgent",
    },
  },
  {
    id: "real-paypal",
    kind: "link",
    label: "Official PayPal",
    blurb: "The real domain, for contrast",
    payload: {
      kind: "link",
      text: "https://www.paypal.com/signin",
    },
  },
  {
    id: "digital-arrest",
    kind: "message",
    label: "Digital arrest",
    blurb: "Fake cyber cell + Bitcoin demand",
    payload: {
      kind: "message",
      text: "This is an official notice from the Cyber Crime Cell. An arrest warrant has been issued in your name for money laundering. Do not disconnect this call. Pay 250000 INR immediately via Bitcoin to avoid digital arrest. Share your OTP to verify identity. Install AnyDesk for video court.",
    },
  },
  {
    id: "parcel-customs",
    kind: "message",
    label: "Parcel fee",
    blurb: "Courier holding a package for a small fee",
    payload: {
      kind: "message",
      text: "DHL: Your parcel is held at customs. Pay the handling fee immediately or it will be returned. Visit http://dhl-customs-payment.xyz/invoice to avoid delay.",
    },
  },
  {
    id: "loan-apk",
    kind: "app",
    label: "Loan APK",
    blurb: "Sideloaded lender with SMS and accessibility",
    payload: {
      kind: "app",
      text: "QuickCash Instant Loan APK sent on WhatsApp. Developer unknown. Claims to approve loans in 5 minutes.",
      app: {
        name: "QuickCash Instant Loan",
        source: "chat",
        permissions: ["sms", "accessibility", "overlay", "contacts"],
        claimedPurpose: "Instant personal loan and KYC",
        developer: "Unknown — sent on WhatsApp",
      },
    },
  },
  {
    id: "torch-store",
    kind: "app",
    label: "Store torch app",
    blurb: "Simple utility from Play Store",
    payload: {
      kind: "app",
      text: "A flashlight from Google Play. Uses only the camera flash.",
      app: {
        name: "Lantern Torch",
        source: "play",
        permissions: [],
        claimedPurpose: "Flashlight",
        developer: "Listed Play publisher",
      },
    },
  },
];

export function getSample(id: string | undefined | null) {
  if (!id) return null;
  return SAMPLES.find((s) => s.id === id) ?? null;
}
