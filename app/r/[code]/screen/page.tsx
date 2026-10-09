import { notFound } from "next/navigation";
import { ScreenPage } from "@/components/pages/screen-page";
import { RoomProvider } from "@/components/room";
import { pickTheme } from "@/lib/screen-theme";

export default async function Page({
  params,
  searchParams,
}: PageProps<"/r/[code]/screen">) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/.test(code)) notFound();
  const { theme } = await searchParams;
  // Server-side ?theme= read so a dark projector paints dark at once.
  const initialTheme = pickTheme(
    typeof theme === "string" ? theme : null,
    null,
  );
  return (
    <RoomProvider room={code}>
      <ScreenPage room={code} initialTheme={initialTheme} />
    </RoomProvider>
  );
}
