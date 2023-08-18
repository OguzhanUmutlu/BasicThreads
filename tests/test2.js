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

    const a = new A();
    const b = new B();

    const thread = Thread.prepare(() => {

        console.log(a.b(1, 2));

    });

    thread.use({a});

    const result = await thread.run(3, 4);

    console.log(result);
})();