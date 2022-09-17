import { createPool, Pool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Creating pool', function () {

  let pool;

  it('should createPool must be a function', function (done) {
    pool = createPool(new TestFactory());
    expect(typeof createPool).toStrictEqual('function');
    done();
  });

  it('should validate `factory` argument', function () {
    expect(() => {
      // @ts-ignore
      createPool();
    }).toThrow('You must provide');
  });

  it('should check `factory` object must have a `create` function property', function () {
    expect(() => {
      // @ts-ignore
      createPool({});
    }).toThrow('factory.create must be a function');
    expect(() => {
      // @ts-ignore
      createPool({create: 'abc'});
    }).toThrow('factory.create must be a function');
  });

  it('should check `factory` object must have a `destroy` function property', function () {
    expect(() => {
      // @ts-ignore
      createPool({
        create: () => {
          //
        }
      });
    }).toThrow('factory.destroy must be a function');
    expect(() => {
      createPool({
        create: () => {
          //
        },
        // @ts-ignore
        destroy: 'abc'
      });
    }).toThrow('factory.destroy must be a function');

    expect(
        // @ts-ignore
        createPool({
          create() {
            //
          },
          destroy() {
            //
          }
        })).toBeInstanceOf(Pool);
  });

  it('should check `factory` object can have a `validate` function property', function () {
    expect(() => {
      createPool({
        create() {
          //
        },
        destroy() {
          //
        },
        // @ts-ignore
        validate: 'abc'
      });
    }).toThrow('factory.validate can be a function');
    expect(
        // @ts-ignore
        createPool({
          create() {
            //
          },
          destroy() {
            //
          },
          validate() {
            //
          }
        })).toBeInstanceOf(Pool);
  });

  it('should check `factory` object can have a `reset` function property', function () {
    expect(() => {
      // @ts-ignore
      createPool({
        create() {
          //
        },
        destroy() {
          //
        },
        // @ts-ignore
        reset: 'abc'
      });
    }).toThrow('factory.reset can be a function');
    expect(
        // @ts-ignore
        createPool({
          create() {
            //
          },
          destroy() {
            //
          },
          reset() {
            //
          }
        })).toBeInstanceOf(Pool);
  });

  it('should createPool returns Pool instance', function () {
    pool = createPool(new TestFactory());
    expect(pool).toBeInstanceOf(Pool);
  });

  it('should default acquireMaxRetries option must be 0', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.acquireMaxRetries).toStrictEqual(0);
  });

  it('should set acquireMaxRetries option', function () {
    pool = createPool(new TestFactory(),
        {acquireMaxRetries: 3});
    expect(pool.options.acquireMaxRetries).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {acquireMaxRetries: 0});
    expect(pool.options.acquireMaxRetries).toStrictEqual(0);
  });

  it('should default acquireRetryWait option must be 2000', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.acquireRetryWait).toStrictEqual(2000);
  });

  it('should set acquireRetryWait option', function () {
    pool = createPool(new TestFactory(),
        {acquireRetryWait: 3});
    expect(pool.options.acquireRetryWait).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {acquireRetryWait: 0});
    expect(pool.options.acquireRetryWait).toStrictEqual(0);
  });

  it('should default acquireTimeoutMillis option must be 0', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.acquireTimeoutMillis).toStrictEqual(0);
  });

  it('should set acquireTimeoutMillis option', function () {
    pool = createPool(new TestFactory(),
        {acquireTimeoutMillis: 20000});
    expect(pool.options.acquireTimeoutMillis).toStrictEqual(20000);
    pool = createPool(new TestFactory(),
        {acquireTimeoutMillis: 0});
    expect(pool.options.acquireTimeoutMillis).toStrictEqual(0);
  });

  it('should default fifo option must be true', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.fifo).toStrictEqual(true);
  });

  it('should set fifo option', function (done) {
    pool = createPool(new TestFactory(),
        {fifo: false});
    expect(pool.options.fifo).toStrictEqual(false);
    done();
  });

  it('should default idleTimeoutMillis option must be 30000', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.idleTimeoutMillis).toStrictEqual(30000);
  });

  it('should set idleTimeoutMillis option', function () {
    pool = createPool(new TestFactory(),
        {idleTimeoutMillis: 30000});
    expect(pool.options.idleTimeoutMillis).toStrictEqual(30000);
    pool = createPool(new TestFactory(),
        {idleTimeoutMillis: 0});
    expect(pool.options.idleTimeoutMillis).toStrictEqual(0);
  });

  it('should default houseKeepInterval option must be 1000', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.houseKeepInterval).toStrictEqual(1000);
  });

  it('should set houseKeepInterval option', function () {
    pool = createPool(new TestFactory(),
        {houseKeepInterval: 30000});
    expect(pool.options.houseKeepInterval).toStrictEqual(30000);
    pool = createPool(new TestFactory(),
        {houseKeepInterval: 0});
    expect(pool.options.houseKeepInterval).toStrictEqual(0);
  });

  it('should default max option must be 10', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.max).toStrictEqual(10);
  });

  it('should set max option', function () {
    pool = createPool(new TestFactory(),
        {max: 3});
    expect(pool.options.max).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {max: 0});
    expect(pool.options.max).toStrictEqual(1);
  });

  it('should default min option must be 0', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.min).toStrictEqual(0);
  });

  it('should set min option', function () {
    pool = createPool(new TestFactory(),
        {min: 3});
    expect(pool.options.min).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {min: 0});
    expect(pool.options.min).toStrictEqual(0);
  });

  it('should default minIdle option must be 0', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.minIdle).toStrictEqual(0);
  });

  it('should set minIdle option', function () {
    pool = createPool(new TestFactory(),
        {minIdle: 3});
    expect(pool.options.minIdle).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {minIdle: 0});
    expect(pool.options.minIdle).toStrictEqual(0);
  });

  it('should default maxQueue option must be 1000', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.maxQueue).toStrictEqual(1000);
  });

  it('should set maxQueue option', function () {
    pool = createPool(new TestFactory(),
        {maxQueue: 3});
    expect(pool.options.maxQueue).toStrictEqual(3);
    pool = createPool(new TestFactory(),
        {maxQueue: 0});
    expect(pool.options.maxQueue).toStrictEqual(1);
  });

  it('should default validation option must be false', function () {
    pool = createPool(new TestFactory());
    expect(pool.options.validation).toStrictEqual(true);
  });

  it('should set validation option', function () {
    pool = createPool(new TestFactory(),
        {validation: true});
    expect(pool.options.validation).toStrictEqual(true);
    pool = createPool(new TestFactory(),
        {validation: false});
    expect(pool.options.validation).toStrictEqual(false);
  });

  it('should prevent malformed min max options', function () {
    pool = createPool(new TestFactory(),
        {min: 0, max: 5});
    pool.options.min = 6;
    expect(pool.options.min).toStrictEqual(6);
    expect(pool.options.max).toStrictEqual(6);
    pool.options.max = 3;
    expect(pool.options.min).toStrictEqual(3);
    expect(pool.options.max).toStrictEqual(3);
  });

});
