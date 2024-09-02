import chalk from "chalk";
import treeify from "treeify";
import fs from "fs";
import { createCanvas } from "canvas";
import path from "path";
import { filesize } from "filesize";
import { exec } from "child_process";
import { getFolderSize } from "../cogs/analysis.js";

export function intro() {
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
....................O000O.................................
`);
}

export function readCache() {
  const cacheFile = path.join(process.cwd(), ".dependency-tree-cache.json");
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }
  return {};
}

export function writeCache(cache) {
  const cacheFile = path.join(process.cwd(), ".dependency-tree-cache.json");
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

export function displayResult(formattedTree, answers) {
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

export async function getPackageSizes(projectPath) {
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

export function formatDependencyTree(node, filter, packageSizes) {
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
            (line, index) =>
              `<text x="10" y="${(index + 1) * 20}">${line}</text>`
          )
          .join("")}
      </svg>
    `;
    fs.writeFileSync(outputPath, svgString);
    console.log(chalk.green(`✅ The SVG file was created: ${outputPath}`));
  }
}
