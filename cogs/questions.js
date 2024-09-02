import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";

export async function askQuestions() {
  return inquirer.prompt([
    {
      type: "input",
      name: "path",
      message: chalk.green("📁 Enter the path to the project:"),
      validate: (input) =>
        fs.existsSync(input)
          ? true
          : chalk.red("❌ Project path does not exist"),
    },
    {
      type: "list",
      name: "output",
      message: chalk.green("🖥️ Choose output format:"),
      choices: ["tree", "json"],
      default: "tree",
    },
    {
      type: "list",
      name: "export",
      message: chalk.green("📤 Export the tree?"),
      choices: ["No", "image", "svg"],
      default: "No",
    },
    {
      type: "input",
      name: "filter",
      message: chalk.green(
        "🔍 Enter packages to filter (comma-separated) or leave empty:"
      ),
    },
  ]);
}
