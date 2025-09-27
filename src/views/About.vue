<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-white">{{ $t('about.title') }}</h1>
    <p class="text-gray-300 text-sm leading-relaxed">
      {{ $t('about.description') }}
    </p>
    <p class="text-gray-300 text-sm leading-relaxed">
      {{ $t('about.company') }}
    </p>
    <p class="text-gray-300 text-sm leading-relaxed">
      {{ $t('about.disclaimer') }}
    </p>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('about.dataSourcesTitle') }}</h2>
        <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
          <li>{{ $t('about.dataSource1') }}</li>
          <li>{{ $t('about.dataSource2') }}</li>
          <li>{{ $t('about.dataSource3') }}</li>
          <li>{{ $t('about.dataSource4') }}</li>
        </ul>
      </div>
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('about.realtimeFeaturesTitle') }}</h2>
        <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
          <li>
            {{ $t('about.realtimeFeature1') }}
            <a
              href="https://www.tradingview.com"
              target="_blank"
              rel="noreferrer"
              class="underline"
              >TradingView</a
            >.
          </li>
          <li>{{ $t('about.realtimeFeature2') }}</li>
          <li>{{ $t('about.realtimeFeature3') }}</li>
          <li>{{ $t('about.realtimeFeature4') }}</li>
          <li>{{ $t('about.realtimeFeature5') }}</li>
        </ul>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">{{ $t('about.architectureTitle') }}</h2>
      <p class="text-gray-300 text-sm leading-relaxed">
        {{ $t('about.architectureDescription') }}
      </p>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">{{ $t('about.limitationsTitle') }}</h2>
      <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
        <li>
          {{ $t('about.limitation1') }}
        </li>
        <li>
          {{ $t('about.limitation2') }}
        </li>
        <li>
          {{ $t('about.limitation3') }}
        </li>
      </ul>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">{{ $t('about.reposTitle') }}</h2>
      <ul class="list-disc list-inside text-gray-300 text-sm space-y-1">
        <li>
          <a
            href="https://github.com/scholtz/biatec-scan-web"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >{{ $t('about.frontend') }}</a
          >
        </li>
        <li>
          <a
            href="https://github.com/scholtz/AVMTradeReporter"
            target="_blank"
            rel="noreferrer"
            class="underline"
            >{{ $t('about.backend') }}</a
          >
        </li>
      </ul>
    </div>

    <div class="card space-y-3">
      <h2 class="text-lg font-semibold text-white">{{ $t('about.contactTitle') }}</h2>
      <p class="text-gray-300 text-sm leading-relaxed">
        {{ $t('about.contactDescription') }}
        <a
          href="https://discord.gg/GVhvQFfRDn"
          target="_blank"
          rel="noreferrer"
          class="underline"
          >{{ $t('about.discord') }}</a
        >.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Static informational page – no script logic required for now.
</script>

<style scoped></style>
