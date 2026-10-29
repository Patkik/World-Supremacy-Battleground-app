export const SAMPLE_EVENT = {
  id: "demo", slug: "manila-session", title: "Manila Session", chapter: "Philippines",
  date: "18 JUL 2027", dateLong: "18 July 2027", venue: "Sample venue · Manila", timezone: "Asia/Manila",
  crew: "Afterhours Collective", division: "Open crew", feeMinor: 150000, currency: "PHP",
};
export const SAMPLE_DANCERS = [
  { id: "sample-1", name: "Alex Rivera", duty: "Crew manager", ready: true },
  { id: "sample-2", name: "Sam Cruz", duty: "Dancer", ready: true },
  { id: "sample-3", name: "Jamie Santos", duty: "Dancer", ready: true },
  { id: "sample-4", name: "Morgan Reyes", duty: "Dancer", ready: false },
];
export const PREVIEW_KEY = "wsb-preview-entry-v1";
export const DRAFT_KEY = "wsb-preview-registration-v1";
export function peso(minor: number) {
  return new Intl.NumberFormat("en-PH", {style:"currency",currency:"PHP",maximumFractionDigits:0}).format(minor/100);
}
