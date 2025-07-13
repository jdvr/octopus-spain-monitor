const fs = require('fs/promises')
const crypto = require("crypto");

function consumptionFileName(year, month) {
  return `consumption-${year}-${month}.json`;
}

// Run checksum of email+properyId and creates a file name account-checksum.json
function accountFileName(email, propertyId) {
  const checksum = crypto
    .createHash("sha256")
    .update(`${email}:${propertyId}`)
    .digest("hex");
  return `account-${checksum}.json`;
}

async function listJsonFiles(basePath) {
    try {
        const allFiles = await fs.readdir(basePath);
        return allFiles.filter(file => 
            path.extname(file).toLowerCase() === '.json'
        );
    } catch (error) {
        console.error(`Fail to list "${basePath}":`, error);
        return [];
    }
}

function jsonStorage(config) {
  const { basePath } = config;

  const lockAccount = async (account) =>{
    const {email, propertyId} = account
    const lockFileName = accountFileName(email, propertyId)
    const filePath = `${basePath}/${lockFileName}`
    
    try {
        const dataFiles = await listJsonFiles(basePath);
        const existingAccountFile = dataFiles.find(fileName => fileName.include('account-'))
        if (existingAccountFile && existingAccountFile !== lockFileName) {
            console.error(`There is a lock file ${existingAccountFile} different from ${lockFileName}`)
            throw Error('LOCCKED_ACCOUNT_CHANGED')
        }
        await fs.writeFile(filePath, JSON.stringify({lock: true}, null, 2), 'utf-8');
    } catch (error) {
        throw new Error('FAILED_TO_LOCK_ACCOUNT', {cause: error})
    }
  }

  return {
    lockAccount
  };
}


module.exports = {
    jsonStorage
}