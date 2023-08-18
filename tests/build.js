const fs = require("fs");
const path = require("path");
const uglify = require("uglify-js");

const T = Date.now();

const spl1 = fs.readFileSync(path.join(__dirname, "../index.js"), "utf8")
    .split("//EXPORT//");
const spl2 = (spl1[0] + "export default Thread;" + spl1[2]).split("//CONTENT//");
fs.writeFileSync(
    path.join(__dirname, "../index.module.js"),
    spl2[1].split("\n").map(i => i.replace(/^ {4}/, "")).join("\n").trim()
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