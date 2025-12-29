module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true, jest: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'react-hooks', 'jsx-a11y', '@typescript-eslint'],
  settings: {
    react: { version: 'detect' },
  // Removed custom import resolver to simplify peer deps
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['plugin:@typescript-eslint/recommended'],
  parserOptions: { project: ['./tsconfig.base.json', './backend/tsconfig.json', './frontend/tsconfig.json'] }
    }
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
  'import/no-unresolved': 'off'
  }
};
