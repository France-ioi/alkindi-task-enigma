//import './shim'
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import link from 'epic-linker';
import queryString from 'query-string';

import './ui/styles.css';

import TaskApi from './legacy/task';
import makeServerApi from './server_api';
import makePlatformAdapter from './legacy/platform_adapter';
import AppBundle from './app_bundle';
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';

export default function (container, options, TaskBundle) {
    const app = linkApp(TaskBundle);
    const query = queryString.parse(location.search);
    startApp(app, query.sToken, options);
    container && mountApp(app, container);
    return app;
}

function linkApp (TaskBundle) {
    return link(function (bundle) {
        bundle.defineAction('init', '@@redux/INIT');
        bundle.addReducer('init', () => ({}));
        bundle.include(AppBundle);
        bundle.include(PlatformBundle);
        bundle.include(HintsBundle);
        bundle.include(TaskBundle);
    });
}

function startApp (app, taskToken, options) {
    const {store, scope, start} = app;
    if (process.env.NODE_ENV === 'development') window.platform.debug = true;
    const platformApi = makePlatformAdapter(window.platform);
    const taskApi = new TaskApi(store, scope);
    const serverApi = makeServerApi(options.server_module, taskToken);
    start();
    store.dispatch({type: scope.appInit, payload: {scope, taskToken, platformApi, taskApi, serverApi, options}});
}

function mountApp (app, container) {
    const {store, scope: {App}} = app;
    ReactDOM.render(<Provider store={store}><App/></Provider>, container);
}
