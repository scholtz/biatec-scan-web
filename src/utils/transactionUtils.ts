export const getTypeLabel = (type: string): string => {
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

export const getTypeIcon = (type: string): string => {
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

export const getTypeColor = (type: string): string => {
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
