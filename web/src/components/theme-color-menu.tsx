"use client";

import { Palette } from "lucide-react";
import { useAtom } from "jotai";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { themeColorAtom } from "@/lib/theme-color-atom";
import { THEME_COLOR_PRESETS, isThemeColorId } from "@/lib/theme-colors";

/** Trigger + dropdown for switching the app's preset accent color. */
export function ThemeColorMenu() {
  const [themeColor, setThemeColor] = useAtom(themeColorAtom);
  const activePreset = THEME_COLOR_PRESETS.find(
    (preset) => preset.id === themeColor
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Choose accent color"
            title="Choose accent color"
            className="shrink-0 text-muted-foreground"
          >
            <Palette />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Accent color</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={themeColor}
            onValueChange={(value) => {
              if (typeof value === "string" && isThemeColorId(value)) {
                setThemeColor(value);
              }
            }}
          >
            {THEME_COLOR_PRESETS.map((preset) => (
              <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
                  style={{ backgroundColor: preset.swatch }}
                />
                {preset.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
      <span className="sr-only" aria-live="polite">
        {activePreset ? `${activePreset.label} accent color active` : null}
      </span>
    </DropdownMenu>
  );
}
