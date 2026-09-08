# lightning-pool

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CI Tests][ci-test-image]][ci-test-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## About

High performance resource pool written with TypeScript.

 - A fast Resource Pool implementation for JavaScript - see [doc/BENCHMARKS.md](doc/BENCHMARKS.md) for the numbers against [generic-pool](https://github.com/coopernurse/node-pool), or [benchmark/README.md](benchmark/README.md) to reproduce them yourself
 - Advanced configuration options, suits for enterprise level applications
 - Configuration can be changed while pool running
 - Promise based factory supported
 - Supports validation and resource reset
 - Fully tested. (%100 coverage)

## Installation

  - `npm install lightning-pool --save`

## Example

```ts
import {Pool} from 'lightning-pool';
import dbDriver from 'some-db-driver';

/**
 * Step 1 - Create a factory object
 */
const factory = {
    create: async function(opts) {
        const client = await DbDriver.createClient();
        return client;
    },
    destroy: async function(client) {  
       await client.close();       
    },
    reset: async function(client){   
       await client.rollback();       
    },
    validate: async function(client) {
       await client.query('select 1');       
    }    
};

/**
 * Step 2 - Create a the pool object
 */
const pool = new Pool(factory, {  
    max: 10,    // maximum size of the pool
    min: 2,     // minimum size of the pool
    minIdle: 2  // minimum idle resources
});

pool.start();

/**
 * Step 3 - Use pool in your code to acquire/release resources
 */
// acquire connection - Promise is resolved
const client = await pool.acquire();
// once a resource becomes available
// Use resource
await client.query("select * from foo");
// return object back to pool
await pool.releaseAsync(client);

/**
 * Step 4 - Shutdown pool (optional)
 * Call close(force) when you need to shutdown the pool
 */

// Wait for active resource for 5 sec than force shutdown
await pool.close(5000);
```

## Documentation

See [doc/API.md](doc/API.md) for the full API reference - factory/options shape, every method and property,
emitted events, and the `PoolState`/`ResourceState` enums.

## Node Compatibility

  - node `>= 16.0`;
  
### License
[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/lightning-pool.svg
[npm-url]: https://npmjs.org/package/lightning-pool
[ci-test-image]: https://github.com/panates/lightning-pool/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/lightning-pool/actions/workflows/test.yml
[coveralls-image]: https://img.shields.io/coveralls/panates/lightning-pool/master.svg
[coveralls-url]: https://coveralls.io/r/panates/lightning-pool
[downloads-image]: https://img.shields.io/npm/dm/lightning-pool.svg
[downloads-url]: https://npmjs.org/package/lightning-pool
[gitter-image]: https://badges.gitter.im/panates/lightning-pool.svg
[gitter-url]: https://gitter.im/panates/lightning-pool?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[dependencies-image]: https://david-dm.org/panates/lightning-pool/status.svg
[dependencies-url]:https://david-dm.org/panates/lightning-pool
[devdependencies-image]: https://david-dm.org/panates/lightning-pool/dev-status.svg
[devdependencies-url]:https://david-dm.org/panates/lightning-pool?type=dev
[quality-image]: http://npm.packagequality.com/shield/lightning-pool.png
[quality-url]: http://packagequality.com/#?package=lightning-pool
