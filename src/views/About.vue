<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-white">About Biatec Algorand Scan</h1>
    <p class="text-gray-300 text-sm leading-relaxed">
      Biatec Algorand Scan is a real-time explorer focused on decentralized
      exchange (DEX) activity on the Algorand blockchain. It streams live
      blocks, trades, liquidity events, pools, aggregated pool statistics and
      asset metadata via a high-performance SignalR hub, backed by Elasticsearch
      indexing and protocol-aware enrichment (Pact, Tiny, Biatec AMMs).
    </p>
    <p class="text-gray-300 text-sm leading-relaxed">
      Biatec Scan is run by Scholtz & Company, jsa. IČO: 51882272. The project
      is open source.
    </p>
    <p class="text-gray-300 text-sm leading-relaxed">
      DISCLAIMER: This project is not affiliated with Algorand, Inc. or the
      Algorand Foundation. It is an independent initiative developed to enhance
      transparency and accessibility of DEX activities on the Algorand
      blockchain. Project is provided "as is" without any warranties. Use at
      your own risk.
    </p>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">Data Sources</h2>
        <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
          <li>Algod block ingestion (multi-endpoint failover)</li>
          <li>Live gossip websocket integration (optional)</li>
          <li>Protocol processors: Pact, Tiny, Biatec</li>
          <li>Elasticsearch for fast querying & aggregation</li>
        </ul>
      </div>
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">Realtime Features</h2>
        <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
          <li>
            Charts by
            <a
              href="https://www.tradingview.com"
              target="_blank"
              rel="noreferrer"
              class="underline"
              >TradingView</a
            >.
          </li>
          <li>Streaming trades & liquidity updates</li>
          <li>Incremental pool & aggregated pool updates</li>
          <li>Dynamic asset metadata + price & TVL signals</li>
          <li>Custom subscription filtering (protocol / asset / state)</li>
        </ul>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">Architecture Overview</h2>
      <p class="text-gray-300 text-sm leading-relaxed">
        The backend is an ASP.NET Core (.NET 8) Web API with SignalR for
        websocket distribution. Background services process blocks, detect DEX
        events, enrich and normalize pools, then index them. Redis (optional)
        accelerates asset & pool metadata caching. The frontend (this site) is
        built with Vite, Vue 3, TypeScript and Tailwind.
      </p>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">Limitations & Notes</h2>
      <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
        <li>
          Price feeds derive from aggregated pool virtual reserves (subject to
          AMM math and pool health).
        </li>
        <li>
          Recently created or illiquid pools may lack enrichment until activity
          occurs.
        </li>
        <li>
          Some assets may display delayed metadata if Algod rate limits are hit.
        </li>
      </ul>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">Repos</h2>
      <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
        <li>
          <a
            href="https://github.com/scholtz/biatec-scan-web"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >Frontend</a
          >
        </li>
        <li>
          <a
            href="https://github.com/scholtz/AVMTradeReporter"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >Backend</a
          >
        </li>
      </ul>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">Contact & Contributions</h2>
      <p class="text-gray-300 text-sm leading-relaxed">
        Feedback, issues or feature ideas are welcome. Feel free to open
        discussions or pull requests in the related repositories, or reach out
        at the
        <a
          href="https://discord.gg/GVhvQFfRDn"
          target="_blank"
          rel="noreferrer"
          class="underline"
          >Discord</a
        >.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Static informational page – no script logic required for now.
</script>

<style scoped></style>
