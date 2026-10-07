// All draft and publish writes share a queue. A publish must wait for an
// in-flight draft creation so it can use that ID rather than create a duplicate.
export function createStudioSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
}
