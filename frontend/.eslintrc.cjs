module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "react", "react-hooks"],
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier"
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 2020,
        sourceType: "module"
    },
    settings: {
        react: {
            version: "detect"
        }
    },
    rules: {
        "react/prop-types": "off",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn"
    },
    ignorePatterns: ["build", "node_modules", "dist"]
};

