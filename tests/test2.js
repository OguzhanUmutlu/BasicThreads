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

    const b = new B();

    const thread = Thread.prepare(() => {

        console.log(b.b(1, 2));

    });

    thread.use({b});

    const result = await thread.run(3, 4);

    console.log(result);
})();