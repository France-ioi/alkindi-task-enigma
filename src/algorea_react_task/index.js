/*
Change method of use:
- export a bundle that the task can include;
- export a function(saga?) that (creates the API objects and ) dispatches the
  appInit action;

*/

//import './shim'
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import queryString from 'query-string';
import {createStore, applyMiddleware} from 'redux';
import {default as createSagaMiddleware} from 'redux-saga';
import {call} from 'redux-saga/effects';

import link from './linker';
import './ui/styles.css';

import AppBundle from './app_bundle';

export default function (container, options, TaskBundle) {
    const platform = window.platform;
    if (process.env.NODE_ENV === 'development') platform.debug = true;

    const {actions, views, selectors, reducer, rootSaga} = link({includes: [AppBundle, TaskBundle]});

    /* Build the store. */
    const safeReducer = function (state, action) {
        try {
            return reducer(state, action);
        } catch (ex) {
            console.log('action failed to reduce', action, ex);
            return {...state, errors: [ex]};
        }
    };
    const sagaMiddleware = createSagaMiddleware();
    const enhancer = applyMiddleware(sagaMiddleware);
    const store = createStore(safeReducer, {actions, views, selectors}, enhancer);

    /* Start the sagas. */
    function start () {
        sagaMiddleware.run(function* () {
            try {
                yield call(rootSaga);
            } catch (error) {
                console.log('sagas crashed', error);
            }
        });
    }
    start();

    /* Dispatch the appInit action. */
    const query = queryString.parse(location.search);
    const taskToken = query.sToken;
    store.dispatch({type: actions.appInit, payload: {options, taskToken, platform}});

    /* Start rendering. */
    ReactDOM.render(<Provider store={store}><views.App/></Provider>, container);

    return {actions, views, store, start};
}
