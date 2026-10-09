import { EmbedPage } from "@/components/pages/embed-page";
import { RoomProvider } from "@/components/room";
import { parseEmbed } from "@/lib/embed";

export default async function Page({ searchParams }: PageProps<"/embed">) {
  return (
    <RoomProvider room="main">
      <EmbedPage room="main" options={parseEmbed(await searchParams)} />
    </RoomProvider>
  );
}
