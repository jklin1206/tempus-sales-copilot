import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint 9 flat config.
 *
 * `eslint-config-next` still ships in the legacy `.eslintrc` shape, so it is bridged through
 * FlatCompat rather than rewritten by hand. `npm run lint` existed and had no config to run
 * against, which means it had never actually linted anything.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".venv/**", // A Python virtualenv, which ships its own bundled JavaScript.
      ".pytest_cache/**",
      ".code-review-graph/**",
      "codex-prototype/**", // A separate prototype kept for comparison. Not part of this build.
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // A leading underscore is how this codebase marks a parameter that exists to satisfy an
      // interface and is deliberately unused, e.g. KnowledgeProvider.getContext(_input).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
