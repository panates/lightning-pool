/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';
const {ErrorEx} = require('errorex');

class AbortError extends ErrorEx {
}

/**
 * Expose `AbortError`.
 */

module.exports = AbortError;
