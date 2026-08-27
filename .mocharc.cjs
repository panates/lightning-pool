process.env.TS_NODE_PROJECT = __dirname + '/test/tsconfig.json';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  require: ['@swc-node/register/esm-register'],
  extension: ['ts'],
  spec: './test/**/*.spec.ts',
  timeout: 30000,
};
