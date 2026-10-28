import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'scripts/zs/**'] },
  { languageOptions: { globals: { process: 'readonly', console: 'readonly' } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
