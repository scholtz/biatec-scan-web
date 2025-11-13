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
              :class="getTypeColor(transaction.txType ?? '')"
            >
              <span class="font-bold text-2xl">{{
                getTypeIcon(transaction.txType ?? "")
              }}</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">
                {{ getTypeLabel(transaction.txType ?? "") }}
              </h1>
              <p class="text-gray-400">Transaction Details</p>
            </div>
          </div>
          <span class="status-badge status-success">Confirmed</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
            v-if="transaction.confirmedRound"
          >
            <p class="text-sm text-gray-400 mb-1">Block</p>
            <router-link
              :to="{
                name: 'BlockDetails',
                params: { round: transaction.confirmedRound.toString() },
              }"
              class="text-primary-400 hover:text-primary-300 font-medium transition-colors duration-200 text-lg"
            >
              #{{ transaction.confirmedRound?.toString() }}
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
                transaction.roundTime
                  ? new Date(transaction.roundTime * 1000).toLocaleString()
                  : "Unknown"
              }}
            </p>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Valid Rounds</p>
            <p class="text-white font-medium text-sm">
              {{ transaction.firstValid }} - {{ transaction.lastValid }}
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
          <BufferDisplay :value="transaction.note" title="Note" />
        </div>
      </div>

      <!-- Payment Transaction Details -->
      <div
        v-if="transaction.paymentTransaction"
        class="card mb-6 bg-gradient-to-br from-green-900/20 to-dark-800 border-green-700"
      >
        <h2 class="text-xl font-semibold text-green-400 mb-4 flex items-center">
          <span class="mr-2">💸</span> Payment Transaction
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">From</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p
                class="text-green-400 font-mono text-sm break-all hover:text-green-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">To</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.paymentTransaction.receiver,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p
                class="text-green-400 font-mono text-sm break-all hover:text-green-300"
              >
                {{ transaction.paymentTransaction.receiver }}
              </p>
            </router-link>
          </div>
          <div class="lg:col-span-2">
            <p class="text-sm text-gray-400 mb-2">Amount</p>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
              <p class="text-3xl font-bold text-green-400">
                {{
                  algorandService.formatAlgoAmount(
                    transaction.paymentTransaction.amount
                  )
                }}
                ALGO
              </p>
            </div>
          </div>
          <div
            v-if="transaction.paymentTransaction.closeRemainderTo"
            class="lg:col-span-2"
          >
            <p class="text-sm text-gray-400 mb-2">Close Remainder To</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.paymentTransaction.closeRemainderTo,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
            >
              <p
                class="text-green-400 font-mono text-sm break-all hover:text-green-300"
              >
                {{ transaction.paymentTransaction.closeRemainderTo }}
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Asset Transfer Transaction Details -->
      <div
        v-if="transaction.assetTransferTransaction"
        class="card mb-6 bg-gradient-to-br from-blue-900/20 to-dark-800 border-blue-700"
      >
        <h2 class="text-xl font-semibold text-blue-400 mb-4 flex items-center">
          <span class="mr-2">🪙</span> Asset Transfer
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">From</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p
                class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">To</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetTransferTransaction.receiver,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p
                class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
              >
                {{ transaction.assetTransferTransaction.receiver }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Asset ID</p>
            <router-link
              :to="{
                name: 'AssetDetails',
                params: {
                  assetId:
                    transaction.assetTransferTransaction.assetId.toString(),
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p class="text-blue-400 font-medium text-lg hover:text-blue-300">
                {{ transaction.assetTransferTransaction.assetId }}
              </p>
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Amount</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-2xl font-bold text-blue-400">
                {{
                  transaction.assetTransferTransaction.amount.toLocaleString()
                }}
              </p>
            </div>
          </div>
          <div
            v-if="transaction.assetTransferTransaction.closeTo"
            class="lg:col-span-2"
          >
            <p class="text-sm text-gray-400 mb-2">Close Asset To</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetTransferTransaction.closeTo,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <p
                class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
              >
                {{ transaction.assetTransferTransaction.closeTo }}
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Asset Configuration Transaction Details -->
      <div
        v-if="transaction.assetConfigTransaction"
        class="card mb-6 bg-gradient-to-br from-orange-900/20 to-dark-800 border-orange-700"
      >
        <h2
          class="text-xl font-semibold text-orange-400 mb-4 flex items-center"
        >
          <span class="mr-2">🔧</span> Asset Configuration
        </h2>
        <div class="space-y-6">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-mono text-sm break-all hover:text-orange-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Asset ID -->
          <div v-if="transaction.assetConfigTransaction.assetId">
            <p class="text-sm text-gray-400 mb-2">Asset ID</p>
            <router-link
              :to="{
                name: 'AssetDetails',
                params: {
                  assetId:
                    transaction.assetConfigTransaction.assetId.toString(),
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-medium text-lg hover:text-orange-300"
              >
                {{ transaction.assetConfigTransaction.assetId }}
              </p>
            </router-link>
          </div>

          <!-- Asset Parameters -->
          <div v-if="transaction.assetConfigTransaction.params">
            <p class="text-sm text-gray-400 mb-3">Asset Parameters</p>
            <div
              class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-3"
            >
              <div
                v-if="transaction.assetConfigTransaction.params.name"
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-gray-400 text-sm">Name:</span>
                <span class="text-white col-span-2">{{
                  transaction.assetConfigTransaction.params.name
                }}</span>
              </div>
              <div
                v-if="transaction.assetConfigTransaction.params.unitName"
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-gray-400 text-sm">Unit Name:</span>
                <span class="text-white col-span-2">{{
                  transaction.assetConfigTransaction.params.unitName
                }}</span>
              </div>
              <div
                v-if="
                  transaction.assetConfigTransaction.params.total !== undefined
                "
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-gray-400 text-sm">Total:</span>
                <span class="text-white col-span-2">{{
                  transaction.assetConfigTransaction.params.total.toLocaleString()
                }}</span>
              </div>
              <div
                v-if="
                  transaction.assetConfigTransaction.params.decimals !==
                  undefined
                "
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-gray-400 text-sm">Decimals:</span>
                <span class="text-white col-span-2">{{
                  transaction.assetConfigTransaction.params.decimals
                }}</span>
              </div>
              <div
                v-if="transaction.assetConfigTransaction.params.url"
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-gray-400 text-sm">URL:</span>
                <a
                  :href="transaction.assetConfigTransaction.params.url"
                  target="_blank"
                  class="text-orange-400 hover:text-orange-300 col-span-2 break-all"
                >
                  {{ transaction.assetConfigTransaction.params.url }}
                </a>
              </div>
            </div>

            <!-- Asset Addresses -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div v-if="transaction.assetConfigTransaction.params.manager">
                <p class="text-sm text-gray-400 mb-2">Manager</p>
                <router-link
                  :to="{
                    name: 'AddressDetails',
                    params: {
                      address:
                        transaction.assetConfigTransaction.params.manager,
                    },
                  }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p
                    class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
                  >
                    {{ transaction.assetConfigTransaction.params.manager }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction.assetConfigTransaction.params.reserve">
                <p class="text-sm text-gray-400 mb-2">Reserve</p>
                <router-link
                  :to="{
                    name: 'AddressDetails',
                    params: {
                      address:
                        transaction.assetConfigTransaction.params.reserve,
                    },
                  }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p
                    class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
                  >
                    {{ transaction.assetConfigTransaction.params.reserve }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction.assetConfigTransaction.params.freeze">
                <p class="text-sm text-gray-400 mb-2">Freeze</p>
                <router-link
                  :to="{
                    name: 'AddressDetails',
                    params: {
                      address: transaction.assetConfigTransaction.params.freeze,
                    },
                  }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p
                    class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
                  >
                    {{ transaction.assetConfigTransaction.params.freeze }}
                  </p>
                </router-link>
              </div>
              <div v-if="transaction.assetConfigTransaction.params.clawback">
                <p class="text-sm text-gray-400 mb-2">Clawback</p>
                <router-link
                  :to="{
                    name: 'AddressDetails',
                    params: {
                      address:
                        transaction.assetConfigTransaction.params.clawback,
                    },
                  }"
                  class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <p
                    class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
                  >
                    {{ transaction.assetConfigTransaction.params.clawback }}
                  </p>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Freeze Transaction Details -->
      <div
        v-if="transaction.assetFreezeTransaction"
        class="card mb-6 bg-gradient-to-br from-cyan-900/20 to-dark-800 border-cyan-700"
      >
        <h2 class="text-xl font-semibold text-cyan-400 mb-4 flex items-center">
          <span class="mr-2">❄️</span> Asset Freeze
        </h2>
        <div class="space-y-4">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender (Freeze Authority)</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              <p
                class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Target Address -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Target Address</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetFreezeTransaction.address,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              <p
                class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300"
              >
                {{ transaction.assetFreezeTransaction.address }}
              </p>
            </router-link>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Asset ID -->
            <div>
              <p class="text-sm text-gray-400 mb-2">Asset ID</p>
              <router-link
                :to="{
                  name: 'AssetDetails',
                  params: {
                    assetId:
                      transaction.assetFreezeTransaction.assetId.toString(),
                  },
                }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
              >
                <p
                  class="text-cyan-400 font-medium text-lg hover:text-cyan-300"
                >
                  {{ transaction.assetFreezeTransaction.assetId }}
                </p>
              </router-link>
            </div>

            <!-- Freeze Status -->
            <div>
              <p class="text-sm text-gray-400 mb-2">New Freeze Status</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p
                  class="text-lg font-bold"
                  :class="
                    transaction.assetFreezeTransaction.newFreezeStatus
                      ? 'text-red-400'
                      : 'text-green-400'
                  "
                >
                  {{
                    transaction.assetFreezeTransaction.newFreezeStatus
                      ? "FROZEN"
                      : "UNFROZEN"
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Registration Transaction Details -->
      <div
        v-if="transaction.keyregTransaction"
        class="card mb-6 bg-gradient-to-br from-pink-900/20 to-dark-800 border-pink-700"
      >
        <h2 class="text-xl font-semibold text-pink-400 mb-4 flex items-center">
          <span class="mr-2">🔑</span> Key Registration
        </h2>
        <div class="space-y-4">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Account</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-pink-500 transition-colors"
            >
              <p
                class="text-pink-400 font-mono text-sm break-all hover:text-pink-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <div
            v-if="transaction.keyregTransaction.nonParticipation"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <p class="text-pink-400 font-medium text-lg">
              Non-Participation Key Registration
            </p>
            <p class="text-gray-400 text-sm mt-1">
              This account marks itself as non-participating
            </p>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="transaction.keyregTransaction.voteFirstValid">
                <p class="text-sm text-gray-400 mb-2">Vote First Valid</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">
                    {{ transaction.keyregTransaction.voteFirstValid }}
                  </p>
                </div>
              </div>
              <div v-if="transaction.keyregTransaction.voteLastValid">
                <p class="text-sm text-gray-400 mb-2">Vote Last Valid</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">
                    {{ transaction.keyregTransaction.voteLastValid }}
                  </p>
                </div>
              </div>
              <div v-if="transaction.keyregTransaction.voteKeyDilution">
                <p class="text-sm text-gray-400 mb-2">Vote Key Dilution</p>
                <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                  <p class="text-white font-medium">
                    {{ transaction.keyregTransaction.voteKeyDilution }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="transaction.keyregTransaction.voteParticipationKey">
              <p class="text-sm text-gray-400 mb-2">Vote Participation Key</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">
                  {{ transaction.keyregTransaction.voteParticipationKey }}
                </p>
              </div>
            </div>

            <div v-if="transaction.keyregTransaction.selectionParticipationKey">
              <p class="text-sm text-gray-400 mb-2">
                Selection Participation Key
              </p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">
                  {{ transaction.keyregTransaction.selectionParticipationKey }}
                </p>
              </div>
            </div>

            <div v-if="transaction.keyregTransaction.stateProofKey">
              <p class="text-sm text-gray-400 mb-2">State Proof Key</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-mono text-xs break-all">
                  {{ transaction.keyregTransaction.stateProofKey }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- State Proof Transaction Details -->
      <div
        v-if="transaction.stateProofTransaction"
        class="card mb-6 bg-gradient-to-br from-yellow-900/20 to-dark-800 border-yellow-700"
      >
        <h2
          class="text-xl font-semibold text-yellow-400 mb-4 flex items-center"
        >
          <span class="mr-2">🔐</span> State Proof Transaction
        </h2>
        <div class="space-y-4">
          <div v-if="transaction.sender">
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors"
            >
              <p
                class="text-yellow-400 font-mono text-sm break-all hover:text-yellow-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <div
            v-if="
              transaction.stateProofTransaction.stateProofType !== undefined
            "
          >
            <p class="text-sm text-gray-400 mb-2">State Proof Type</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction.stateProofTransaction.stateProofType }}
              </p>
            </div>
          </div>

          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">
              State proof transactions are special transactions used by the
              Algorand protocol for state proofs. They do not transfer funds and
              are automatically generated by the protocol.
            </p>
          </div>
        </div>
      </div>

      <!-- Sender/Receiver for All Transactions -->
      <div
        v-if="
          !transaction.paymentTransaction &&
          !transaction.assetTransferTransaction &&
          !transaction.applicationTransaction &&
          !transaction.assetConfigTransaction &&
          !transaction.assetFreezeTransaction &&
          !transaction.keyregTransaction &&
          transaction.sender
        "
        class="card mb-6"
      >
        <h2 class="text-xl font-semibold text-white mb-4">
          Transaction Participants
        </h2>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors"
            >
              <p
                class="text-primary-400 font-mono text-sm break-all hover:text-primary-300"
              >
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
                {{ transaction.genesisId }}
              </p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Transaction Type</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">{{ transaction.txType }}</p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Intra Round Offset</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction.intraRoundOffset }}
              </p>
            </div>
          </div>
          <div v-if="transaction.senderRewards">
            <p class="text-sm text-gray-400 mb-2">Sender Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{
                  algorandService.formatAlgoAmount(transaction.senderRewards)
                }}
                ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction.receiverRewards">
            <p class="text-sm text-gray-400 mb-2">Receiver Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{
                  algorandService.formatAlgoAmount(transaction.receiverRewards)
                }}
                ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction.closeRewards">
            <p class="text-sm text-gray-400 mb-2">Close Rewards</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ algorandService.formatAlgoAmount(transaction.closeRewards) }}
                ALGO
              </p>
            </div>
          </div>
          <div v-if="transaction.closingAmount">
            <p class="text-sm text-gray-400 mb-2">Closing Amount</p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{
                  algorandService.formatAlgoAmount(transaction.closingAmount)
                }}
                ALGO
              </p>
            </div>
          </div>
          <div class="md:col-span-2">
            <BufferDisplay :value="transaction.genesisHash" title="Genesis Hash" default-encoding="hex" />
          </div>
        </div>
      </div>

      <!-- Application Call Details -->
      <div
        v-if="transaction.applicationTransaction"
        class="card mb-6 bg-gradient-to-br from-purple-900/20 to-dark-800 border-purple-700"
      >
        <h2
          class="text-xl font-semibold text-purple-400 mb-4 flex items-center"
        >
          <span class="mr-2">⚙️</span> Application Call
        </h2>
        <div class="space-y-6">
          <!-- Sender -->
          <div>
            <p class="text-sm text-gray-400 mb-2">Sender</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: transaction.sender },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
            >
              <p
                class="text-purple-400 font-mono text-sm break-all hover:text-purple-300"
              >
                {{ transaction.sender }}
              </p>
            </router-link>
          </div>

          <!-- Application ID and On Completion -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-400 mb-2">Application ID</p>
              <router-link
                v-if="transaction.applicationTransaction.applicationId"
                :to="{
                  name: 'ApplicationDetails',
                  params: {
                    appId:
                      transaction.applicationTransaction.applicationId.toString(),
                  },
                }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <p
                  class="text-purple-400 font-medium text-lg hover:text-purple-300"
                >
                  {{ transaction.applicationTransaction.applicationId }}
                </p>
              </router-link>
              <div
                v-else
                class="bg-dark-900 p-3 rounded-lg border border-gray-700"
              >
                <p class="text-purple-400 font-medium text-lg">Create New</p>
              </div>
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-2">On Completion</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-white font-medium">
                  {{ transaction.applicationTransaction.onCompletion }}
                </p>
              </div>
            </div>
          </div>

          <!-- Referenced Accounts -->
          <div
            v-if="
              transaction.applicationTransaction.accounts &&
              transaction.applicationTransaction.accounts.length > 0
            "
          >
            <p class="text-sm text-gray-400 mb-3">
              Referenced Accounts ({{
                transaction.applicationTransaction.accounts.length
              }})
            </p>
            <div class="grid grid-cols-1 gap-3">
              <router-link
                v-for="(account, index) in transaction.applicationTransaction
                  .accounts"
                :key="index"
                :to="{
                  name: 'AddressDetails',
                  params: { address: account.toString() },
                }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <p
                    class="text-purple-400 font-mono text-sm break-all hover:text-purple-300"
                  >
                    {{ account }}
                  </p>
                  <span class="text-xs text-gray-500 ml-2"
                    >Account {{ index + 1 }}</span
                  >
                </div>
              </router-link>
            </div>
          </div>

          <!-- Foreign Apps -->
          <div
            v-if="
              transaction.applicationTransaction.foreignApps &&
              transaction.applicationTransaction.foreignApps.length > 0
            "
          >
            <p class="text-sm text-gray-400 mb-3">Foreign Applications</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                v-for="(appId, index) in transaction.applicationTransaction
                  .foreignApps"
                :key="index"
                class="bg-dark-900 p-3 rounded-lg border border-gray-700"
              >
                <p class="text-xs text-gray-500 mb-1">App {{ index + 1 }}</p>
                <p class="text-purple-400 font-medium">{{ appId }}</p>
              </div>
            </div>
          </div>

          <!-- Foreign Assets -->
          <div
            v-if="
              transaction.applicationTransaction.foreignAssets &&
              transaction.applicationTransaction.foreignAssets.length > 0
            "
          >
            <p class="text-sm text-gray-400 mb-3">Foreign Assets</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <router-link
                v-for="(assetId, index) in transaction.applicationTransaction
                  .foreignAssets"
                :key="index"
                :to="{
                  name: 'AssetDetails',
                  params: { assetId: assetId.toString() },
                }"
                class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <p class="text-xs text-gray-500 mb-1">Asset {{ index + 1 }}</p>
                <p class="text-purple-400 font-medium hover:text-purple-300">
                  {{ assetId }}
                </p>
              </router-link>
            </div>
          </div>

          <!-- Application Arguments -->
          <div
            v-if="
              transaction.applicationTransaction.applicationArgs &&
              transaction.applicationTransaction.applicationArgs.length > 0
            "
          >
            <p class="text-sm text-gray-400 mb-3">
              Application Arguments ({{
                transaction.applicationTransaction.applicationArgs.length
              }})
            </p>
            <div class="space-y-2">
              <BufferDisplay
                v-for="(arg, index) in transaction.applicationTransaction
                  .applicationArgs"
                :key="index"
                :value="arg"
                :title="`Argument ${index}`"
              />
            </div>
          </div>

          <!-- Schema Information -->
          <div
            v-if="
              transaction.applicationTransaction.globalStateSchema ||
              transaction.applicationTransaction.localStateSchema
            "
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div v-if="transaction.applicationTransaction.globalStateSchema">
              <p class="text-sm text-gray-400 mb-2">Global State Schema</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-sm text-white">
                  Uints:
                  {{
                    transaction.applicationTransaction.globalStateSchema.numUint
                  }}
                </p>
                <p class="text-sm text-white">
                  Byte Slices:
                  {{
                    transaction.applicationTransaction.globalStateSchema
                      .numByteSlice
                  }}
                </p>
              </div>
            </div>
            <div v-if="transaction.applicationTransaction.localStateSchema">
              <p class="text-sm text-gray-400 mb-2">Local State Schema</p>
              <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
                <p class="text-sm text-white">
                  Uints:
                  {{
                    transaction.applicationTransaction.localStateSchema.numUint
                  }}
                </p>
                <p class="text-sm text-white">
                  Byte Slices:
                  {{
                    transaction.applicationTransaction.localStateSchema
                      .numByteSlice
                  }}
                </p>
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
import algosdk from "algosdk";
import BufferDisplay from "../components/BufferDisplay.vue";

const route = useRoute();
const transaction = ref<algosdk.indexerModels.Transaction | null>(null);
const isLoading = ref(true);

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

const loadTransaction = async (txId: string, round?: string) => {
  isLoading.value = true;
  try {
    const roundNumber = round ? Number(round) : undefined;
    const txData = await algorandService.getTransaction(txId, roundNumber);
    transaction.value = txData;
  } catch (error) {
    console.error("Error loading transaction:", error);
    transaction.value = null;
  }
  isLoading.value = false;
};

watch(
  () => [route.params.txId, route.params.round],
  ([newTxId, newRound]) => {
    if (newTxId) {
      loadTransaction(newTxId as string, newRound as string | undefined);
    }
  }
);

onMounted(() => {
  const txId = route.params.txId as string;
  const round = route.params.round as string | undefined;
  if (txId) {
    loadTransaction(txId, round);
  }
});
</script>
