const detox = require("detox");

jest.setTimeout(180000);

beforeAll(async () => {
  await detox.init(undefined, { launchApp: false });
}, 180000);

afterAll(async () => {
  await detox.cleanup();
}, 120000);

