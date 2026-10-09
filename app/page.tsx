import { StudentPage } from "@/components/pages/student-page";
import { RoomProvider } from "@/components/room";

export default function Page() {
  return (
    <RoomProvider room="main">
      <StudentPage room="main" />
    </RoomProvider>
  );
}
