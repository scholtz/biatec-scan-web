import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginVue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  // {
  //   files: ["**/*.css"],
  //   plugins: { css },
  //   language: "css/css",
  //   extends: ["css/recommended"],
  // },
  // Disable multi-word component names for page-level views and single-word components
  {
    files: [
      "src/views/*.vue",
      "src/components/Navbar.vue",
    ],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
  // Disable explicit any for generated API files and complex service files
  {
    files: [
      "src/api/**/*.ts",
      "src/services/**/*.ts",
      "src/types/**/*.ts",
      "src/components/transaction/**/*.vue",
      "src/components/LiquidityList.vue",
      "src/components/TradesList.vue",
      "src/views/**/*.vue",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
