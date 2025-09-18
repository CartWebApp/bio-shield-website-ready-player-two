export {};
declare global {
    export function useContext(
        key?: string
    ): Record<string, Record<string, unknown>>;
}
