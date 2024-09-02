#!/usr/bin/env node

import {
  intro,
  readCache,
  writeCache,
  displayResult,
  getPackageSizes,
  formatDependencyTree,
} from "./utils/utils.js";
import { askQuestions } from "./cogs/questions.js";
import { analyzeDependencies } from "./cogs/analysis.js";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs";
import inquirer from "inquirer";

intro();

async function main() {
  const answers = await askQuestions();
  const projectPath = path.resolve(answers.path);
  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.error(chalk.red("❌ package.json not found in the specified path"));
    return;
  }

  const cache = readCache();
  const cacheKey = `${projectPath}-${answers.filter}`;

  if (cache[cacheKey]) {
    const useCache = await inquirer.prompt([
      {
        type: "confirm",
        name: "useCache",
        message: chalk.yellow("Cached result found. Do you want to use it?"),
        default: true,
      },
    ]);

    if (useCache.useCache) {
      console.log(chalk.yellow("Using cached result..."));
      displayResult(cache[cacheKey], answers);
      return;
    }
  }

  const spinner = ora("Analyzing dependencies...").start();

  try {
    const packageSizes = await getPackageSizes(projectPath);
    const dependencyTree = await analyzeDependencies(projectPath);

    const formattedTree = formatDependencyTree(
      dependencyTree,
      answers.filter,
      packageSizes
    );

    spinner.succeed("Analysis complete!");

    cache[cacheKey] = formattedTree;
    writeCache(cache);

    displayResult(formattedTree, answers);
  } catch (error) {
    spinner.fail("Analysis failed");
    console.error(chalk.red(`❌ ${error}`));
  }
}

main().catch((error) => console.error(chalk.red(`❌ ${error}`)));
