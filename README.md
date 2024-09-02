# Dependency Tree Visualizer

This is a command-line tool to visualize the dependency tree of a Node.js project.

## Installation

To install the tool globally, run the following command:

git clone https://github.com/GjinPrelvukaj/Tree
cd Tree
npm install -g .

## Usage

After installation, you can use the tool by running the `tree` command followed by the path to your project:

tree --path "path/to/your/project"

### Options

- `--path`: Specifies the path to the project (required)

### Example

tree --path "/Users/username/projects/my-node-project"

This will display a tree structure of your project's dependencies in the console.

## Requirements

- Node.js
- npm

## Notes

- The tool requires a `package.json` file to be present in the specified project directory.
- It uses `npm list` command internally, so make sure you have npm installed and the dependencies are installed in your project.

## Troubleshooting

If you encounter any issues, make sure:

1. You have Node.js and npm installed.
2. The specified path is correct and contains a `package.json` file.
3. You have the necessary permissions to read the project directory and execute npm commands.

For any other issues, please refer to the project's issue tracker on GitHub.
