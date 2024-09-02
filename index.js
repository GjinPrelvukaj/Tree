#!/usr/bin/env node

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const treeify = require("treeify");

const argv = yargs(hideBin(process.argv))
  .scriptName("tree")
  .usage("$0 [options]")
  .example('tree --path "path to project"')
  .command({
    command: "$0",
    describe: "Visualize the dependency tree of a project",
    builder: {
      path: {
        describe: "Path to the project",
        demandOption: true,
        type: "string",
      },
    },
    handler: function (argv) {
      const projectPath = path.resolve(argv.path);

      if (!fs.existsSync(projectPath)) {
        console.error("Project path does not exist");
        return;
      }

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
        const formattedTree = formatDependencyTree(dependencyTree);
        console.log(treeify.asTree(formattedTree, true));
      });
    },
  })
  .help().argv;

function formatDependencyTree(node) {
  const result = {};
  if (node.dependencies) {
    Object.keys(node.dependencies).forEach((dep) => {
      result[`${dep}@${node.dependencies[dep].version}`] = formatDependencyTree(
        node.dependencies[dep]
      );
    });
  }
  return result;
}
