import { ScreenPage } from "@/components/pages/screen-page";
import { RoomProvider } from "@/components/room";

export default function Page() {
  return (
    <RoomProvider room="main">
      <ScreenPage room="main" />
    </RoomProvider>
  );
}
