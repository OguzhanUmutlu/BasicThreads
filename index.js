(function () {
    let __objId = 0;
    let objId = new Map;
    const getObjId = obj => objId.get(obj) || (objId.set(obj, ++__objId) && __objId);
    // todo: extended classes
    // todo: connection between threads, thread channels maybe?
    function isDefaultClass(cl) {
        const glob = typeof window === "undefined" ? global : window;
        return isClass(cl) && glob[cl.name] === cl && !Object.keys(glob).includes(cl.name); // IDK why globals work like this
    }

    function doAllowExtra(any, list, p) {
        const type = typeof any;
        if (["undefined", "boolean", "number", "bigint", "string", "symbol"].includes(type) || any === null) {
            return any;
        }
        if (type === "object") {
            if (any instanceof ArrayBuffer) {
                list.push(`${p}=new Int8Array(${p}).buffer;`);
                return [...new Int8Array(any)];
            }
            if (any.constructor instanceof Function && !isDefaultClass(any.constructor)) {
                if (!objId.has(any.constructor)) {
                    const id = getObjId(any.constructor);
                    doAllowExtra(any.constructor, list, `arguments[2].__${id}`);
                }
                const id = getObjId(any.constructor);
                list.push(`${p}=Object.assign(new arguments[2].__${id}(),${p});`);
                return {...any};
            }
            for (const i in any) {
                any[i] = doAllowExtra(any[i], list, p + `[${JSON.stringify(i)}]`);
            }
            return any;
        }
        if (type !== "function") throw new Error("Invalid type: " + type);
        if (isDefaultClass(any)) {
            list.push(`${p}=${any.name};`);
            return 0;
        }
        // todo: recursively run for classes that extend this class
        any = cleanFunc(any);
        //console.log(any)
        list.push(`${p}=${any};`);
        return 0;
    }

    function isClass(func) {
        return typeof func === "function" && func.prototype && func.prototype.constructor === func;
    }

    function cleanFunc(func) {
        if (isClass(func)) {
            func = func.toString().trim();
            if (!/^class\s+extends\s/.test(func)) func = func.replace(/^class\s+[^({\s]+/, "class ");
            return func;
        }
        func = func.toString().trim();
        const asyncReg = /^async\s+[^f][^u][^n][^c][^t][^i][^o][^n]\s*\(/.test(func);
        const asyncReg2 = /^async\s+\(/.test(func);
        if (func[0] !== "(" && func.includes("(") && !func.startsWith("async")) {
            func = func.substring(func.indexOf("("));
            func = "function" + func;
        } else if (asyncReg && !asyncReg2) {
            func = func.substring("async".length).trim();
            func = func.substring(func.indexOf("("));
            func = "async function" + func;
        }
        return func;
    }

    function runnerEnder(worker, func) {
        return (args = [], define = {}, allowExtra = true) => {
            const node = typeof window === "undefined";
            const uuid = (node ? (global.crypto ?? require("crypto")) : crypto).randomUUID();
            const p = new Promise(r => {
                if (node) worker.on("message", m => m && m[0] === uuid && (r(m[1]) || worker.terminate()));
                else worker.onmessage = m => {
                    m = m.data;
                    m && m[0] === uuid && (r(m[1]) || worker.terminate());
                };
            });
            p.terminate = () => worker.terminate();
            const definitionReplacements = [];
            if (allowExtra) {
                doAllowExtra(args, definitionReplacements, "arguments[0]");
                doAllowExtra(define, definitionReplacements, "arguments[1]");
            }
            const arguments = [args, define, {}];
            const code = `${definitionReplacements.join("")}
const {${Object.keys(define).join(",")}} = arguments[1]
return (async () => (${cleanFunc(func)})(...arguments[0]))(...arguments[0])`;
            //console.log(code.replaceAll(";", "\n\n"));
            worker.postMessage([code, arguments, uuid]);
            return p;
        };
    }

    function runnerNodeRaw(func, ender = runnerEnder) {
        const {Worker} = require("worker_threads");
        const worker = new Worker(__filename);
        return ender(worker, func);
    }

    function runnerWebRaw(func, ender = runnerEnder) {
        const worker = new Worker(URL.createObjectURL(new Blob([`
onmessage = async args => {
    args = args.data;
    const res = await Function("arguments", args[0])(args[1]);
    postMessage([args[2], res]);
};`], {
            type: "application/javascript"
        })));
        return ender(worker, func);
    }

    class Definitions {
        __obj = {};

        clear() {
            this.__obj = {};
        };

        delete(key) {
            delete this.__obj[key];
        };

        forEach(callback) {
            for (const i in this.__obj) {
                callback(this.__obj[i], i, this);
            }
            return this;
        };

        get(key) {
            return this.__obj[key];
        };

        has(key) {
            return key in this.__obj;
        };

        set(key, value) {
            this.__obj[key] = value;
            return this;
        };

        define(obj) {
            Object.assign(this.__obj, obj);
            return this;
        };

        get size() {
            return Object.keys(this.__obj).length;
        };

        [Symbol.iterator]() {
            return Object.keys(this.__obj).map(i => [i, this.__obj[i]]);
        };
    }

    function makeThreadObject(fn) {
        function Thread(func) {
            const thread = fn(func);
            const self = {
                allowsAny: true,
                definitions: new Definitions,
                setAllowsAny(value = true) {
                    this.allowsAny = value;
                    return this;
                },
                define(obj) {
                    this.definitions.define(obj);
                    return this;
                },
                use(obj) {
                    this.define(obj);
                    return this;
                },
                run(...args) {
                    return thread(args, this.definitions.__obj, this.allowsAny)
                }
            };
            return Object.assign(self.run, self);
        }

        Thread.prepare = Thread;
        Thread.runner = fn;
        return Thread;
    }

    function defineExtra(from, to, n) {
        Object.defineProperty(from, n, {
            get: () => to,
            enumerable: false, configurable: false
        });
    }

    if (typeof window === "undefined") {
        const {isMainThread, parentPort} = require("worker_threads");
        if (isMainThread) {
            const Thread = makeThreadObject(runnerNodeRaw);
            defineExtra(module, Thread, "exports");
            defineExtra(module.exports, Thread, "default");
        } else parentPort.on("message", async args => {
            const res = await Function("arguments", args[0])(args[1]);
            parentPort.postMessage([args[2], res]);
        });
    } else {
        defineExtra(window, makeThreadObject(runnerWebRaw), "Thread");
    }
})();