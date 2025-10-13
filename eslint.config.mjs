import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

// ESLint flat config with Next.js using FlatCompat
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
  // Next.js configuration
  ...compat.config({
    extends: ["next/core-web-vitals", "prettier"],
  }),
  // TypeScript and Prettier configuration
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
      "@typescript-eslint": tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      // General rules
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off",
      "sort-imports": ["warn", { ignoreDeclarationSort: true }], // organize imports
      quotes: ["warn", "double"], // enforce double quotes
      // Prettier integration
      ...prettierConfig.rules,
      "prettier/prettier": ["warn", { singleQuote: false }], // Prettier: double quotes
    },
  },
];
