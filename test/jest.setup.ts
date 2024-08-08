import { Log } from "../src/checks/log";

// Disable all console.log since it makes test logs very noisy
const consoleSpy = jest.spyOn(Log, "log").mockImplementation(jest.fn());
export default consoleSpy;

const scriptPropertiesMock = {
  getProperty: jest.fn(),
  setProperty: jest.fn(),
  deleteProperty: jest.fn(),
  getProperties: jest.fn(),
  setProperties: jest.fn(),
  deleteAllProperties: jest.fn(),
  getKeys: jest.fn(), // Add the missing method
};

const PropertiesService = {
  getScriptProperties: jest.fn(() => scriptPropertiesMock),
  getDocumentProperties: jest.fn(),
  getUserProperties: jest.fn(),
};

global.PropertiesService = PropertiesService;
