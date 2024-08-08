import { Orchestrator } from "../orchestrator";
import { Install } from "../install";
import { Log } from "../checks/log";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doGet() {
  const template = HtmlService.createTemplateFromFile("src/webapp/Index");
  const statusData = isUserInstalled();
  template.installed = statusData.installed;
  template.email = statusData.email;
  return template
    .evaluate()
    .setTitle("Block Calendar Automation")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isUserInstalled(): { installed: boolean; email: string } {
  const triggers = ScriptApp.getProjectTriggers();
  const installed = triggers.length > 0;
  const userEmail = Session.getActiveUser().getEmail();
  return { installed, email: userEmail };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function installForUser() {
  Install.setupTriggers();
  return true; // Return true if installation is successful
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uninstallForUser() {
  Install.removeAllTriggers();
  return true; // Return true if uninstallation is successful
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function runTrialAutomation() {
  const logMessages: string[] = [];
  Log.hook = (entry: string) => {
    logMessages.push(entry);
  };

  Orchestrator.runAllChecks(true /* isDryRun */);
  Log.hook = undefined;
  return logMessages.join("\n");
}
