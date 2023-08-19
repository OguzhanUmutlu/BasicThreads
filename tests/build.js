const fs = require("fs");
const path = require("path");
const uglify = require("uglify-js");

const T = Date.now();

const spl1 = fs.readFileSync(path.join(__dirname, "../index.js"), "utf8")
    .split("//@buildExport//");
fs.writeFileSync(
    path.join(__dirname, "../index.module.js"),
    "const Thread = " + spl1[0] + "return Thread;" + spl1[2] + "\nexport default Thread;"
);

const uMain = uglify.minify(fs.readFileSync(path.join(__dirname, "../index.js"), "utf8"));
if (uMain.error) throw uMain.error;
fs.writeFileSync(
    path.join(__dirname, "../index.min.js"),
    uMain.code
);

const uModule = uglify.minify(fs.readFileSync(path.join(__dirname, "../index.module.js"), "utf8"));
if (uModule.error) throw uModule.error;
fs.writeFileSync(
    path.join(__dirname, "../index.module.min.js"),
    uModule.code
);

console.log("Built in " + (Date.now() - T) + "ms!");