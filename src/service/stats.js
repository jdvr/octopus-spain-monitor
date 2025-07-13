function calculateStats(consumptions) {
  if (!consumptions || consumptions.length === 0) {
    return {
      total: 0,
      max: 0,
      min: 0,
      p50: 0,
      p90: 0,
    };
  }

  const kwhValues = consumptions.map((c) => c.kwh).sort((a, b) => a - b);
  const total = kwhValues.reduce((sum, kwh) => sum + kwh, 0);
  const max = Math.max(...kwhValues);
  const min = Math.min(...kwhValues);

  const p50Index = Math.floor(kwhValues.length * 0.5);
  const p90Index = Math.floor(kwhValues.length * 0.9);

  return {
    total,
    max,
    min,
    p50: kwhValues[p50Index],
    p90: kwhValues[p90Index],
  };
}

module.exports = {
  calculateStats,
};
