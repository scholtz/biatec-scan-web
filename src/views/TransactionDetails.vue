<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="transaction">
      <!-- Transaction Header -->
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              :class="getTypeColor(transaction['tx-type'])"
            >
              <span class="font-bold text-2xl">{{
                getTypeIcon(transaction["tx-type"])
              }}</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">
                {{ getTypeLabel(transaction["tx-type"]) }}
              </h1>
              <p class="text-gray-400">Transaction Details</p>
            </div>
          </div>
          <span class="status-badge status-success">Confirmed</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Block</p>
            <router-link
              :to="{
                name: 'BlockDetails',
                params: { round: transaction['confirmed-round'] },
              }"
              class="text-primary-400 hover:text-primary-300 font-medium transition-colors duration-200 text-lg"
            >
              #{{ transaction["confirmed-round"]?.toLocaleString() }}
            </router-link>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Fee</p>
            <p class="text-white font-medium text-lg">
              {{ algorandService.formatAlgoAmount(transaction.fee) }} ALGO
            </p>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Time</p>
            <p class="text-white font-medium">
              {{
                transaction["round-time"]
                  ? new Date(transaction["round-time"] * 1000).toLocaleString()
                  : "Unknown"
              }}
            </p>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Valid Rounds</p>
            <p class="text-white font-medium text-sm">
              {{ transaction["first-valid"] }} - {{ transaction["last-valid"] }}
            </p>
          </div>
        </div>
      </div>

      <!-- Transaction ID -->
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-white mb-3">Transaction ID</h2>
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
          <p class="text-white font-mono text-sm break-all">
            {{ transaction.id }}
          </p>
        </div>
        <div v-if="transaction.note" class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-white">Note</h3>
            <div class="flex space-x-2">
              <button
                @click="noteEncoding = 'utf8'"
                :class="noteEncoding === 'utf8' ? 'bg-primary-600 text-white' : 'bg-dark-900 text-gray-400'"
                class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                UTF-8
              </button>
              <button
                @click="noteEncoding = 'base64'"
                :class="noteEncoding === 'base64' ? 'bg-primary-600 text-white' : 'bg-dark-900 text-gray-400'"
                class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                Base64
              </button>
              <button
                @click="noteEncoding = 'hex'"
                :class="noteEncoding === 'hex' ? 'bg-primary-600 text-white' : 'bg-dark-900 text-gray-400'"
                class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                Hex
              </button>
            </div>
          </div>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-gray-300 text-sm break-all font-mono">{{ decodeNote(transaction.note) }}</p>
          </div>
        </div>
      </div>

      <!-- Payment Transaction Details -->
      <div v-if="transaction['payment-transaction']" class="card mb-6 bg-gradient-to-br from-green-900/20 to-dark-800 border-green-700">
        <h2 class="text-xl font-semibold text-green-400 mb-4 flex items-center">
          <span class="mr-2">💸</span> Payment Transaction
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">From</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p class="text-green-400 font-mono text-sm break-all hover:text-green-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">To</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction['payment-transaction'].receiver } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p class="text-green-400 font-mono text-sm break-all hover:text-green-300">
                {{ transaction["payment-transaction"].receiver }}
              </p>
            </router-link>
          </div>
          <div class="lg:col-span-2">
            <p class="text-sm text-gray-400 mb-2">Amount</p>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
              <p class="text-3xl font-bold text-green-400">
                {{ algorandService.formatAlgoAmount(transaction["payment-transaction"].amount) }} ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction['payment-transaction']['close-remainder-to']" class="lg:col-span-2">
            <p class="text-sm text-gray-400 mb-2">Close Remainder To</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction['payment-transaction']['close-remainder-to'] } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p class="text-green-400 font-mono text-sm break-all hover:text-green-300">
                {{ transaction["payment-transaction"]["close-remainder-to"] }}
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Asset Transfer Transaction Details -->
      <div v-if="transaction['asset-transfer-transaction']" class="card mb-6 bg-gradient-to-br from-blue-900/20 to-dark-800 border-blue-700">
        <h2 class="text-xl font-semibold text-blue-400 mb-4 flex items-center">
          <span class="mr-2">🪙</span> Asset Transfer
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">From</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p class="text-blue-400 font-mono text-sm break-all hover:text-blue-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">To</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction['asset-transfer-transaction'].receiver } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p class="text-blue-400 font-mono text-sm break-all hover:text-blue-300">
                {{ transaction["asset-transfer-transaction"].receiver }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Asset ID</p>
            <router-link
              :to="{ name: 'AssetDetails', params: { assetId: transaction['asset-transfer-transaction']['asset-id'] } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p class="text-blue-400 font-medium text-lg hover:text-blue-300">
                {{ transaction["asset-transfer-transaction"]["asset-id"] }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Amount</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-2xl font-bold text-blue-400">
                {{ transaction["asset-transfer-transaction"].amount.toLocaleString() }}
              </p>
            </div>
          </div>
          <div v-if="transaction['asset-transfer-transaction']['close-to']" class="lg:col-span-2">
            <p class="text-sm text-gray-400 mb-2">Close Asset To</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction['asset-transfer-transaction']['close-to'] } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p class="text-blue-400 font-mono text-sm break-all hover:text-blue-300">
                {{ transaction["asset-transfer-transaction"]["close-to"] }}
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Asset Configuration Transaction Details -->
      <div v-if="transaction['asset-config-transaction']" class="card mb-6 bg-gradient-to-br from-orange-900/20 to-dark-800 border-orange-700">
        <h2 class="text-xl font-semibold text-orange-400 mb-4 flex items-center">
          <span class="mr-2">🔧</span> Asset Configuration
        </h2>
        <div class="space-y-6">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p class="text-orange-400 font-mono text-sm break-all hover:text-orange-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Asset ID -->
          <div v-if="transaction['asset-config-transaction']['asset-id']">
            <p class="text-sm text-gray-400 mb-2">Asset ID</p>
            <router-link
              :to="{ name: 'AssetDetails', params: { assetId: transaction['asset-config-transaction']['asset-id'] } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p class="text-orange-400 font-medium text-lg hover:text-orange-300">
                {{ transaction["asset-config-transaction"]["asset-id"] }}
              </p>
            </router-link>
          </div>

          <!-- Asset Parameters -->
          <div v-if="transaction['asset-config-transaction'].params">
            <p class="text-sm text-gray-400 mb-3">Asset Parameters</p>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-3">
              <div v-if="transaction['asset-config-transaction'].params.name" class="grid grid-cols-3 gap-2">
                <span class="text-gray-400 text-sm">Name:</span>
                <span class="text-white col-span-2">{{ transaction['asset-config-transaction'].params.name }}</span>
              </div>
              <div v-if="transaction['asset-config-transaction'].params['unit-name']" class="grid grid-cols-3 gap-2">
                <span class="text-gray-400 text-sm">Unit Name:</span>
                <span class="text-white col-span-2">{{ transaction['asset-config-transaction'].params['unit-name'] }}</span>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.total !== undefined" class="grid grid-cols-3 gap-2">
                <span class="text-gray-400 text-sm">Total:</span>
                <span class="text-white col-span-2">{{ transaction['asset-config-transaction'].params.total.toLocaleString() }}</span>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.decimals !== undefined" class="grid grid-cols-3 gap-2">
                <span class="text-gray-400 text-sm">Decimals:</span>
                <span class="text-white col-span-2">{{ transaction['asset-config-transaction'].params.decimals }}</span>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.url" class="grid grid-cols-3 gap-2">
                <span class="text-gray-400 text-sm">URL:</span>
                <a :href="transaction['asset-config-transaction'].params.url" target="_blank" class="text-orange-400 hover:text-orange-300 col-span-2 break-all">
                  {{ transaction['asset-config-transaction'].params.url }}
                </a>
              </div>
            </div>

            <!-- Asset Addresses -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div v-if="transaction['asset-config-transaction'].params.manager">
                <p class="text-sm text-gray-400 mb-2">Manager</p>
                <router-link
                  :to="{ name: 'AddressDetails', params: { address: transaction['asset-config-transaction'].params.manager } }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p class="text-orange-400 font-mono text-xs break-all hover:text-orange-300">
                    {{ transaction['asset-config-transaction'].params.manager }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.reserve">
                <p class="text-sm text-gray-400 mb-2">Reserve</p>
                <router-link
                  :to="{ name: 'AddressDetails', params: { address: transaction['asset-config-transaction'].params.reserve } }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p class="text-orange-400 font-mono text-xs break-all hover:text-orange-300">
                    {{ transaction['asset-config-transaction'].params.reserve }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.freeze">
                <p class="text-sm text-gray-400 mb-2">Freeze</p>
                <router-link
                  :to="{ name: 'AddressDetails', params: { address: transaction['asset-config-transaction'].params.freeze } }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p class="text-orange-400 font-mono text-xs break-all hover:text-orange-300">
                    {{ transaction['asset-config-transaction'].params.freeze }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction['asset-config-transaction'].params.clawback">
                <p class="text-sm text-gray-400 mb-2">Clawback</p>
                <router-link
                  :to="{ name: 'AddressDetails', params: { address: transaction['asset-config-transaction'].params.clawback } }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p class="text-orange-400 font-mono text-xs break-all hover:text-orange-300">
                    {{ transaction['asset-config-transaction'].params.clawback }}
                  </p>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Freeze Transaction Details -->
      <div v-if="transaction['asset-freeze-transaction']" class="card mb-6 bg-gradient-to-br from-cyan-900/20 to-dark-800 border-cyan-700">
        <h2 class="text-xl font-semibold text-cyan-400 mb-4 flex items-center">
          <span class="mr-2">❄️</span> Asset Freeze
        </h2>
        <div class="space-y-4">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender (Freeze Authority)</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              <p class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Target Address -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Target Address</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction['asset-freeze-transaction'].address } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              <p class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300">
                {{ transaction['asset-freeze-transaction'].address }}
              </p>
            </router-link>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Asset ID -->
            <div>
              <p class="text-sm text-gray-400 mb-2">Asset ID</p>
              <router-link
                :to="{ name: 'AssetDetails', params: { assetId: transaction['asset-freeze-transaction']['asset-id'] } }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
              >
                <p class="text-cyan-400 font-medium text-lg hover:text-cyan-300">
                  {{ transaction['asset-freeze-transaction']['asset-id'] }}
                </p>
              </router-link>
            </div>

            <!-- Freeze Status -->
            <div>
              <p class="text-sm text-gray-400 mb-2">New Freeze Status</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-lg font-bold" :class="transaction['asset-freeze-transaction']['new-freeze-status'] ? 'text-red-400' : 'text-green-400'">
                  {{ transaction['asset-freeze-transaction']['new-freeze-status'] ? 'FROZEN' : 'UNFROZEN' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Registration Transaction Details -->
      <div v-if="transaction['keyreg-transaction']" class="card mb-6 bg-gradient-to-br from-pink-900/20 to-dark-800 border-pink-700">
        <h2 class="text-xl font-semibold text-pink-400 mb-4 flex items-center">
          <span class="mr-2">🔑</span> Key Registration
        </h2>
        <div class="space-y-4">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Account</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-pink-500 transition-colors"
            >
              <p class="text-pink-400 font-mono text-sm break-all hover:text-pink-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <div v-if="transaction['keyreg-transaction']['non-participation']" class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-pink-400 font-medium text-lg">Non-Participation Key Registration</p>
            <p class="text-gray-400 text-sm mt-1">This account marks itself as non-participating</p>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="transaction['keyreg-transaction']['vote-first-valid']">
                <p class="text-sm text-gray-400 mb-2">Vote First Valid</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">{{ transaction['keyreg-transaction']['vote-first-valid'] }}</p>
                </div>
              </div>
              <div v-if="transaction['keyreg-transaction']['vote-last-valid']">
                <p class="text-sm text-gray-400 mb-2">Vote Last Valid</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">{{ transaction['keyreg-transaction']['vote-last-valid'] }}</p>
                </div>
              </div>
              <div v-if="transaction['keyreg-transaction']['vote-key-dilution']">
                <p class="text-sm text-gray-400 mb-2">Vote Key Dilution</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">{{ transaction['keyreg-transaction']['vote-key-dilution'] }}</p>
                </div>
              </div>
            </div>

            <div v-if="transaction['keyreg-transaction']['vote-participation-key']">
              <p class="text-sm text-gray-400 mb-2">Vote Participation Key</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">{{ transaction['keyreg-transaction']['vote-participation-key'] }}</p>
              </div>
            </div>

            <div v-if="transaction['keyreg-transaction']['selection-participation-key']">
              <p class="text-sm text-gray-400 mb-2">Selection Participation Key</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">{{ transaction['keyreg-transaction']['selection-participation-key'] }}</p>
              </div>
            </div>

            <div v-if="transaction['keyreg-transaction']['state-proof-key']">
              <p class="text-sm text-gray-400 mb-2">State Proof Key</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">{{ transaction['keyreg-transaction']['state-proof-key'] }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- State Proof Transaction Details -->
      <div v-if="transaction['state-proof-transaction']" class="card mb-6 bg-gradient-to-br from-yellow-900/20 to-dark-800 border-yellow-700">
        <h2 class="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
          <span class="mr-2">🔐</span> State Proof Transaction
        </h2>
        <div class="space-y-4">
          <div v-if="transaction.sender">
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors"
            >
              <p class="text-yellow-400 font-mono text-sm break-all hover:text-yellow-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <div v-if="transaction['state-proof-transaction']['state-proof-type'] !== undefined">
            <p class="text-sm text-gray-400 mb-2">State Proof Type</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">{{ transaction['state-proof-transaction']['state-proof-type'] }}</p>
            </div>
          </div>

          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">
              State proof transactions are special transactions used by the Algorand protocol for state proofs. 
              They do not transfer funds and are automatically generated by the protocol.
            </p>
          </div>
        </div>
      </div>

      <!-- Sender/Receiver for All Transactions -->
      <div v-if="!transaction['payment-transaction'] && !transaction['asset-transfer-transaction'] && !transaction['application-transaction'] && !transaction['asset-config-transaction'] && !transaction['asset-freeze-transaction'] && !transaction['keyreg-transaction'] && transaction.sender" class="card mb-6">
        <h2 class="text-xl font-semibold text-white mb-4">Transaction Participants</h2>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors"
            >
              <p class="text-primary-400 font-mono text-sm break-all hover:text-primary-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Technical Details -->
      <div class="card mb-6">
        <h2 class="text-xl font-semibold text-white mb-4">Technical Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">Genesis ID</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-mono text-sm">
                {{ transaction["genesis-id"] }}
              </p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Transaction Type</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">{{ transaction["tx-type"] }}</p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Intra Round Offset</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction["intra-round-offset"] }}
              </p>
            </div>
          </div>
          <div v-if="transaction['sender-rewards']">
            <p class="text-sm text-gray-400 mb-2">Sender Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ algorandService.formatAlgoAmount(transaction["sender-rewards"]) }} ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction['receiver-rewards']">
            <p class="text-sm text-gray-400 mb-2">Receiver Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ algorandService.formatAlgoAmount(transaction["receiver-rewards"]) }} ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction['close-rewards']">
            <p class="text-sm text-gray-400 mb-2">Close Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ algorandService.formatAlgoAmount(transaction["close-rewards"]) }} ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction['closing-amount']">
            <p class="text-sm text-gray-400 mb-2">Closing Amount</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ algorandService.formatAlgoAmount(transaction["closing-amount"]) }} ALGO
              </p>
            </div>
          </div>
          <div class="md:col-span-2">
            <p class="text-sm text-gray-400 mb-2">Genesis Hash</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-mono text-xs break-all">
                {{ transaction["genesis-hash"] }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Application Call Details -->
      <div v-if="transaction['application-transaction']" class="card mb-6 bg-gradient-to-br from-purple-900/20 to-dark-800 border-purple-700">
        <h2 class="text-xl font-semibold text-purple-400 mb-4 flex items-center">
          <span class="mr-2">⚙️</span> Application Call
        </h2>
        <div class="space-y-6">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
            >
              <p class="text-purple-400 font-mono text-sm break-all hover:text-purple-300">
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Application ID and On Completion -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-400 mb-2">Application ID</p>
              <router-link
                v-if="transaction['application-transaction']['application-id']"
                :to="{ name: 'ApplicationDetails', params: { appId: transaction['application-transaction']['application-id'] } }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <p class="text-purple-400 font-medium text-lg hover:text-purple-300">
                  {{ transaction["application-transaction"]["application-id"] }}
                </p>
              </router-link>
              <div v-else class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-purple-400 font-medium text-lg">Create New</p>
              </div>
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-2">On Completion</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-medium">
                  {{ transaction["application-transaction"]["on-completion"] }}
                </p>
              </div>
            </div>
          </div>

          <!-- Referenced Accounts -->
          <div v-if="transaction['application-transaction'].accounts && transaction['application-transaction'].accounts.length > 0">
            <p class="text-sm text-gray-400 mb-3">Referenced Accounts ({{ transaction['application-transaction'].accounts.length }})</p>
            <div class="grid grid-cols-1 gap-3">
              <router-link
                v-for="(account, index) in transaction['application-transaction'].accounts"
                :key="index"
                :to="{ name: 'AddressDetails', params: { address: account } }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <p class="text-purple-400 font-mono text-sm break-all hover:text-purple-300">
                    {{ account }}
                  </p>
                  <span class="text-xs text-gray-500 ml-2">Account {{ index + 1 }}</span>
                </div>
              </router-link>
            </div>
          </div>

          <!-- Foreign Apps -->
          <div v-if="transaction['application-transaction']['foreign-apps'] && transaction['application-transaction']['foreign-apps'].length > 0">
            <p class="text-sm text-gray-400 mb-3">Foreign Applications</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                v-for="(appId, index) in transaction['application-transaction']['foreign-apps']"
                :key="index"
                class="bg-dark-900 p-3 rounded-lg border border-gray-700"
              >
                <p class="text-xs text-gray-500 mb-1">App {{ index + 1 }}</p>
                <p class="text-purple-400 font-medium">{{ appId }}</p>
              </div>
            </div>
          </div>

          <!-- Foreign Assets -->
          <div v-if="transaction['application-transaction']['foreign-assets'] && transaction['application-transaction']['foreign-assets'].length > 0">
            <p class="text-sm text-gray-400 mb-3">Foreign Assets</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <router-link
                v-for="(assetId, index) in transaction['application-transaction']['foreign-assets']"
                :key="index"
                :to="{ name: 'AssetDetails', params: { assetId } }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <p class="text-xs text-gray-500 mb-1">Asset {{ index + 1 }}</p>
                <p class="text-purple-400 font-medium hover:text-purple-300">{{ assetId }}</p>
              </router-link>
            </div>
          </div>

          <!-- Application Arguments -->
          <div v-if="transaction['application-transaction']['application-args'] && transaction['application-transaction']['application-args'].length > 0">
            <p class="text-sm text-gray-400 mb-3">Application Arguments ({{ transaction['application-transaction']['application-args'].length }})</p>
            <div class="space-y-2">
              <div
                v-for="(arg, index) in transaction['application-transaction']['application-args']"
                :key="index"
                class="bg-dark-900 p-3 rounded-lg border border-gray-700"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-gray-500">Argument {{ index }}</span>
                </div>
                <p class="text-white font-mono text-xs break-all">{{ arg }}</p>
              </div>
            </div>
          </div>

          <!-- Schema Information -->
          <div v-if="transaction['application-transaction']['global-state-schema'] || transaction['application-transaction']['local-state-schema']" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="transaction['application-transaction']['global-state-schema']">
              <p class="text-sm text-gray-400 mb-2">Global State Schema</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-sm text-white">Uints: {{ transaction['application-transaction']['global-state-schema']['num-uint'] }}</p>
                <p class="text-sm text-white">Byte Slices: {{ transaction['application-transaction']['global-state-schema']['num-byte-slice'] }}</p>
              </div>
            </div>
            <div v-if="transaction['application-transaction']['local-state-schema']">
              <p class="text-sm text-gray-400 mb-2">Local State Schema</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-sm text-white">Uints: {{ transaction['application-transaction']['local-state-schema']['num-uint'] }}</p>
                <p class="text-sm text-white">Byte Slices: {{ transaction['application-transaction']['local-state-schema']['num-byte-slice'] }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">
        Transaction Not Found
      </h2>
      <p class="text-gray-400 mb-4">
        The requested transaction could not be found.
      </p>
      <router-link to="/" class="btn-primary">Back to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import type { AlgorandTransaction } from "../types/algorand";

const route = useRoute();
const transaction = ref<AlgorandTransaction | null>(null);
const isLoading = ref(true);
const noteEncoding = ref<'utf8' | 'base64' | 'hex'>('utf8');

const decodeNote = (note: string) => {
  if (!note) return '';
  
  try {
    if (noteEncoding.value === 'base64') {
      return note;
    } else if (noteEncoding.value === 'hex') {
      // Convert base64 to hex
      const decoded = atob(note);
      return Array.from(decoded).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    } else {
      // UTF-8 - try to decode base64 to string
      try {
        const decoded = atob(note);
        // Check if it's valid UTF-8
        const utf8String = decodeURIComponent(escape(decoded));
        // Test if it contains mostly printable characters
        const printableRatio = utf8String.split('').filter(c => {
          const code = c.charCodeAt(0);
          return code >= 32 && code <= 126 || code === 10 || code === 13 || code === 9;
        }).length / utf8String.length;
        
        if (printableRatio > 0.8) {
          return utf8String;
        } else {
          // Not valid UTF-8, switch to hex
          noteEncoding.value = 'hex';
          return Array.from(decoded).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        }
      } catch (e) {
        // If UTF-8 decoding fails, switch to hex
        noteEncoding.value = 'hex';
        const decoded = atob(note);
        return Array.from(decoded).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      }
    }
  } catch (e) {
    return note;
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pay: "Payment Transaction",
    axfer: "Asset Transfer",
    appl: "Application Call",
    acfg: "Asset Configuration",
    afrz: "Asset Freeze",
    keyreg: "Key Registration",
    stpf: "State Proof",
  };
  return labels[type] || type?.toUpperCase() || "UNKNOWN";
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    pay: "₳",
    axfer: "⇄",
    appl: "⚙",
    acfg: "🔧",
    afrz: "❄",
    keyreg: "🔑",
    stpf: "🔐",
  };
  return icons[type] || "?";
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    pay: "bg-green-600",
    axfer: "bg-blue-600",
    appl: "bg-purple-600",
    acfg: "bg-orange-600",
    afrz: "bg-cyan-600",
    keyreg: "bg-pink-600",
    stpf: "bg-yellow-600",
  };
  return colors[type] || "bg-gray-600";
};

const loadTransaction = async (txId: string) => {
  isLoading.value = true;
  try {
    const txData = await algorandService.getTransaction(txId);
    transaction.value = txData;
  } catch (error) {
    console.error("Error loading transaction:", error);
    transaction.value = null;
  }
  isLoading.value = false;
};

watch(
  () => route.params.txId,
  (newTxId) => {
    if (newTxId) {
      loadTransaction(newTxId as string);
    }
  }
);

onMounted(() => {
  const txId = route.params.txId as string;
  if (txId) {
    loadTransaction(txId);
  }
});
</script>
