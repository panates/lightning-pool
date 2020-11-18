import assert from 'assert';
import {createPool} from '../src';
import {TestFactory} from './support/TestFactory';

describe('Ensuring min resources', function () {
    let pool;

    afterEach(function () {
        pool.close(true);
    });

    it('should pool have at least `min` resource', function (done) {
        pool = createPool(new TestFactory(), {
            min: 2
        });
        pool.start();
        setTimeout(function () {
            pool.acquire();
        }, 10);

        setTimeout(function () {
            assert.strictEqual(pool.size, 2);
            assert.strictEqual(pool.available, 1);
            assert.strictEqual(pool.acquired, 1);
            done();
        }, 20);
    });

    it('should pool have at least `minIdle` resource', function (done) {
        pool = createPool(new TestFactory(), {
            minIdle: 2
        });
        pool.start();
        setTimeout(function () {
            pool.acquire();
        }, 10);

        setTimeout(function () {
            assert.strictEqual(pool.size, 3);
            assert.strictEqual(pool.available, 2);
            assert.strictEqual(pool.acquired, 1);
            done();
        }, 20);
    });

    it('should pool have at least `minIdle` available resource', function (done) {
        pool = createPool(new TestFactory(), {
            min: 2,
            minIdle: 3
        });
        pool.start();
        setTimeout(function () {
            pool.acquire();
        }, 10);

        setTimeout(function () {
            assert.strictEqual(pool.size, 4);
            assert.strictEqual(pool.available, 3);
            assert.strictEqual(pool.acquired, 1);
            done();
        }, 20);
    });

});
