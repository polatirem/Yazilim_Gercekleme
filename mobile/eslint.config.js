// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // zod idiom: a schema and its inferred type share one name on purpose.
    files: ["src/domain/**/*.ts"],
    rules: { "@typescript-eslint/no-redeclare": "off" },
  },
]);
