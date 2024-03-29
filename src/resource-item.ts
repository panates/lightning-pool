import { DoublyLinked } from 'doublylinked';
import { ResourceState } from './definitions.js';

export class ResourceItem<T> {
  state: ResourceState = ResourceState.IDLE;
  acquiredNode?: DoublyLinked.Node;
  idleNode?: DoublyLinked.Node;
  resource: T;
  idleTime = 0;
  destroyed = false;

  constructor(resource: T) {
    this.resource = resource;
  }
}
