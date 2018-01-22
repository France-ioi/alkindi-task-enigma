
import {increment} from 'alphanum-increment';

let keyStore = new WeakMap();
let counter = '';

export function objId (obj) {
  let key = keyStore.get(obj);
  if (key === undefined) {
    key = counter = increment(counter);
    keyStore.set(obj, key);
  }
  return key;
}

/* Usage:
     @applyIf(p) function f (arg) { … }
   defines a function whose behavior when applied to a value `x` depends
   on its previous application to a value `y`:
     - if p(x) === p(y) then x is returned,
     - otherwise, f(x) is returned.
*/
export function applyIf (getKey) {
  let lastKey;
  return function (target, name, descriptor) {
    descriptor.value = function (arg) {
      const key = JSON.stringify(getKey(arg));
      if (key === lastKey) {
        return arg;
      }
      lastKey = key;
      return target(arg);
    };
  };
}
