export function createDoneCallback(done: Function) {
  let _done = false;
  return (e?: any) => {
    if (_done) return;
    _done = true;
    done(e);
  };
}
