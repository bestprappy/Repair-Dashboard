import {
  atomWithStorage,
  createJSONStorage,
  unstable_withStorageValidator as withStorageValidator,
} from "jotai/utils";

import {
  DEFAULT_THEME_COLOR,
  THEME_COLOR_STORAGE_KEY,
  isThemeColorId,
  type ThemeColorId,
} from "@/lib/theme-colors";

const themeColorStorage = withStorageValidator(isThemeColorId)(
  createJSONStorage<unknown>()
);

export const themeColorAtom = atomWithStorage<ThemeColorId>(
  THEME_COLOR_STORAGE_KEY,
  DEFAULT_THEME_COLOR,
  themeColorStorage
);
