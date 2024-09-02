#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import treeify from "treeify";
import { createCanvas } from "canvas";
import inquirer from "inquirer";
import prompt from "inquirer";

async function main() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "path",
      message: "Enter the path to the project:",
      validate: (input) =>
        fs.existsSync(input) ? true : "Project path does not exist",
    },
    {
      type: "list",
      name: "output",
      message: "Choose output format:",
      choices: ["tree", "json"],
      default: "tree",
    },
    {
      type: "list",
      name: "export",
      message: "Export the tree?",
      choices: ["No", "image", "svg"],
      default: "No",
    },
    {
      type: "input",
      name: "filter",
      message: "Enter packages to filter (comma-separated) or leave empty:",
    },
  ]);

  const projectPath = path.resolve(answers.path);

  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.error("package.json not found in the specified path");
    return;
  }

  exec("npm list --json", { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }

    const dependencyTree = JSON.parse(stdout);
    const formattedTree = formatDependencyTree(dependencyTree, answers.filter);

    if (answers.output === "json") {
      console.log(JSON.stringify(formattedTree, null, 2));
    } else {
      const treeString = treeify.asTree(formattedTree, true);
      console.log(treeString);
    }

    if (answers.export !== "No") {
      const treeString = treeify.asTree(formattedTree, true);
      exportTree(treeString, answers.export);
    }
  });
}

main().catch(console.error);

function formatDependencyTree(node, filter) {
  const result = {};
  if (node.dependencies) {
    const filterPackages = filter
      ? filter.split(",").map((pkg) => pkg.trim())
      : null;
    Object.keys(node.dependencies).forEach((dep) => {
      if (!filterPackages || filterPackages.includes(dep)) {
        result[`${dep}@${node.dependencies[dep].version}`] =
          formatDependencyTree(node.dependencies[dep], filter);
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
      console.log(`The PNG file was created: ${outputPath}`)
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
    console.log(`The SVG file was created: ${outputPath}`);
  }
}
