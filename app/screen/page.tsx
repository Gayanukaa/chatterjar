import { ScreenPage } from "@/components/pages/screen-page";
import { pickTheme } from "@/lib/screen-theme";

export default async function Page({ searchParams }: PageProps<"/screen">) {
  const { theme } = await searchParams;
  // Server-side ?theme= read so a dark projector paints dark at once.
  const initialTheme = pickTheme(
    typeof theme === "string" ? theme : null,
    null,
  );
  return <ScreenPage initialTheme={initialTheme} />;
}
