import {
  CircleQuestionMark,
  Hand,
  Heart,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { Reaction } from "@/lib/domain";

// CircleQuestionMark is the current lucide name of CircleHelp.
export const REACTIONS: Record<
  Reaction,
  { Icon: LucideIcon; label: string; color: string }
> = {
  applause: { Icon: Hand, label: "Applause", color: "text-amber" },
  love: { Icon: Heart, label: "Love it", color: "text-rose" },
  idea: { Icon: Lightbulb, label: "Great point", color: "text-blue" },
  confused: {
    Icon: CircleQuestionMark,
    label: "I'm lost",
    color: "text-violet",
  },
};
