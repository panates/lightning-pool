/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */

const {Pool} = require('./Pool');
const AbortError = require('./AbortError');

module.exports = {
  createPool: function(factory, options) {
    return new Pool(factory, options);
  },
  Pool: Pool,
  PoolState: Pool.PoolState,
  AbortError
};
