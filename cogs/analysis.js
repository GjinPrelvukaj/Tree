import { exec } from "child_process";
import path from "path";
import fs from "fs";

export function analyzeDependencies(projectPath) {
  return new Promise((resolve, reject) => {
    exec("npm ls --json --prod", { cwd: projectPath }, (error, stdout) => {
      if (error) reject(error);
      else resolve(JSON.parse(stdout));
    });
  });
}

export function getFolderSize(folderPath) {
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
