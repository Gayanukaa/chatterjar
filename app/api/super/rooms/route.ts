import { body, fail, json, superRoute } from "@/lib/http";
import { ROOM_CODE } from "@/lib/room";
import { createRoom, deleteRoom, listRooms } from "@/lib/rooms";

/** Lists rooms for the owner (never includes admin tokens). */
export const GET = superRoute(async () => json({ rooms: await listRooms() }));

/** Creates a room; the admin token is in this response only. */
export const POST = superRoute(async (req) => {
  const { title } = await body(req);
  const name = typeof title === "string" ? title.trim() : "";
  if (!name || name.length > 80)
    return fail("Give the room a name (1 to 80 characters).", 400);
  return json({ room: await createRoom(name) }, 201);
});

/** Deletes ?code= and all of its data. The main room cannot be deleted. */
export const DELETE = superRoute(async (req) => {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  // No existence check: a delete also sweeps keys left by a stale instance.
  if (!ROOM_CODE.test(code) || code === "main") {
    return fail("Room not found.", 404);
  }
  return json({ ok: true, deletedKeys: await deleteRoom(code) });
});
