/**
 * Format a number as VND currency
 * @param amount - Amount in VND (integer)
 * @returns Formatted string like "1.780.000"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount))
}

/**
 * Format a number as VND with currency suffix
 * @param amount - Amount in VND
 * @returns Formatted string like "1.780.000 ₫"
 */
export function formatVNDFull(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Math.round(amount))
}

/**
 * Format a compact VND amount (e.g., 1.78M)
 */
export function formatVNDCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`
  }
  return String(amount)
}
