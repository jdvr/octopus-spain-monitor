const CustomError = require('../util/error');

function createExtractService(api, storage) {
  const run = async (year = -1, month = -1) => {
    const now = new Date();
    const requestedYear = year !== -1 ? year : now.getFullYear();
    const requestedMonth = month !== -1 ? month - 1 : now.getMonth();

    if (
      isNaN(requestedYear) ||
      isNaN(requestedMonth) ||
      requestedMonth < 0 ||
      requestedMonth > 11
    ) {
      throw new CustomError(
        'Either year or month is invalid',
        'INVALID_INPUT',
        { requestedYear, requestedMonth },
      );
    }
    const startDate = new Date(Date.UTC(requestedYear, requestedMonth, 1));
    // it seems request a month day 0 is the same than previous month last day
    const endDate = new Date(Date.UTC(requestedYear, requestedMonth + 1, 0));
    console.info('requesting daily consumption for period', {
      startDate,
      endDate,
    });

    try {
      const consumptionData = await api.getDailyConsumption(startDate, endDate);
      const parsedConsumption = consumptionData.map((edge) => ({
        day: parseInt(new Date(edge.node.startAt).getDate()),
        kwh: parseFloat(edge.node.value),
      }));

      const monthlyConsumption = {
        closed: parsedConsumption.length >= endDate.getDate(),
        year: startDate.getFullYear(),
        month: endDate.getMonth() + 1,
        lastUpdated: now.toISOString(),
        consumptions: parsedConsumption,
      };

      await storage.saveMonthlyConsumption(monthlyConsumption);
    } catch (error) {
      console.error(error);
      throw new CustomError(
        'failed to extract data',
        'FAILED_TO_EXTRACT_DATA',
        { year, month },
        error,
      );
    }
  };

  return {
    run,
  };
}

module.exports = createExtractService;
