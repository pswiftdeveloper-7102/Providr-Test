import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19's new strict rule flags any setState() inside useEffect.
      // We hit it legitimately in `useActionState` + local UI state patterns
      // (e.g. resetting a severity toggle to its default after the server
      // action returns ok). The React-blessed alternative is a `key` prop on
      // a remount-wrapper around the controlled state — workable but
      // non-trivial per form. Keep as a warning so we still see new
      // occurrences, but don't block builds.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;