const { jsonStorage } = require("./json-files");

const fs = require("fs/promises");

const TEST_DIR = "./testdata";

async function testDir(path) {
  try {
    await fs.rm(path, { recursive: true, force: true });
    await fs.mkdir(path, {recursive: true});
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(path, {recursive: true});
      console.log(`${path} created`);
      
      return;
    }
    console.error(err);
    throw err;
  }
}

test("lock new account", async () => {
  const accountTestDir = `${TEST_DIR}/account-lock`;
  await testDir(accountTestDir)
  
  const storage = jsonStorage({ basePath: accountTestDir });
  await storage.lockAccount({ email: "test@mail.com", propertyId: 123 });
  
  const allFiles = await fs.readdir(accountTestDir);
  expect(allFiles).toHaveLength(1);
  expect(allFiles).toContain("account-b6424f9c049f44fcf25d4d48a7e29ccc119cd6febe66171fd42a554797ad956e.json");

  await fs.rm(accountTestDir, { recursive: true, force: true });
});
