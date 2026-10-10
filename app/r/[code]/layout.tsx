import { notFound } from "next/navigation";
import { RoomProvider } from "@/components/room";
import { ROOM_CODE } from "@/lib/room";

export default async function Layout({
  params,
  children,
}: LayoutProps<"/r/[code]">) {
  const { code } = await params;
  if (!ROOM_CODE.test(code)) notFound();
  return <RoomProvider room={code}>{children}</RoomProvider>;
}
