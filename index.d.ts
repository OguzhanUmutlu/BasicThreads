import {Worker as NodeWorker} from "worker_threads";

type Cloneable = string | number | boolean | undefined | null | Cloneable[] | {
    [key: string | number]: Cloneable
};
type Result<T> = Promise<T> & { terminate(): void };
type ArgumentFunction<T extends any[] = any[], K = any> = (...args: T) => K;
type ThreadInstance<
    FuncArgs extends any[] = any[],
    FuncReturn extends any = any,
    AllowsAny extends boolean = true,
    AutoTermination extends boolean = true,
    Definitions extends Record<string, any> = {}
> = ((...args: FuncArgs) => Result<FuncReturn>) & {
    readonly id: number
    readonly allowsAny: AllowsAny
    readonly definitions: Definitions
    readonly worker: Worker | NodeWorker
    readonly isAlive: boolean
    readonly parent: ThreadChannel
    readonly autoTermination: AutoTermination
    setAllowsAny<T extends boolean>(value: T): ThreadInstance<FuncArgs, FuncReturn, T, AutoTermination, Definitions>
    setAutoTermination<T extends boolean>(value: T): ThreadInstance<FuncArgs, FuncReturn, AllowsAny, T, Definitions>
    define<T extends Record<string, any>>(object: T): ThreadInstance<FuncArgs, FuncReturn, AllowsAny, AutoTermination, Definitions & T>
    use<T extends Record<string, any>>(object: T): ThreadInstance<FuncArgs, FuncReturn, AllowsAny, AutoTermination, Definitions & T>
    run(...args: FuncArgs): Result<FuncReturn>
    send(message: Cloneable): ThreadInstance<FuncArgs, FuncReturn, AllowsAny, AutoTermination, Definitions>
    terminate(): ThreadInstance<FuncArgs, FuncReturn, AllowsAny, AutoTermination, Definitions>
};
type ThreadConstructor<T extends any[] = any[], K = any> = (callback: ArgumentFunction<T, K>) => ThreadInstance<T, K>;
type ThreadChannel = ThreadConstructor & {
    readonly parent: ThreadChannel | null
    readonly children: ThreadChannel[]
    threads: Record<number, ThreadInstance>
    prepare: ThreadConstructor
    immediate<T extends any[] = any[], K = any>(callback: ArgumentFunction<T, K>, ...args: T): Result<K>
    //runner(callback: Function, id?: number): (args: any[], define: Record<string, any>, allowExtra?: boolean) => Result
    Thread: ThreadChannel
    find(id: number): ThreadInstance | null
    sendTo(id: number, message: Cloneable): ThreadChannel
    broadcast(message: Cloneable): ThreadChannel
    broadcastToChannel(message: Cloneable): ThreadChannel
    terminate(id: number): ThreadChannel
    channel(): ThreadChannel
};

type ThreadMain = ThreadChannel & {
    //globalize(): ThreadMain
};

declare const Thread: ThreadMain;

export default Thread;