import { notFound } from "next/navigation";
import { EmbedPage } from "@/components/pages/embed-page";
import { RoomProvider } from "@/components/room";
import { parseEmbed } from "@/lib/embed";

export default async function Page({
  params,
  searchParams,
}: PageProps<"/r/[code]/embed">) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/.test(code)) notFound();
  return (
    <RoomProvider room={code}>
      <EmbedPage room={code} options={parseEmbed(await searchParams)} />
    </RoomProvider>
  );
}
