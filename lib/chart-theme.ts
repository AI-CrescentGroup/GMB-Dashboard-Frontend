export const chartTheme = {
  grid: { stroke: "#E2E8F0", strokeDasharray: "3 3", vertical: false },
  axis: {
    stroke: "transparent",
    tick: { fill: "#94A3B8", fontSize: 11 },
    tickLine: false,
    axisLine: false,
  },
  tooltip: {
    contentStyle: {
      borderRadius: 10,
      border: "1px solid #E2E8F0",
      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
      padding: "8px 12px",
      fontSize: 12,
    },
    labelStyle: { color: "#64748B", fontWeight: 500, marginBottom: 4 },
  },
  series: ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"],
}
