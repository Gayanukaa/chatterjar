import { AdminPage } from "@/components/pages/admin-page";
import { RoomProvider } from "@/components/room";

export default function Page() {
  return (
    <RoomProvider room="main">
      <AdminPage room="main" />
    </RoomProvider>
  );
}
