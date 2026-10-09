"use client";

import { createContext, useContext, type ReactNode } from "react";

const RoomContext = createContext("main");

/** Makes the room code available to every component below it. */
export function RoomProvider({
  room,
  children,
}: {
  room: string;
  children: ReactNode;
}) {
  return <RoomContext value={room}>{children}</RoomContext>;
}

export const useRoom = () => useContext(RoomContext);
