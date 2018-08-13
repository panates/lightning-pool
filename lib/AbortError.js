/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';

class AbortError extends Error {

  constructor(msg) {
    super(msg);
    if (msg instanceof Error)
      this.nastedError = msg;
  }
}

/**
 * Expose `AbortError`.
 */

module.exports = AbortError;
