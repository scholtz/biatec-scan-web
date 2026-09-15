// src/composables/useAmountFormat.ts - Locale-aware display formatting for
// bigint base-unit amounts, following the app's chosen i18n locale (not the
// browser's) so swap figures match FormattedNumber elsewhere on the page.
import { useI18n } from "vue-i18n";
import { baseUnitsToNumber } from "../swap/amounts";

export function useAmountFormat() {
  const { locale } = useI18n();

  function formatAmount(
    amount: bigint,
    decimals: number,
    maxFractionDigits: number = Math.min(decimals, 6)
  ): string {
    return baseUnitsToNumber(amount, decimals).toLocaleString(locale.value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(maxFractionDigits, 20),
    });
  }

  function formatNumber(value: number, maximumSignificantDigits = 6): string {
    return value.toLocaleString(locale.value, { maximumSignificantDigits });
  }

  return { formatAmount, formatNumber };
}
