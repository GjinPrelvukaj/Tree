#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import treeify from "treeify";
import { createCanvas } from "canvas";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { filesize } from "filesize";

function intro() {
  console.clear();
  console.log(chalk.green`

        .     .  .      +     .      .          .      
   .       .      .     #       .           .
      .      .         ###            .      .      .    
    .      .   "#:. .:##"##:. .:#"  .      .
        .      . "####"###"####"  .
     .     "#:.    .:#"###"#:.    .:#"  .        .       .
.             "#########"#########"        .        .      
      .    "#:.  "####"###"####"  .:#"   .       .
   .     .  "#######""##"##""#######"                  .
              ."##"#####"#####"##"           .      .
  .   "#:. ...  .:##"###"###"##:.  ... .:#"     .     .
    .     "#######"##"#####"##"#######"      .     .     
  .    .     "#####""#######""#####"    .      .     .  
          .     "      000      "    .     .  .    .   
     .         .   .   000     .        .       .      
......................O000O.................................
`);
}

intro();

const cacheFile = path.join(process.cwd(), ".dependency-tree-cache.json");

function readCache() {
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }
  return {};
}

function writeCache(cache) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

async function main() {
  const answers = await inquirer.prompt([
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

  const projectPath = path.resolve(answers.path);

  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.error(chalk.red("❌ package.json not found in the specified path"));
    return;
  }

  const cache = readCache();
  const cacheKey = `${projectPath}-${answers.filter}`;

  if (cache[cacheKey]) {
    console.log(chalk.yellow("Using cached result..."));
    displayResult(cache[cacheKey], answers);
    return;
  }

  const spinner = ora("Analyzing dependencies...").start();

  try {
    const packageSizes = await getPackageSizes(projectPath);
    const dependencyTree = JSON.parse(
      await new Promise((resolve, reject) => {
        exec("npm ls --json --prod", { cwd: projectPath }, (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      })
    );

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

function displayResult(formattedTree, answers) {
  if (answers.output === "json") {
    console.log(chalk.cyan(JSON.stringify(formattedTree, null, 2)));
  } else {
    const treeString = treeify.asTree(formattedTree, true);
    console.log(chalk.green(treeString));
  }

  if (answers.export !== "No") {
    const treeString = treeify.asTree(formattedTree, true);
    exportTree(treeString, answers.export);
  }
}

main().catch((error) => console.error(chalk.red(`❌ ${error}`)));

async function getPackageSizes(projectPath) {
  return new Promise((resolve, reject) => {
    exec("npm ls --json --prod", { cwd: projectPath }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const dependencies = JSON.parse(stdout).dependencies;
      const sizes = {};

      Object.keys(dependencies).forEach((dep) => {
        const packagePath = path.join(projectPath, "node_modules", dep);
        const size = getFolderSize(packagePath);
        sizes[dep] = size;
      });

      resolve(sizes);
    });
  });
}

function getFolderSize(folderPath) {
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    }
  });

  return totalSize;
}

function formatDependencyTree(node, filter, packageSizes) {
  const result = {};
  if (node.dependencies) {
    const filterPackages = filter
      ? filter.split(",").map((pkg) => pkg.trim())
      : null;
    Object.keys(node.dependencies).forEach((dep) => {
      if (!filterPackages || filterPackages.includes(dep)) {
        const size = packageSizes[dep] || 0;
        let depString = `${dep}@${node.dependencies[dep].version} (${filesize(
          size
        )})`;
        result[depString] = formatDependencyTree(
          node.dependencies[dep],
          filter,
          packageSizes
        );
      }
    });
  }
  return result;
}

function exportTree(treeString, format) {
  const lines = treeString.split("\n");
  const width = Math.max(...lines.map((line) => line.length)) * 10;
  const height = lines.length * 20;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.font = "14px Arial";
  ctx.fillStyle = "black";

  lines.forEach((line, index) => {
    ctx.fillText(line, 10, (index + 1) * 20);
  });

  const outputPath = `dependency-tree.${format}`;

  if (format === "image") {
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () =>
      console.log(chalk.green(`✅ The PNG file was created: ${outputPath}`))
    );
  } else if (format === "svg") {
    const svgString = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          text {
            font-family: Arial;
            font-size: 14px;
          }
        </style>
        ${lines
          .map(
            (line, index) => `
          <text x="10" y="${(index + 1) * 20}">${line}</text>
        `
          )
          .join("")}
      </svg>
    `;
    fs.writeFileSync(outputPath, svgString);
    console.log(chalk.green(`✅ The SVG file was created: ${outputPath}`));
  }
}
