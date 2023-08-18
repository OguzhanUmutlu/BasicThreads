const Thread = require("../index");
(async () => {
    console.time("no threads");
    let a = 0;
    for (let i = 0; i < 1_000_000_000; i++) a++;
    console.timeEnd("no threads");
    console.log("result: " + a);

    const doThreaded = async t => {
        console.time(t + " threads");
        const a = (await Promise.all(new Array(t).fill(0).map(_ => Thread((() => {
            let a = 0;
            for (let i = 0; i < 1_000_000_000; i++) a++;
            return a;
        }).toString().replace("1_000_000_000", (1_000_000_000 / t).toString()))))).reduce((a, b) => a + b, 0);
        console.timeEnd(t + " threads");
        console.log("result: " + a);
    };

    await doThreaded(8); // split a trillion into 8 pieces and run them separately in threads
})();