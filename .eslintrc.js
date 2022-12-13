module.exports = {
    env: {
        browser: true,
        es6: true,
        es2017: true,
    },
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: '.',
    },
    plugins: ['prettier', 'powerbi-visuals', '@typescript-eslint'],
    extends: ['prettier', 'plugin:powerbi-visuals/recommended', 'eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {
        'max-lines-per-function': ['error', 500],
        'no-debugger': 1,
    },
};
