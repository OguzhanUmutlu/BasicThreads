const Thread = (function () {
    let __id = 0;
    let objId = new Map;
    const getObjId = obj => objId.get(obj) || (objId.set(obj, ++__id) && __id);
    const isNode = typeof window === "undefined";
    const _global = isNode ? global : window;
    const WT = () => "worker_threads"; // maybe this fixes the possible jsx issues?
    const {Worker: NodeWorker, isMainThread, parentPort} = isNode ? require(WT()) : {};

    if (isNode && !isMainThread) {
        global.close = () => parentPort.close();
        return parentPort.once("message", async args => {
            parentPort.postMessage([args[2], "end", await Function("arguments_", args[0])(args[1])]);
        });
    }

    function isClass(func) {
        return typeof func === "function" && func.prototype && func.prototype.constructor === func;
    }

    function isBuiltInClass(cl) {
        return _global[cl.name] === cl && !Object.keys(_global).includes(cl.name); // IDK why globals work like this
    }

    function doAllowAny(any, list, p) {
        const type = typeof any;
        if (["undefined", "boolean", "number", "bigint", "string", "symbol"].includes(type) || any === null) {
            return any;
        }
        if (type === "object") {
            if (any instanceof ArrayBuffer) {
                list.push(`${p}=new Int8Array(${p}).buffer;`);
                return [...new Int8Array(any)];
            }
            if (any.constructor instanceof Function && !isBuiltInClass(any.constructor)) {
                if (!objId.has(any.constructor)) {
                    const id = getObjId(any.constructor);
                    doAllowAny(any.constructor, list, `arguments_[2]._${id}`);
                }
                const id = getObjId(any.constructor);
                list.push(`${p}=Object.assign(new arguments_[2]._${id}(),${p});`);
                return {...any};
            }
            for (const i in any) {
                any[i] = doAllowAny(any[i], list, p + `[${JSON.stringify(i)}]`);
            }
            return any;
        }
        if (type !== "function") throw new Error("Invalid type: " + type);
        if (isBuiltInClass(any)) {
            list.push(`${p}=${any.name};`);
            return 0;
        }
        const prototype = Object.getPrototypeOf(any);
        let text = stringifyFunction(any);
        if (isClass(any) && isClass(prototype)) {
            if (!objId.has(prototype)) {
                const id = getObjId(prototype);
                doAllowAny(prototype, list, `arguments_[2]._${id}`);
            }
            const id = getObjId(prototype);
            text = text.replace(new RegExp(`extends\\s+${prototype.name}\\s*\\{`), `extends arguments_[2]._${id}{`);
        }
        list.push(`${p}=${text};`);
        return 0;
    }

    function stringifyFunction(func) {
        if (isClass(func)) return `(function(){return ${func.toString().trim()}})()`;
        func = func.toString().trim();
        const isAsync = func.startsWith("async ");
        if (isAsync) func = func.substring("async ".length).trim();
        let startsWithFunction = func.startsWith("function ");

        // ABC (abc) { return "ABC" }
        if (!startsWithFunction && /^[^(=]+\s*\(/.test(func)) return `function ${func}`;

        // (abc) => "ABC"
        // abc => "ABC"
        if (!startsWithFunction) {
            let id = ++__id;
            return `function(...args${id}){return(${func})(...args${id})}`;
        }

        // function ABC () { return "ABC" }
        return `(()=>{return ${func}})()`;
    }

    function runnerProcessor(worker, func, thread) {
        return [worker, (args = [], define = {}, allowAny = true, autoTermination = true) => {
            const uuid = (isNode ? (global.crypto ?? require("crypto")) : crypto).randomUUID();
            const p = new Promise(r => {
                const onMessage = msg => {
                    if (!msg || msg[0] !== uuid) return;
                    if (msg[1] === "end") {
                        r(msg[2]);
                        if (autoTermination) worker.terminate();
                        return;
                    }
                    if (msg[1] === "sendTo") return thread.parent.sendTo(msg[2], msg[3]);
                    if (msg[1] === "broadcast") return thread.parent.broadcast(msg[2]);
                };
                const onTerminate = () => r();
                if (isNode) {
                    worker.on("message", onMessage);
                    worker.on("exit", onTerminate);
                } else {
                    worker.addEventListener("message", m => onMessage(m.data));
                    worker.addEventListener("close", onTerminate)
                }
            });
            p.terminate = () => thread.terminate();
            const definitionReplacements = [];
            if (allowAny) {
                doAllowAny(args, definitionReplacements, "arguments_[0]");
                doAllowAny(define, definitionReplacements, "arguments_[1]");
            }
            // noinspection JSAnnotator
            const arguments_ = [args, define, {}];
            const code = `${definitionReplacements.join("")}
const {${Object.keys(define).join(",")}} = arguments_[1];
const Thread = {
    sendTo: (id, msg) => {
        postMessage(["${uuid}", "sendTo", id, msg]);
    },
    broadcast: msg => {
        postMessage(["${uuid}", "broadcast", msg]);
    }
};
return (async () => (

// YOUR CODE STARTS HERE...
${stringifyFunction(func)}
// YOUR CODE ENDS HERE...

)(...arguments_[0]))()`;
            worker.postMessage([code, arguments_, uuid]);
            return p;
        }];
    }

    function runnerNodeRaw(func, thread) {
        return runnerProcessor(new NodeWorker(__filename), func, thread);
    }

    function runnerWebRaw(func, thread) {
        const worker = new Worker(URL.createObjectURL(new Blob([`
let i = 0;
async function cb(args) {
    if (++i !== 1) return;
    args = args.data;
    postMessage([args[2], "end", await Function("arguments_", args[0])(args[1])]);
}
addEventListener("message", cb);
`.replaceAll("\n", "")], {
            type: "application/javascript"
        })));
        return runnerProcessor(worker, func, thread);
    }

    const runner = isNode ? runnerNodeRaw : runnerWebRaw;

    function makeChannel(parent = null) {
        function Channel(func) {
            const id = ++__id;
            const out = (...args) => thread.run(...args);
            let allowsAny = true;
            let definitions = {};
            let autoTermination = true;
            const thread = {
                __parents: [Thread, Channel],
                get id() {
                    return id;
                },
                get allowsAny() {
                    return allowsAny;
                },
                get autoTermination() {
                    return autoTermination;
                },
                get definitions() {
                    return definitions;
                },
                get worker() {
                    return worker;
                },
                get isAlive() {
                    return !!Thread.threads[id];
                },
                get parent() {
                    return Channel;
                },
                setAllowsAny(value = true) {
                    allowsAny = value;
                    return this;
                },
                setAutoTermination(value = true) {
                    autoTermination = value;
                    return this;
                },
                define(obj) {
                    Object.assign(definitions, obj);
                    return this;
                },
                use(obj) {
                    this.define(obj);
                    return this;
                },
                run(...args) {
                    return run(args, definitions, allowsAny, autoTermination)
                },
                terminate() {
                    Channel.terminate(id);
                    return this;
                }
            };
            Channel.addChild(thread);
            const [worker, run] = runner(func, thread);
            return Object.assign(out, thread);
        }

        Channel.parent = parent;
        Channel.addChild = child => {
            Channel.threads[child.id] = child;
            if (Channel.parent) Channel.parent.addChild(child);
        };
        Channel.prepare = Channel;
        Channel.Thread = Channel;
        Channel.find = function (id) {
            return Channel.threads[id] ?? null;
        };
        Channel.sendTo = function (id, msg) {
            sendTo(id, msg);
        };
        Channel.broadcast = function (msg) {
            for (const id in Channel.threads) sendTo(id, msg);
        }
        Channel.terminate = function (id) {
            const thread = Thread.threads[id];
            if (!thread) return;
            thread.worker.terminate();
            for (const par of thread.__parents) delete par.threads[id];
        };
        Channel.threads = {};
        Channel.immediate = function (cb, ...args) {
            return Channel(cb)(...args);
        };
        return Channel;
    }

    const Thread = makeChannel();

    function sendTo(id, msg) {
        const thread = Thread.threads[id];
        if (!thread) return;
        thread.worker.postMessage(msg);
    }

    return Thread;
})();
export default Thread;