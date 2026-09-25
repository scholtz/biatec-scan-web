<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <router-link
          :to="{ name: 'AssetDetails', params: { assetId } }"
          class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          &larr; {{ $t("activeHolders.backToAsset", { name: assetName }) }}
        </router-link>
        <h1 class="text-3xl font-bold mt-2">
          {{ $t("activeHolders.title", { name: assetName }) }}
        </h1>
      </div>

      <div v-if="assetId === '0'" class="card text-center py-12">
        <p class="text-amber-400">
          {{ $t("activeHolders.notAvailableForNative") }}
        </p>
      </div>

      <template v-else>
        <!-- Loading State -->
        <div
          v-if="(loading || !assetInfoAttempted) && rows.length === 0"
          class="text-center py-12"
        >
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-400">{{ $t("activeHolders.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-400 mb-4">{{ error }}</p>
          <button
            @click="retry"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            {{ $t("activeHolders.retry") }}
          </button>
        </div>

        <div v-else class="card">
          <div
            v-if="rows.length === 0"
            class="text-center py-12 text-gray-400"
          >
            {{ $t("activeHolders.noHolders") }}
          </div>

          <template v-else>
            <div
              class="hidden md:grid grid-cols-3 gap-3 px-2 text-xs text-gray-400 mb-2"
            >
              <div class="min-w-0">{{ $t("activeHolders.address") }}</div>
              <div class="min-w-0 text-right">
                {{ $t("activeHolders.balance") }}
              </div>
              <div class="min-w-0 text-right">
                {{ $t("activeHolders.usdValue") }}
              </div>
            </div>

            <div class="space-y-1">
              <div
                v-for="(row, index) in rows"
                :key="row.address"
                class="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 items-center p-2 rounded"
                :class="index % 2 === 1 ? 'bg-gray-800/20' : 'bg-gray-800/40'"
              >
                <div class="min-w-0">
                  <router-link
                    :to="{
                      name: 'AddressDetails',
                      params: { address: row.address },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono text-sm truncate block"
                  >
                    {{ formatAddress(row.address) }}
                  </router-link>
                </div>
                <div class="min-w-0 text-left md:text-right text-sm text-gray-100">
                  {{ formatBalance(row.amount) }}
                </div>
                <div class="min-w-0 text-left md:text-right text-sm text-gray-100">
                  <FormattedNumber
                    :value="row.usdValue"
                    type="currency"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
              </div>
            </div>
          </template>

          <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              class="btn-secondary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="tokenStack.length === 0 || loading"
              @click="goPrev"
            >
              {{ $t("common.prev") }}
            </button>
            <span class="text-sm text-gray-400">{{
              $t("activeHolders.page", { page: pageNumber })
            }}</span>
            <button
              type="button"
              class="btn-secondary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!nextTokenValue || loading"
              @click="goNext"
            >
              {{ $t("common.next") }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import { getAVMTradeReporterAPI } from "../api";
import FormattedNumber from "../components/FormattedNumber.vue";

const route = useRoute();
const api = getAVMTradeReporterAPI();
const { t } = useI18n();

const PAGE_SIZE = 50;

const assetId = computed(() => (route.params.assetId as string) ?? "0");

interface RawHolder {
  address: string;
  amount: bigint;
}

const forceUpdate = ref(0);
const loading = ref(false);
const error = ref("");
const priceUSD = ref<number | null>(null);
const rawBalances = ref<RawHolder[]>([]);
const tokenStack = ref<Array<string | undefined>>([]);
const currentToken = ref<string | undefined>(undefined);
const nextTokenValue = ref<string | undefined>(undefined);

// Bumped on every reload()/goNext()/goPrev() so a slow, superseded fetch
// (e.g. switching assetId while a request is in flight) can detect it's
// stale and discard its result instead of overwriting newer state.
let requestSeq = 0;

const pageNumber = computed(() => tokenStack.value.length + 1);

// True once the asset-metadata lookup for the *current* assetId has settled
// (found or not) — decimals default to 0 until then, which would otherwise
// briefly render holder balances/USD values off by 10^realDecimals if the
// indexer fetch resolves before this one (e.g. a direct/bookmarked link to a
// not-yet-cached asset's holders page).
const assetInfoAttempted = ref(false);

function parseAssetId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    // Malformed route param (e.g. a non-numeric assetId) — treat as unknown
    // rather than letting BigInt's SyntaxError blow up a template render.
    return null;
  }
}

const assetInfo = computed(() => {
  void forceUpdate.value;
  const id = parseAssetId(assetId.value || "0");
  return id === null ? null : assetService.getAssetInfo(id);
});

const assetName = computed(
  () =>
    assetInfo.value?.name ||
    assetInfo.value?.unitName ||
    `Asset ${assetId.value}`,
);

const decimals = computed(() => assetInfo.value?.decimals ?? 0);

const rows = computed(() => {
  if (!assetInfoAttempted.value) return [];

  const d = decimals.value;
  const price = priceUSD.value;
  return rawBalances.value.map((b) => {
    // Number(bigint) loses precision above 2^53, which matters for a
    // low-decimal ASA with a very large supply — fine for the inherently
    // approximate USD estimate (price itself is a float), but the balance
    // column itself is formatted from the raw bigint below to stay exact.
    const approxBalance = Number(b.amount) / Math.pow(10, d);
    return {
      address: b.address,
      amount: b.amount,
      usdValue: price != null ? approxBalance * price : null,
    };
  });
});

