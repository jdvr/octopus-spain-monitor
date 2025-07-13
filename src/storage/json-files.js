const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

// Run checksum of email+properyId and creates a file name account-checksum.json
function accountFileName(email, propertyId) {
  const checksum = crypto
    .createHash('sha256')
    .update(`${email}:${propertyId}`)
    .digest('hex');
  return `account-${checksum}.json`;
}

function monthlyConsumptionFileName(year, month) {
  return `consumption-${year}-${month}.json`;
}

async function listJsonFiles(basePath) {
  try {
    const allFiles = await fs.readdir(basePath);
    return allFiles.filter(
      (file) => path.extname(file).toLowerCase() === '.json',
    );
  } catch (error) {
    console.error(`Fail to list "${basePath}":`, error);
    return [];
  }
}

function jsonStorage(config) {
  const { basePath } = config;

  const lockAccount = async (account) => {
    const { email, propertyId } = account;
    const lockFileName = accountFileName(email, propertyId);
    const filePath = `${basePath}/${lockFileName}`;

    try {
      const dataFiles = await listJsonFiles(basePath);
      const existingAccountFile = dataFiles.find((fileName) =>
        fileName.include('account-'),
      );
      if (existingAccountFile && existingAccountFile !== lockFileName) {
        console.error(
          `There is a lock file ${existingAccountFile} different from ${lockFileName}`,
        );
        throw Error('LOCCKED_ACCOUNT_CHANGED');
      }
      await fs.writeFile(
        filePath,
        JSON.stringify({ lock: true }, null, 2),
        'utf-8',
      );
    } catch (error) {
      throw new Error('FAILED_TO_LOCK_ACCOUNT', { cause: error });
    }

    return true;
  };

  const saveMonthlyConsumption = async (monthlyConsumption) => {
    const { year, month } = monthlyConsumption;
    const fileName = monthlyConsumptionFileName(year, month);
    const filePath = path.join(basePath, fileName);
    try {
      await fs.writeFile(
        filePath,
        JSON.stringify(monthlyConsumption, null, 2),
        'utf-8',
      );
    } catch (error) {
      throw new Error('FAILED_TO_SAVE_MONTHLY_CONSUMPTION', { cause: error });
    }
  };

  const readMonthlyConsumption = async (year, month) => {
    const fileName = monthlyConsumptionFileName(year, month);
    const filePath = path.join(basePath, fileName);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        //"Error, No such file or directory"
        return {};
      } else {
        throw new Error('FAILED_TO_READ_FILE', { cause: error });
      }
    }
  };

  return {
    lockAccount,
    saveMonthlyConsumption,
    readMonthlyConsumption,
  };
}

module.exports = {
  jsonStorage,
};
