const fs = require("fs");
const path = require("path");
const uglify = require("uglify-js");

const T = Date.now();

const mainCode = fs.readFileSync(path.join(__dirname, "../index.js"), "utf8");
const spl1 = mainCode
    .split("//@buildExport//");
const moduleCode = "const Thread = " + spl1[0] + "return Thread;" + spl1[2] + "\nexport default Thread;";
fs.writeFileSync(
    path.join(__dirname, "../build/index.mjs"),
    moduleCode
);

const uMain = uglify.minify(mainCode);
if (uMain.error) throw uMain.error;
fs.writeFileSync(
    path.join(__dirname, "../build/index.min.js"),
    uMain.code
);

const uModule = uglify.minify(moduleCode);
if (uModule.error) throw uModule.error;
fs.writeFileSync(
    path.join(__dirname, "../threads.mjs"),
    uModule.code
);

const dtsCode = fs.readFileSync(path.join(__dirname, "../index.d.ts"));
fs.writeFileSync(path.join(__dirname, "../build/index.d.mts"), dtsCode);
fs.writeFileSync(path.join(__dirname, "../build/index.min.d.ts"), dtsCode);
fs.writeFileSync(path.join(__dirname, "../threads.d.mts"), dtsCode);

console.log("Built in " + (Date.now() - T) + "ms!");