import React from 'react';
import {connect} from 'react-redux';
import {call, fork, takeEvery, select, take, put} from 'redux-saga/effects';

import TaskBar from './ui/task_bar';
import Spinner from './ui/spinner';
import makeTaskChannel from './legacy/task';
import makeServerApi from './server_api';
import makePlatformAdapter from './legacy/platform_adapter';
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';
import {windowHeightMonitorSaga} from './window_height_monitor';

function appInitReducer (state, {payload: {taskToken, options}}) {
    return {...state, taskToken, options};
}

function appInitDoneReducer (state, {payload: {platformApi, taskApi, serverApi}}) {
    return {...state, platformApi, taskApi, serverApi};
}

function appInitFailedReducer (state, {payload: {message}}) {
    return {...state, fatalError: message};
}

function* appSaga () {
    const actions = yield select(({actions}) => actions);
    yield takeEvery(actions.appInit, appInitSaga);
    yield takeEvery(actions.platformValidate, platformValidateSaga);
}

const taskActions = { /* map task method names to action types */
    load: 'taskLoadEvent',
    unload: 'taskUnloadEvent',
    updateToken: 'taskUpdateTokenEvent',
    getHeight: 'taskGetHeightEvent',
    getMetaData: 'taskGetMetaDataEvent',
    getViews: 'taskGetViewsEvent',
    showViews: 'taskShowViewsEvent',
    getState: 'taskGetStateEvent',
    reloadState: 'taskReloadStateEvent',
    getAnswer: 'taskGetAnswerEvent',
    reloadAnswer: 'taskReloadAnswerEvent',
    gradeAnswer: 'taskGradeAnswerEvent',
};

function* appInitSaga ({payload: {taskToken, options, platform}}) {
    const actions = yield select(({actions}) => actions);
    let taskChannel, taskApi, platformApi, serverApi;
    try {
        serverApi = makeServerApi(options.server_module, taskToken);
        taskChannel = yield call(makeTaskChannel);
        taskApi = (yield take(taskChannel)).task;
        yield takeEvery(taskChannel, function* ({type, payload}) {
            const action = {type: actions[taskActions[type]], payload};
            yield put(action);
        });
        platformApi = makePlatformAdapter(platform);
    } catch (ex) {
        yield put({type: actions.appInitFailed, payload: {message: ex.toString()}});
        return;
    }
    yield put({type: actions.appInitDone, payload: {taskApi, platformApi, serverApi}});
    yield call(platformApi.initWithTask, taskApi);
    /* XXX platform.initWithTask fails to conform to Operations API and never
           return, causing the saga to remain stuck at this point. */
    yield fork(windowHeightMonitorSaga, platformApi);
}

function* platformValidateSaga ({payload: {mode}}) {
    const {validate} = yield select(state => state.platformApi);
    /* TODO: error handling, wrap in try/catch block */
    yield call(validate, mode);
}

function AppSelector (state) {
    const {taskReady, fatalError, views: {Workspace}, actions: {platformValidate}} = state;
    return {taskReady, fatalError, Workspace, platformValidate};
}

class App extends React.PureComponent {
    render () {
        const {taskReady, Workspace, fatalError} = this.props;
        if (fatalError) {
            return (
                <div>
                    <h1>{"A fatal error has occurred"}</h1>
                    <p>{fatalError}</p>
                </div>
            );
        }
        if (!taskReady) {
            return <Spinner/>;
        }
        return (
            <div>
                <Workspace/>
                <TaskBar onValidate={this._validate}/>
            </div>
        );
    }
    _validate = () => {
        this.props.dispatch({type: this.props.platformValidate, payload: {mode: 'done'}});
    };
}

export default {
    actions: {
        appInit: 'App.Init',
        appInitDone: 'App.Init.Done',
        appInitFailed: 'App.Init.Failed',
        platformValidate: 'Platform.Validate',
    },
    actionReducers: {
        appInit: appInitReducer,
        appInitDone: appInitDoneReducer,
        appInitFailed: appInitFailedReducer,
    },
    saga: appSaga,
    views: {
        App: connect(AppSelector)(App)
    },
    includes: [
        PlatformBundle,
        HintsBundle,
    ]
};
