/* Copyright (C) 2017 epixode - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the MIT license.
 */

import {all, call} from 'redux-saga/effects';

export default function link (rootBundle, features) {
  features = features || [Actions, Views, Selectors, EarlyReducers, Reducers, ActionReducers, LateReducers, Sagas];
  const app = {};
  for (let feature of features) {
    feature.prepare(app);
  }
  linkBundle(rootBundle, features, app);
  for (let feature of features) {
    feature.finalize(app);
  }
  return app;
}

function linkBundle (bundle, features, app) {
  for (let feature of features) {
    feature.add(app, bundle);
  }
  if (bundle.includes) {
    for (let subBundle of bundle.includes) {
      linkBundle(subBundle, features, app);
    }
  }
}

const Actions = {
  prepare: function (app) {
    app.actions = {};
  },
  add: function (app, {actions}) {
    if (actions) {
      Object.assign(app.actions, actions);
    }
  },
  finalize: function (_app) {
  }
};

const Views = {
  prepare: function (app) {
    app.views = {};
  },
  add: function (app, {views}) {
    if (views) {
      Object.assign(app.views, views);
    }
  },
  finalize: function (_app) {
  }
};

const Reducers = {
  prepare: function (app) {
    app.reducer = undefined;
  },
  add: function (app, {reducer, reducers}) {
    if (reducer) {
      app.reducer = sequenceReducers(app.reducer, reducer);
    }
    if (reducers) {
      app.reducer = sequenceReducers(app.reducer, ...reducers);
    }
  },
  finalize: function (_app) {
  }
};

const EarlyReducers = {
  prepare: function (app) {
    app.earlyReducer = undefined;
  },
  add: function (app, {earlyReducer}) {
    app.earlyReducer = sequenceReducers(app.earlyReducer, earlyReducer);
  },
  finalize: function (app) {
    app.reducer = sequenceReducers(app.earlyReducer, app.reducer);
    delete app.earlyReducer;
  }
};

const LateReducers = {
  prepare: function (app) {
    app.lateReducer = undefined;
  },
  add: function (app, {lateReducer}) {
    app.lateReducer = sequenceReducers(app.lateReducer, lateReducer);
  },
  finalize: function (app) {
    app.reducer = sequenceReducers(app.reducer, app.lateReducer);
    delete app.lateReducer;
  }
};

const ActionReducers = {
  prepare: function (app) {
    app.actionReducers = new Map();
  },
  add: function (app, {actionReducers}) {
    if (actionReducers) {
      for (let key of Object.keys(actionReducers)) {
        let reducer = app.actionReducers.get(key);
        reducer = sequenceReducers(reducer, actionReducers[key]);
        app.actionReducers.set(key, reducer);
      }
    }
  },
  finalize: function (app) {
    const actionReducer = makeActionReducer(app);
    app.reducer = sequenceReducers(app.reducer, actionReducer);
    delete app.actionReducers;
  }
};

const Sagas = {
  prepare: function (app) {
    app.sagas = [];
  },
  add: function (app, {saga, sagas}) {
    if (saga) {
      app.sagas.push(saga);
    }
    if (sagas) {
      Array.prototype.push.apply(app.sagas, sagas);
    }
  },
  finalize: function (app) {
    const effects = app.sagas.map(function (saga) { return call(saga); });
    app.rootSaga = function* () { yield all(effects); };
    delete app.sagas;
  }
};

const Selectors = {
  prepare: function (app) {
    app.selectors = {};
  },
  add: function (app, {selectors}) {
    if (selectors) {
      Object.assign(app.selectors, selectors);
    }
  },
  finalize: function (_app) {
  }
};

function makeActionReducer ({actions, actionReducers}) {
  const map = new Map();
  for (let [key, reducer] of actionReducers.entries()) {
    map.set(actions[key], reducer);
  }
  return function (state, action) {
    const reducer = map.get(action.type);
    return typeof reducer === 'function' ? reducer(state, action) : state;
  };
}

function sequenceReducers (...reducers) {
  let result = undefined;
  for (var i = 0; i < reducers.length; i += 1) {
    var reducer = reducers[i];
    if (!reducer) {
      continue;
    }
    if (typeof reducer !== 'function') {
      throw new Error('reducer must be a function', reducer);
    }
    if (!result) {
      result = reducer;
    } else {
      result = composeReducers(result, reducer);
    }
  }
  return result;
}

function composeReducers (fst, snd) {
  return function (state, action) { return snd(fst(state, action), action); };
}
