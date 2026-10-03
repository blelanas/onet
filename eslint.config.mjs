import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", ".claude/**", "**/public/demo/**", "packages/shared/messages/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "inline-type-imports", disallowTypeAnnotations: false }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // "@api/*" only exists for the type checker: runtime imports from the API are forbidden.
      "no-restricted-imports": ["error", { patterns: [{ group: ["@api/*"], allowTypeImports: true, message: "Only `import type` is allowed from the API." }] }],
    },
  },
  { files: ["apps/api/**/*.ts", "packages/**/*.{ts,mjs}", "tools/**/*.mjs", "tests/**/*.mjs", "apps/web/scripts/**/*.mjs", "apps/api/scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
);
