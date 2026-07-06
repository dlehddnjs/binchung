import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // eslint-config-next는 legacy .eslintrc 전용이고 eslint@^10과 peer 충돌하므로
    // @next/eslint-plugin-next의 native flat config를 apps/web에만 직접 적용한다.
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    ...nextPlugin.flatConfig.coreWebVitals,
  },
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    ...reactHooksPlugin.configs.flat["recommended-latest"],
  },
  eslintConfigPrettier,
);
