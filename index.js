require('dotenv').config();

const express = require('express');
const createApi = require('./src/api');
const createExtractService = require('./src/service/extract');
const createReportService = require('./src/service/report');
const jsonStorage = require('./src/storage/json-files');

const path = require('path')

const app = express();
const port = 7000;

const {
  API_URL,
  OCTOPUS_EMAIL,
  OCTOPUS_PASSWORD,
  OCTOPUS_PROPERTY_ID,
} = process.env;

const ALL_CONFIG_EXISTS =
  API_URL &&
  OCTOPUS_EMAIL &&
  OCTOPUS_PASSWORD &&
  OCTOPUS_PROPERTY_ID
if (!ALL_CONFIG_EXISTS) {
  console.error('Ensure all env var are available. Check .env.sample file');
  process.exit(1);
}

const api = createApi({
  apiUrl: API_URL,
  email: OCTOPUS_EMAIL,
  password: OCTOPUS_PASSWORD,
  propertyId: OCTOPUS_PROPERTY_ID,
});

const storage = jsonStorage({ basePath: path.join(__dirname, 'db') });
const extractService = createExtractService(api, storage);
const reportService = createReportService(storage);

/**
 * =================================================================
 * ENDPOINTS
 * =================================================================
 */

app.get('/update', async (req, res) => {
  try {
    const { year, month } = req.query;
    const yearNum = year ? parseInt(year, 10) : undefined;
    const monthNum = month ? parseInt(month, 10) : undefined;

    const now = new Date();
    const targetYear = yearNum || now.getFullYear();
    const targetMonth = monthNum || now.getMonth() + 1;

    const existingConsumption = await storage.readMonthlyConsumption(
      targetYear,
      targetMonth,
    );
    if (existingConsumption.closed) {
      return res
        .status(200)
        .send({
          message: 'Consumption data is already closed for this month.',
        });
    }

    await extractService.run(yearNum, monthNum);
    res.status(200).send({ message: 'Extraction process finished.' });
  } catch (error) {
    console.error('--- Extraction process failed ---', error);
    res.status(500).send({
      error: 'Failed to extract data.',
      details: error.message,
    });
  }
});

app.get('/report/last/:days/days', async (req, res) => {
  try {
    const { days } = req.params;
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum)) {
      return res.status(400).send({ error: 'Invalid number of days.' });
    }
    const report = await reportService.periodForLastDays(daysNum);
    res.status(200).json(report);
  } catch (error) {
    console.error('--- Report generation failed ---', error);
    res.status(500).send({
      error: 'Failed to generate report.',
      details: error.message,
    });
  }
});

app.get('/report/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return res.status(400).send({ error: 'Invalid year.' });
    }
    const report = await reportService.yearlyReport(yearNum);
    res.status(200).json(report);
  } catch (error) {
    console.error('--- Report generation failed ---', error);
    res.status(500).send({
      error: 'Failed to generate report.',
      details: error.message,
    });
  }
});

app.get('/report/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).send({ error: 'Invalid year or month.' });
    }
    const report = await reportService.monthlyReport(yearNum, monthNum);
    res.status(200).json(report);
  } catch (error) {
    console.error('--- Report generation failed ---', error);
    res.status(500).send({
      error: 'Failed to generate report.',
      details: error.message,
    });
  }
});

app.use(function(req, res, next) {
  res.status(404);
 res.json({ error: 'Not found' });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
