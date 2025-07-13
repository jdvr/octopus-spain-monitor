const { jsonStorage } = require('./json-files');
const {
  OPEN_CONSUMTION,
  CLOSED_CONSUMTION,
} = require('../fixtures/consumptions');

const fs = require('fs/promises');
const path = require('path');

const TEST_DIR = path.join(__dirname, 'testdata');

async function testDir(path) {
  try {
    await fs.rm(path, { recursive: true, force: true });
    await fs.mkdir(path, { recursive: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path, { recursive: true });

      return;
    }
    console.error(err);
    throw err;
  }
}

test('lock new account', async () => {
  const accountTestDir = path.join(TEST_DIR, 'account-lock');
  await testDir(accountTestDir);

  const storage = jsonStorage({ basePath: accountTestDir });
  await storage.lockAccount({ email: 'test@mail.com', propertyId: 123 });

  const allFiles = await fs.readdir(accountTestDir);
  expect(allFiles).toHaveLength(1);
  expect(allFiles).toContain(
    'account-b6424f9c049f44fcf25d4d48a7e29ccc119cd6febe66171fd42a554797ad956e.json',
  );

  await expect(
    storage.lockAccount({ email: 'different@mail.com', propertyId: 123 }),
  ).rejects.toThrow('FAILED_TO_LOCK_ACCOUNT');
  await expect(
    storage.lockAccount({ email: 'test@mail.com', propertyId: 456 }),
  ).rejects.toThrow('FAILED_TO_LOCK_ACCOUNT');

  await fs.rm(accountTestDir, { recursive: true, force: true });
});

test('save and read consumption', async () => {
  const localTestDir = path.join(TEST_DIR, 'save-and-read');
  await testDir(localTestDir);

  const storage = jsonStorage({ basePath: localTestDir });
  await storage.saveMonthlyConsumption(OPEN_CONSUMTION);
  await storage.saveMonthlyConsumption(CLOSED_CONSUMTION);

  const firstConsumption = await storage.readMonthlyConsumption(
    OPEN_CONSUMTION.year,
    OPEN_CONSUMTION.month,
  );
  expect(firstConsumption).toEqual(OPEN_CONSUMTION);

  const secondConsumption = await storage.readMonthlyConsumption(
    CLOSED_CONSUMTION.year,
    CLOSED_CONSUMTION.month,
  );
  expect(secondConsumption).toEqual(CLOSED_CONSUMTION);

  // Override exsiting files
  const newLastUpdated = '2026-01-13T12:33:27.751Z';
  const openConsumtionUpdated = {
    ...OPEN_CONSUMTION,
    lastUpdated: newLastUpdated,
  };
  await storage.saveMonthlyConsumption(openConsumtionUpdated);
  const updatedConsumption = await storage.readMonthlyConsumption(
    OPEN_CONSUMTION.year,
    OPEN_CONSUMTION.month,
  );
  expect(updatedConsumption.lastUpdated).toEqual(newLastUpdated);
  expect(updatedConsumption.consumptions).toEqual(OPEN_CONSUMTION.consumptions);

  await fs.rm(localTestDir, { recursive: true, force: true });
});
