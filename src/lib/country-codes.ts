// Phone-number country codes for the sign-up form.
// Ordered with Australia first (NDIS is an Australian scheme); New Zealand
// next (common cross-Tasman workers), then a small global selection.
// Add more if specific markets need them.

export type CountryCode = {
  iso: string;       // ISO-3166-1 alpha-2 (e.g. "AU")
  name: string;
  dialCode: string;  // E.164 prefix without "+" (e.g. "61")
  flag: string;      // Emoji flag
};

export const COUNTRY_CODES: CountryCode[] = [
  { iso: "AU", name: "Australia", dialCode: "61", flag: "🇦🇺" },
  { iso: "NZ", name: "New Zealand", dialCode: "64", flag: "🇳🇿" },
  { iso: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dialCode: "1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦" },
  { iso: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪" },
  { iso: "IN", name: "India", dialCode: "91", flag: "🇮🇳" },
  { iso: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭" },
  { iso: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬" },
  { iso: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
];

export const DEFAULT_COUNTRY_ISO = "AU";

export function findCountry(iso: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.iso === iso);
}