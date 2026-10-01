"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known on the client; render a neutral icon until then.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const isDark = !mounted || resolvedTheme !== "light";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
