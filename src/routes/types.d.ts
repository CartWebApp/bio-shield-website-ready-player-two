export {};
declare global {
	interface Context {};
	export function useContext(): Context;
	interface Params {};
	export function useParams(): Params;
};