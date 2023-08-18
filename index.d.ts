/*type Cloneable = string | number | boolean | undefined | null | Cloneable[] | {
    [key: string | number]: Cloneable
};*/
type Result = Promise<any> & { terminate: () => void };
type Prepare = (callback: Function | string) => ((...args: any[]) => Result) & {
    allowsAny: boolean
    setAllowsAny(value: boolean): Prepare
    definitions: Definitions
    define(object: Record<string, any>): Prepare
    use(object: Record<string, any>): Prepare
    run(...args: any[]): Result
};
type Thread = Prepare & {
    prepare: Prepare
    runner(callback: Function | string): (args: any[], define: Record<string, any>, allowExtra?: boolean) => Result;
};

declare class Definitions extends Map<string, any> {
    define(obj: Record<string, any>): this;
}

export default Thread;

// @ts-ignore
declare global {
    const Thread: Thread;
}