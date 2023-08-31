const isNode = typeof window === "undefined" && typeof require !== "undefined";
const WT = () => "worker_threads"; // maybe this fixes the possible jsx issues?
const {parentPort} = isNode ? require(WT()) : {};
global.close = () => parentPort.close();
let uuid;
if (parentPort) parentPort.on("message", async args => {
    uuid = uuid || args[2];
    if (!args || uuid !== args[2] || args.length !== 3) return;
    parentPort.postMessage([args[2], "end", await Function("arguments_", args[0])(args[1])]);
});