function ensureAssetLoaded() {
  assetInfoAttempted.value = false;

  // Native asset 0 is never cached as an ASA and this id renders the
  // "not available for native token" branch only, so loading it would just
  // be a wasted algod request.
  const id = assetId.value === "0" ? null : parseAssetId(assetId.value);
  if (id === null) {
    assetInfoAttempted.value = true;
    return;
  }

  // requestAsset's own queue is throttled (MIN_LOAD_INTERVAL), so a request
  // queued for a previous assetId can still be in flight and resolve after
  // the user has already navigated to a different asset. Only let the
  // callback mark completion for the asset it was actually requested for.
  const requestedFor = assetId.value;
  assetService.requestAsset(id, () => {
    forceUpdate.value++;
    if (assetId.value === requestedFor) {
      assetInfoAttempted.value = true;
    }
  });
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Not assetService.formatAssetBalance(): that helper caps precision at the
// Intl default of 3 fraction digits (truncating >3-decimal ASA balances to
// "0") and returns the hardcoded, untranslated literal "Loading..." when the
// asset isn't cached yet. Formats straight from the raw bigint (integer
// division, not Number(amount)/10^d) so balances above 2^53 base units
// still render exactly instead of being silently rounded.
function formatBalance(amount: bigint): string {
  const d = decimals.value;
  const base = 10n ** BigInt(d);
  const whole = amount / base;
  const wholeStr = whole.toLocaleString();
  let formatted = wholeStr;
  if (d > 0) {
    const fraction = (amount % base).toString().padStart(d, "0").replace(/0+$/, "");
    if (fraction) formatted = `${wholeStr}.${fraction}`;
  }
  const unit = assetInfo.value?.unitName || assetInfo.value?.name || "";
  return unit ? `${formatted} ${unit}` : formatted;
}

async function loadPrice(seq: number) {
  if (assetId.value === "0") return;

  try {
    const response = await api.getApiAsset({ ids: assetId.value, size: 1 });
    if (seq !== requestSeq) return;
    priceUSD.value = response.data?.[0]?.priceUSD ?? null;
  } catch (err) {
    if (seq !== requestSeq) return;
    console.error("Error loading asset price:", err);
    priceUSD.value = null;
  }
}

async function loadHolders(seq: number, token?: string) {
  if (assetId.value === "0") {
    // Authoritative for the current request even if an older, now-stale
    // fetch for a real asset is still in flight (its own finally() is
    // skipped by the seq check below, so it would otherwise leave the
    // spinner on forever).
    if (seq === requestSeq) loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // Indexer, not algod: algod has no "list every holder of an asset"
    // endpoint (it only answers per-account queries), so this is the same
    // kind of indexer-only lookup as the existing tx-by-id case — a listing
    // that genuinely doesn't exist on algod, not a preference over it.
    const indexer = algorandService.getIndexerClient();
    let request = indexer
      .lookupAssetBalances(BigInt(assetId.value))
      .currencyGreaterThan(0)
      .limit(PAGE_SIZE);
    if (token) {
      request = request.nextToken(token);
    }
    const response = await request.do();
    if (seq !== requestSeq) return;
    rawBalances.value = (response.balances ?? []).map((b) => ({
      address: b.address,
      amount: b.amount,
    }));
    nextTokenValue.value = response.nextToken;
  } catch (err: unknown) {
    if (seq !== requestSeq) return;
    error.value = err instanceof Error ? err.message : t("activeHolders.error");
    rawBalances.value = [];
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

async function goNext() {
  if (!nextTokenValue.value) return;
  tokenStack.value.push(currentToken.value);
  currentToken.value = nextTokenValue.value;
  const seq = ++requestSeq;
  await loadHolders(seq, currentToken.value);
}

async function goPrev() {
  if (tokenStack.value.length === 0) return;
  currentToken.value = tokenStack.value.pop();
  const seq = ++requestSeq;
  await loadHolders(seq, currentToken.value);
}

// Re-fetches the current page after a failed request, without losing the
// user's place — unlike reload(), which is only for a fresh asset/mount and
// intentionally resets back to page 1.
async function retry() {
  const seq = ++requestSeq;
  await Promise.all([loadPrice(seq), loadHolders(seq, currentToken.value)]);
}

async function reload() {
  tokenStack.value = [];
  currentToken.value = undefined;
  // Drop the previous asset's rows immediately so a reused component
  // instance (assetId changing via the route) never renders one asset's
  // addresses/amounts scaled by another asset's decimals/price while the
  // new fetch is in flight.
  rawBalances.value = [];
  priceUSD.value = null;
  const seq = ++requestSeq;
  await Promise.all([loadPrice(seq), loadHolders(seq)]);
}

onMounted(() => {
  ensureAssetLoaded();
  reload();
});

watch(assetId, () => {
  ensureAssetLoaded();
  reload();
});
</script>

<style scoped></style>
