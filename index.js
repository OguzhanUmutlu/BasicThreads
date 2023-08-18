(function () {
    //CONTENT//
    let __objId = 0;
    let objId = new Map;
    const getObjId = obj => objId.get(obj) || (objId.set(obj, ++__objId) && __objId);
    const isNode = typeof window === "undefined";
    const _global = isNode ? global : window;

    // todo: connection between threads, thread channels maybe?

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
                    doAllowAny(any.constructor, list, `arguments[2]._${id}`);
                }
                const id = getObjId(any.constructor);
                list.push(`${p}=Object.assign(new arguments[2]._${id}(),${p});`);
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
        let text = cleanFunc(any);
        if (isClass(any) && isClass(prototype)) {
            if (!objId.has(prototype)) {
                const id = getObjId(prototype);
                doAllowAny(prototype, list, `arguments[2]._${id}`);
            }
            const id = getObjId(prototype);
            text = text.replace(new RegExp(`extends\\s+${prototype.name}\\s*\\{`), `extends arguments[2]._${id}{`);
        }
        list.push(`${p}=${text};`);
        return 0;
    }

    function cleanFunc(func) {
        if (isClass(func)) {
            func = func.toString().trim();
            if (!/^class\s+extends\s/.test(func)) func = func.replace(/^class\s+[^({\s]+/, "class ");
            return func;
        }

        func = func.toString().trim();
        const isAsync = func.startsWith("async ");
        if (isAsync) func = func.substring("async ".length).trim();

        // ABC (abc) { return "ABC" }
        if (!func.startsWith("function ") && /^[^(]+\s*\(/.test(func)) {
            return `function ${func}`;
        }

        // function ABC () { return "ABC" }
        // (abc) => "ABC"
        // abc => "ABC"
        return func;
    }

    window.cln = cleanFunc;

    function runnerEnder(worker, func) {
        return (args = [], define = {}, allowAny = true) => {
            const uuid = (isNode ? (global.crypto ?? require("crypto")) : crypto).randomUUID();
            const p = new Promise(r => {
                const onMessage = msg => {
                    if (!msg || msg[0] !== uuid) return;
                    r(msg[1]);
                    worker.terminate();
                };
                if (isNode) worker.on("message", onMessage);
                else worker.addEventListener("message", m => onMessage(m.data));
            });
            p.terminate = () => worker.terminate();
            const definitionReplacements = [];
            if (allowAny) {
                doAllowAny(args, definitionReplacements, "arguments[0]");
                doAllowAny(define, definitionReplacements, "arguments[1]");
            }
            // noinspection JSAnnotator
            const arguments = [args, define, {}];
            const code = `${definitionReplacements.join("")}
const {${Object.keys(define).join(",")}} = arguments[1]
return (async () => (${cleanFunc(func)})(...arguments[0]))(...arguments[0])`;
            worker.postMessage([code, arguments, uuid]);
            return p;
        };
    }

    function runnerNodeRaw(func) {
        const {Worker} = require("worker_threads");
        const worker = new Worker(__filename);
        return runnerEnder(worker, func);
    }

    function runnerWebRaw(func) {
        const worker = new Worker(URL.createObjectURL(new Blob([`
async function cb(args) {
    removeEventListener("message", args);
    args = args.data;
    const res = await Function("arguments", args[0])(args[1]);
    postMessage([args[2], res]);
}
addEventListener("message", cb);
`], {
            type: "application/javascript"
        })));
        return runnerEnder(worker, func);
    }

    const runner = isNode ? runnerNodeRaw : runnerWebRaw;

    function Thread(func) {
        const run = runner(func);
        const out = (...args) => thread.run(...args);
        const thread = {
            allowsAny: true,
            definitions: {},
            setAllowsAny(value = true) {
                this.allowsAny = value;
                return this;
            },
            define(obj) {
                Object.assign(this.definitions, obj);
                return this;
            },
            use(obj) {
                this.define(obj);
                return this;
            },
            run(...args) {
                return run(args, this.definitions, this.allowsAny)
            }
        };
        return Object.assign(out, Thread);
    }

    Thread.prepare = Thread;
    Thread.runner = runner;

    if (isNode) {
        const {isMainThread, parentPort} = require("worker" + "_threads"); // maybe this fixes the possible jsx issues?
        if (!isMainThread) parentPort.once("message", async args => {
            const res = await Function("arguments", args[0])(args[1]);
            parentPort.postMessage([args[2], res]);
        });
    }

    Thread.Thread = Thread;
    Object.freeze(Thread);

    //EXPORT//
    if (isNode) module.exports = Thread;
    else window.Thread = Thread;
    //EXPORT//
    //CONTENT//
})();