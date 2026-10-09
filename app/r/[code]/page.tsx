import { notFound } from "next/navigation";
import { StudentPage } from "@/components/pages/student-page";
import { RoomProvider } from "@/components/room";

export default async function Page({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/.test(code)) notFound();
  return (
    <RoomProvider room={code}>
      <StudentPage room={code} />
    </RoomProvider>
  );
}
