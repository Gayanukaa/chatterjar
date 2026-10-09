import { notFound } from "next/navigation";
import { AdminPage } from "@/components/pages/admin-page";
import { RoomProvider } from "@/components/room";

export default async function Page({ params }: PageProps<"/r/[code]/admin">) {
  const { code } = await params;
  if (!/^[a-z0-9]{3,16}$/.test(code)) notFound();
  return (
    <RoomProvider room={code}>
      <AdminPage room={code} />
    </RoomProvider>
  );
}
