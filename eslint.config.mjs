import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores(["dist/**", "out/**", "build/**"]),
]);

export default eslintConfig;
