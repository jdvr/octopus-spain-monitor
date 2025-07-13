const createReportService = require('./report');
const {
  OPEN_CONSUMTION,
  CLOSED_CONSUMTION,
} = require('../fixtures/consumptions');

describe('Report Service', () => {
  let storage;
  let reportService;

  beforeEach(() => {
    storage = {
      readMonthlyConsumption: jest.fn(),
    };
    reportService = createReportService(storage);
  });

  describe('monthlyReport', () => {
    it('should return monthly report with stats', async () => {
      storage.readMonthlyConsumption.mockResolvedValue(CLOSED_CONSUMTION);
      const report = await reportService.monthlyReport(2025, 6);
      expect(report.stats).toBeDefined();
      expect(report.stats.total).toBeCloseTo(296.514);
    });

    it('should return empty report for missing months', async () => {
      storage.readMonthlyConsumption.mockResolvedValue({});
      const report = await reportService.monthlyReport(2025, 9);
      expect(report).toEqual({});
    });

    it('should include diff with previous month', async () => {
      storage.readMonthlyConsumption.mockImplementation((year, month) => {
        if (month === 6) return CLOSED_CONSUMTION;
        if (month === 5) return OPEN_CONSUMTION;
        return {};
      });
      const report = await reportService.monthlyReport(2025, 6);
      expect(report.stats.diff).toBeDefined();
      expect(report.stats.diff).toBeCloseTo(203.649);
    });
  });

  describe('yearlyReport', () => {
    it('should return all monthly reports for a year', async () => {
      storage.readMonthlyConsumption.mockResolvedValue(CLOSED_CONSUMTION);
      const reports = await reportService.yearlyReport(2025);
      expect(reports.length).toBe(12);
    });
  });

  describe('periodForLastDays', () => {
    it('should return a report for the last 30 days', async () => {
      const today = new Date('2025-07-13T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(today);

      storage.readMonthlyConsumption.mockImplementation((year, month) => {
        if (year === 2025 && month === 7) {
          return Promise.resolve({
            ...CLOSED_CONSUMTION,
            month: 7,
          });
        }
        if (year === 2025 && month === 6) {
          return Promise.resolve({
            ...CLOSED_CONSUMTION,
            month: 6,
          });
        }
        return Promise.resolve({});
      });

      const report = await reportService.periodForLastDays(30);
      expect(report.consumptions.length).toBe(30);
      expect(report.stats.total).toBeCloseTo(296.514);
    });

    it('should throw error if period is too long', async () => {
      await expect(reportService.periodForLastDays(400)).rejects.toThrow(
        'MAX_PERIOD_EXCEEDED',
      );
    });
  });
});
