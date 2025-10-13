import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

// ESLint flat config with Next.js using official approach
export default [
  // Global ignores - these apply to all configs
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "next.config.ts",
      "next-env.d.ts", // Next.js auto-generated TypeScript file
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
  // Next.js configuration using official FlatCompat approach with Prettier
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript", "prettier"],
  }),

  // Additional custom rules to override Next.js defaults
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {
      // TypeScript rules - relaxed for development
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
      // React rules
      "react/no-unescaped-entities": "off",
      // General rules
      "prefer-const": "warn",
      "sort-imports": [
        "warn",
        {
          ignoreDeclarationSort: true,
        },
      ],
      // quotes: ["warn", "double"], // Disabled to let Prettier handle quotes consistently
    },
  },
];
