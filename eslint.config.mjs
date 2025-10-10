import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import nextPlugin from "@next/eslint-plugin-next";

// Flat ESLint config (ESLint v9) manually wiring Next.js plugin to avoid rushstack patch issue.
export default [
  // Global ignores - these apply to all configs
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "next.config.ts",
      "tailwind.config.js",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      ".env*",
      "dist/**/*",
      "build/**/*",
      "public/**/*",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2023,
        sourceType: "module",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tseslint,
      prettier: prettierPlugin,
    },
    settings: {
      next: { rootDir: ["."] },
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "sort-imports": ["warn", { ignoreDeclarationSort: true }], // organize imports
      quotes: ["warn", "double"], // enforce double quotes
      ...prettierConfig.rules,
      "prettier/prettier": ["warn", { singleQuote: false }], // Prettier: double quotes
    },
  },
];
