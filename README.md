# Basic Threads

This is a JavaScript thread library that supports both node.js, typescript and web!

## Node.js Installation

In terminal:

```bash
npm install basicthreads
```

In file:

```js
const Thread = require("basicthreads");
// OR
import Thread from "basicthreads";


const thread = Thread(() => 2 + 2);
```

## Web Installation

In file:

```html

<script src="https://unpkg.com/basicthreads"></script>
<script>
    const thread = Thread(() => 2 + 2);
</script>

<!-- OR -->

<script type="module">
    import Thread from "https://unpkg.com/basicthreads/index.module.min.js";

    const thread = Thread(() => 2 + 2);
</script>
```

## [Click me to get more information about BasicThreads from our wiki!](https://github.com/OguzhanUmutlu/BasicThreads/wiki)

## Why use threads in first place?

Threads are vital for managing resource-intensive tasks in programming. Imagine having a large project where certain
tasks, like extensive loops, could freeze the whole application if not handled properly. Threads come into play by
enabling the execution of these tasks in separate threads, preventing the main thread from becoming unresponsive.

For example, when counting from one to a trillion, using threads allows you to split the task into smaller segments.
Each thread independently works on its segment, making the overall process much faster compared to a single-threaded
approach. By leveraging multiple threads, your application remains interactive and completes tasks efficiently,
enhancing the user experience.