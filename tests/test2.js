const Thread = require("../index");
(async () => {
    class A {
        a = 10;

        b(c, d) {
            return c + d;
        };
    }

    class B extends A {
        c = 20;

        d(e, f) {
            return e * f;
        };
    }

    const bInstance = new B();

    const thread = Thread.prepare((a, b) => {

        console.log(bInstance.b(a, b));

    }).use({bInstance});

    const result = await thread.run(3, 4);

    console.log(result);
})();