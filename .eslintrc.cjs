/* ESLint 8 (legacy config — flat config lands with ESLint 9).
   `npm run lint` runs with --max-warnings 0, so anything set to "warn" here
   fails CI just as an error would; that is deliberate, so the rules below are
   only ones we intend to keep clean. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime', // the new JSX transform — no `import React` needed
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'backups', 'supabase'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    // Fast-Refresh only reliably swaps a module that exports components alone.
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Props are documented by the destructured signature + comments in this
    // codebase; prop-types would be noise on a site with no shared component API.
    'react/prop-types': 'off',
    // Only the characters that genuinely break JSX. The default also forbids
    // ' and ", which would mean writing &apos; through every line of the shop's
    // copy — unreadable, and a trap for whoever edits it next.
    'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    // `fetchpriority` (lowercase) is the correct spelling on React 18: the
    // camelCase `fetchPriority` prop is React 19, and on 18 it warns and falls
    // back. The rule assumes 19, so allow this one name — everything else it
    // catches is still a typo. Drop the ignore when React is upgraded.
    'react/no-unknown-property': ['error', { ignore: ['fetchpriority'] }],
    // Several files already carry `// eslint-disable-next-line no-console`
    // around their deliberate dev logging, so the rule they were written for
    // is on: stray console calls don't ship, intentional ones say so.
    'no-console': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      /* The admin app has ten files that export a helper next to a component.
         only-export-components is a hot-reload ergonomics rule, not a
         correctness one, and unpicking them means moving code around in a
         surface this change doesn't touch — so it stays off HERE and on for
         the public site, where new work happens. Worth its own pass. */
      files: ['src/admin/**/*.{js,jsx}'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
    {
      // build/CI scripts run in Node, not the browser
      files: ['scripts/**/*.{js,mjs}', 'vite.config.js', '*.cjs'],
      env: { node: true, browser: false },
    },
    {
      files: ['**/*.test.{js,jsx}', 'test/**/*.{js,jsx}'],
      env: { node: true },
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', beforeAll: 'readonly', afterEach: 'readonly', vi: 'readonly' },
    },
  ],
};
