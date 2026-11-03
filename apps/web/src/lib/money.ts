export function currencyMinorDigits(currency: string): number | null {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.trim().toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? null;
  } catch {
    return null;
  }
}

export function formatMinorCurrency(amountMinor: number, currency: string): string {
  const code = currency.trim().toUpperCase();
  const digits = currencyMinorDigits(code);
  if (digits === null || !Number.isSafeInteger(amountMinor)) {
    return `${code || "Currency"} amount unavailable`;
  }
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return formatter.format(amountMinor / 10 ** digits);
}

export function parseMajorCurrencyAmount(value: string, currency: string): number | undefined {
  const input = value.trim();
  if (!input) return undefined;
  const digits = currencyMinorDigits(currency);
  if (digits === null) throw new Error("The chapter currency code is invalid.");

  const pattern = digits === 0
    ? /^(0|[1-9]\d*)$/
    : new RegExp(`^(0|[1-9]\\d*)(?:\\.(\\d{1,${digits}}))?$`);
  const match = input.match(pattern);
  if (!match) {
    throw new Error(digits === 0
      ? "Enter a whole amount for this currency."
      : `Enter an amount with up to ${digits} decimal places, using a decimal point.`);
  }

  const scale = 10n ** BigInt(digits);
  const whole = BigInt(match[1]);
  const fraction = digits === 0 ? 0n : BigInt((match[2] ?? "").padEnd(digits, "0"));
  const minor = whole * scale + fraction;
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Enter a valid positive payment amount.");
  }
  return Number(minor);
}
