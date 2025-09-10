// eslint.config.mjs
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    // Replaces globalIgnores()
    {
        ignores: ["**/node_modules/**", "**/build/**", "**/dist/**", "**/scripts/**", "**/src/shared/**"],
    },

    // Core JS recommended rules
    js.configs.recommended,

    // Bring in legacy-style shareable configs via FlatCompat
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:prettier/recommended",
        "prettier"
    ),

    // Your project-specific config
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            react,
            prettier,
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },

        settings: {
            react: {
                version: "detect",
            },
        },

        rules: {
            "prettier/prettier": "error",
            "linebreak-style": ["error", "windows"],
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "@typescript-eslint/no-explicit-any": 0,
            "no-debugger": 0,
        },
    },
];
