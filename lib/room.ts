import { AsyncLocalStorage } from "node:async_hooks";

export const MAIN_ROOM = "main";
export const ROOM_CODE = /^[a-z0-9]{3,16}$/;

const store = new AsyncLocalStorage<string>();

/** Room of the current request; route() sets it, everything else defaults to main. */
export const currentRoom = () => store.getStore() ?? MAIN_ROOM;

/** Runs fn with every k() key scoped to room. */
export const runInRoom = <T>(room: string, fn: () => T): T =>
  store.run(room, fn);

/** Room code from ?room=, main when absent, or null when malformed. */
export function roomFromUrl(url: URL): string | null {
  const room = url.searchParams.get("room") ?? MAIN_ROOM;
  return ROOM_CODE.test(room) ? room : null;
}
