<template>
  <span>{{ formattedTime }}</span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

interface Props {
  timestamp: string | bigint;
  format?: "relative" | "time" | "both";
}

const props = withDefaults(defineProps<Props>(), {
  format: "relative",
});

const { t } = useI18n();

// Create a reactive timestamp that updates every second
const currentTime = ref(Date.now());
let timeInterval: number | null = null;

const formatRelativeTime = (timestamp: string | bigint): string => {
  let date: Date;

  if (typeof timestamp === "bigint") {
    // Convert bigint timestamp (seconds) to milliseconds
    date = new Date(Number(timestamp) * 1000);
  } else {
    // Handle string timestamp
    date = new Date(timestamp);
  }

  const now = currentTime.value;
  const diffMs = now - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return t('common.timeAgo.seconds', { count: Math.max(0, diffSecs) });
  } else if (diffMins < 60) {
    return t('common.timeAgo.minutes', { count: diffMins });
  } else if (diffHours < 24) {
    return t('common.timeAgo.hours', { count: diffHours });
  } else {
    return t('common.timeAgo.days', { count: diffDays });
  }
};

const formatTime = (timestamp: string | bigint): string => {
  let date: Date;

  if (typeof timestamp === "bigint") {
    // Convert bigint timestamp (seconds) to milliseconds
    date = new Date(Number(timestamp) * 1000);
  } else {
    // Handle string timestamp
    date = new Date(timestamp);
  }

  return date.toLocaleTimeString();
};

const formattedTime = computed(() => {
  switch (props.format) {
    case "time":
      return formatTime(props.timestamp);
    case "both":
      return `${formatRelativeTime(props.timestamp)} (${formatTime(props.timestamp)})`;
    case "relative":
    default:
      return formatRelativeTime(props.timestamp);
  }
});

onMounted(() => {
  // Update current time every second
  timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});
</script>
