import type { DoublyLinked } from 'doublylinked';
import { ResourceState } from './constants.js';

/**
 * Internal wrapper `Pool` keeps around each resource returned by
 * `factory.create()`, tracking its state and its node in whichever
 * (idle/acquired) list it currently belongs to. Not part of the public API.
 */
export class ResourceItem<T> {
  state: ResourceState = ResourceState.IDLE;
  /** This item's node in the acquired list, while `state` is `ACQUIRED`/`VALIDATION`. */
  acquiredNode?: DoublyLinked.Node<ResourceItem<T>>;
  /** This item's node in the idle list, while `state` is `IDLE`. */
  idleNode?: DoublyLinked.Node<ResourceItem<T>>;
  /** The actual resource, as returned by `factory.create()`. */
  resource: T;
  /** `Date.now()` when this item became idle; `0` while acquired/being validated. */
  idleTime = 0;
  /** Set once `factory.destroy()` has been called for this item. */
  destroyed = false;

  constructor(resource: T) {
    this.resource = resource;
  }
}
