const { calculateStats } = require('./stats');

function createReportService(storage) {
  const monthlyReport = async (year, month) => {
    const monthlyConsumption = await storage.readMonthlyConsumption(
      year,
      month,
    );
    if (
      !monthlyConsumption.consumptions ||
      monthlyConsumption.consumptions.length === 0
    ) {
      return monthlyConsumption;
    }

    const stats = calculateStats(monthlyConsumption.consumptions);
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousMonthlyConsumption = await storage.readMonthlyConsumption(
      previousYear,
      previousMonth,
    );

    if (previousMonthlyConsumption.consumptions) {
      const previousStats = calculateStats(
        previousMonthlyConsumption.consumptions,
      );
      stats.diff = stats.total - previousStats.total;
    }

    return {
      ...monthlyConsumption,
      stats,
    };
  };

  const yearlyReport = async (year) => {
    const monthlyConsumptions = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        storage.readMonthlyConsumption(year, i + 1),
      ),
    );

    return monthlyConsumptions.filter(
      (mc) => mc.consumptions && mc.consumptions.length > 0,
    );
  };

  const periodForLastDays = async (amountOfDays) => {
    if (amountOfDays > 365) {
      throw new Error('MAX_PERIOD_EXCEEDED');
    }

    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - (amountOfDays - 1) * 24 * 60 * 60 * 1000,
    );
    startDate.setHours(0, 0, 0, 0);

    let allConsumptions = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthlyConsumption = await storage.readMonthlyConsumption(
        year,
        month,
      );

      if (
        monthlyConsumption.consumptions &&
        monthlyConsumption.consumptions.length > 0
      ) {
        allConsumptions = allConsumptions.concat(
          monthlyConsumption.consumptions.map((c) => ({
            ...c,
            date: `${year}-${String(month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`,
          })),
        );
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
      currentDate.setDate(1);
    }

    const filteredConsumptions = allConsumptions.filter((c) => {
      const consumptionDate = new Date(c.date);
      return consumptionDate >= startDate && consumptionDate <= endDate;
    });

    const stats = calculateStats(filteredConsumptions);

    return {
      consumptions: filteredConsumptions,
      stats,
    };
  };

  return {
    monthlyReport,
    yearlyReport,
    periodForLastDays,
  };
}

module.exports = createReportService;
