import nextPlugin from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"],
  },
  ...(Array.isArray(nextPlugin) ? nextPlugin : [nextPlugin]),
];

export default eslintConfig;
