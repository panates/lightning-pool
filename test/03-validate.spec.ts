import { createPool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Validating', () => {
  let pool;

  afterEach(() => pool.closeAsync(true));

  it('should validate on borrow', () => {
    pool = createPool(new TestFactory());

    return pool.acquire().then(obj =>
      pool.releaseAsync(obj).then(() =>
        pool.acquire().then(obj2 => {
          expect(obj2.id).toStrictEqual(1);
          expect(obj2.validateCount).toStrictEqual(1);
          return pool.release(obj2);
        }),
      ),
    );
  });

  it('should validate on borrow and remove if error', () => {
    pool = createPool(
      new TestFactory({
        validate: () => {
          throw new Error('Validate error');
        },
      }),
      {
        validation: true,
      },
    );

    return pool.acquire().then(obj =>
      pool.releaseAsync(obj).then(() =>
        pool.acquire().then(obj2 => {
          expect(pool.size).toStrictEqual(1);
          return pool.release(obj2);
        }),
      ),
    );
  });

  it('should not validate if options.validation is false', done => {
    let k = 0;
    pool = createPool(new TestFactory(), {
      validation: false,
    });
    const acquire = () => {
      pool.acquire((err, obj) => {
        expect(err).not.toBeDefined();
        pool.release(obj);
      });
    };
    pool.on('return', () => {
      if (++k === 2) {
        pool.acquire((err, obj) => {
          expect(err).not.toBeDefined();
          expect(obj.id).toStrictEqual(1);
          expect(obj.validateCount).toStrictEqual(0);
          done();
        });
      }
    });

    acquire();
    acquire();
  });
});
