import {
  CircleQuestionMark,
  Hand,
  Heart,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { Reaction } from "@/lib/domain";

// CircleQuestionMark is the current lucide name of CircleHelp.
export const REACTION_ICONS: Record<Reaction, LucideIcon> = {
  applause: Hand,
  love: Heart,
  idea: Lightbulb,
  confused: CircleQuestionMark,
};

export const REACTION_LABELS: Record<Reaction, string> = {
  applause: "Applause",
  love: "Love it",
  idea: "Great point",
  confused: "I'm lost",
};

export const REACTION_COLORS: Record<Reaction, string> = {
  applause: "text-amber",
  love: "text-rose",
  idea: "text-blue",
  confused: "text-violet",
};
