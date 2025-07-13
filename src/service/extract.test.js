const createExtractService = require('./extract');
const CustomError = require('../util/error');
const apiReponseJuly = require('../fixtures/api-daily-consumption-july.json')
  .data.property.measurements.edges;
const apiResponseJune = require('../fixtures/api-daily-consumption-june.json')
  .data.property.measurements.edges;

describe('extractService', () => {
  let api;
  let storage;
  let extractService;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    api = {
      getDailyConsumption: jest.fn(),
    };
    storage = {
      saveMonthlyConsumption: jest.fn(),
    };
    extractService = createExtractService(api, storage);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should extract and save consumption data for a given month', async () => {
    const year = 2024;
    const month = 7;
    api.getDailyConsumption.mockResolvedValue(apiReponseJuly);

    await extractService.run(year, month);

    expect(api.getDailyConsumption).toHaveBeenCalledWith(
      new Date(Date.UTC(year, month - 1, 1)),
      new Date(Date.UTC(year, month, 0)),
    );

    expect(storage.saveMonthlyConsumption).toHaveBeenCalledTimes(1);
    const savedData = storage.saveMonthlyConsumption.mock.calls[0][0];
    expect(savedData.year).toBe(year);
    expect(savedData.month).toBe(month);
    expect(savedData.closed).toBe(false);
    expect(savedData.consumptions).toHaveLength(10);
    const consumption = savedData.consumptions[0];
    expect(consumption).toHaveProperty('day');
    expect(consumption).toHaveProperty('kwh');
  });

  it('should handle incomplete consumption data for a month', async () => {
    const year = 2024;
    const month = 6;
    api.getDailyConsumption.mockResolvedValue(apiResponseJune);

    await extractService.run(year, month);

    const savedData = storage.saveMonthlyConsumption.mock.calls[0][0];
    expect(savedData.closed).toBe(true);
  });

  it('should use current year and month if not provided', async () => {
    const now = new Date('2024-07-15T10:00:00.000Z');
    const OriginalDate = global.Date;
    const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length) {
        return new OriginalDate(...args);
      }
      return now;
    });
    dateSpy.UTC = OriginalDate.UTC;

    api.getDailyConsumption.mockResolvedValue(apiReponseJuly);

    await extractService.run();

    expect(api.getDailyConsumption).toHaveBeenCalledWith(
      new Date(Date.UTC(2024, 6, 1)),
      new Date(Date.UTC(2024, 7, 0)),
    );
    expect(storage.saveMonthlyConsumption).toHaveBeenCalledTimes(1);
    dateSpy.mockRestore();
  });

  it('should throw a CustomError for invalid input', async () => {
    try {
      await extractService.run(2024, 13);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe('Either year or month is invalid');
      expect(error.code).toBe('INVALID_INPUT');
    }
  });

  it('should throw a CustomError if api fails', async () => {
    const year = 2024;
    const month = 7;
    api.getDailyConsumption.mockRejectedValue(new Error('API Error'));

    try {
      await extractService.run(year, month);
    } catch (error) {
      console.log(error);
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe('failed to extract data');
      expect(error.code).toBe('FAILED_TO_EXTRACT_DATA');
    }
  });
});
