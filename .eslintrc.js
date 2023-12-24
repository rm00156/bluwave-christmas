module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'max-len': 0,
    'no-await-in-loop': 0,
    'prefer-destructuring': 0,
    'no-underscore-dangle': 0,
    'global-require': 0,
    'import/no-dynamic-require': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true, // Consider devDependencies as well
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
  },
};
