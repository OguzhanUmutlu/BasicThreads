import {Worker as NodeWorker} from "worker_threads";

type Cloneable = string | number | boolean | undefined | null | Cloneable[] | {
    [key: string | number]: Cloneable
};
type Result = Promise<any> & { terminate(): void };
type ThreadInstance<
    AllowsAny extends boolean = true,
    AutoTermination extends boolean = true,
    Definitions extends Record<string, any> = {}
> = (((...args: any[]) => Result) & {
    readonly id: number
    readonly allowsAny: AllowsAny
    readonly definitions: Definitions
    readonly worker: Worker | NodeWorker
    readonly isAlive: boolean
    readonly parent: Thread
    readonly autoTermination: AutoTermination
    setAllowsAny<T extends boolean>(value: T): ThreadInstance<T, AutoTermination, Definitions>
    setAutoTermination<T extends boolean>(value: T): ThreadInstance<AllowsAny, T, Definitions>
    define<T extends Record<string, any>>(object: T): ThreadInstance<AllowsAny, AutoTermination, Definitions & T>
    use<T extends Record<string, any>>(object: T): ThreadInstance<AllowsAny, AutoTermination, Definitions & T>
    run(...args: any[]): Result
    send(message: Cloneable): ThreadInstance
    terminate(): ThreadInstance
});
type ThreadConstructor = (callback: Function | string) => ThreadInstance;
type Thread = ThreadConstructor & {
    readonly parent: Thread | null;
    readonly children: Thread[]
    threads: Record<number, ThreadInstance>
    prepare: ThreadConstructor
    immediate(callback: Function | string, ...args: any[]): Result
    //runner(callback: Function | string, id?: number): (args: any[], define: Record<string, any>, allowExtra?: boolean) => Result
    Thread: Thread
    find(id: number): ThreadInstance | null
    sendTo(id: number, message: Cloneable): void
    broadcast(message: Cloneable): void
    broadcastToChannel(message: Cloneable): void
    terminate(id: number): void
    channel(): Thread
};

export default Thread;

// @ts-ignore
declare global {
    const Thread: Thread;
}