import { Log } from "../src/checks/log";

// Disable all console.log since it makes test logs very noisy
const consoleSpy = jest.spyOn(Log, "log").mockImplementation(jest.fn());
export default consoleSpy;
