import { notFound } from "next/navigation";
import { ScreenPage } from "@/components/pages/screen-page";
import { RoomProvider } from "@/components/room";

export default async function Page({ params }: PageProps<"/r/[code]/screen">) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/.test(code)) notFound();
  return (
    <RoomProvider room={code}>
      <ScreenPage room={code} />
    </RoomProvider>
  );
}
