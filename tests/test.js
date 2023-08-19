const Thread = require("../index");
(async () => {
    let t = 0;
    setInterval(() => {
        //const date = new Date();
        t++;
        //console.log("[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds().toString().padStart(3, "0") + "] I run every 50 milliseconds!")
    });

    console.time("Counted up to a trillion with no threads");
    let a = 0;
    for (let i = 0; i < 1_000_000_000; i++) a++;
    console.timeEnd("Counted up to a trillion with no threads");
    console.log("With no threads it could tick " + t + " times!")
    t = 0;
    console.log("\n")

    const doThreaded = async t => {
        console.time(t + " threads have come together and counted up to a trillion");
        await Promise.all(new Array(t).fill(0).map(_ => Thread((() => {
            let a = 0;
            for (let i = 0; i < 1_000_000_000; i++) a++;
            return a;
        }).toString().replace("1_000_000_000", (1_000_000_000 / t).toString()))()));
        console.timeEnd(t + " threads have come together and counted up to a trillion");
    };

    await doThreaded(8); // split a trillion into 8 pieces and run them separately in threads
    console.log("With 8 threads it could tick " + t + " times!")
    process.exit();
})();