
import React from 'react';
import {Alert} from 'react-bootstrap';
import {connect} from 'react-redux';
import {call, put, select, takeEvery} from 'redux-saga/effects';
import update from 'immutability-helper';

function hintRequestFulfilledReducer (state, _action) {
    return {...state, hintRequest: {success: true}};
}

function hintRequestRejectedReducer (state, {payload: {code, error}}) {
    return {...state, hintRequest: {success: false, code, error}};
}

function hintRequestFeedbackClearedReducer (state, _action) {
    return {...state, hintRequest: false};
}

function* requestHintSaga ({payload: {request}}) {
    const actions = yield select(({actions}) => actions);
    let code = 0;
    try {
        const {actions, taskToken: initialTaskToken, serverApi} = yield select(state => state);
        code = 10;
        const {askHint} = yield select(state => state.platformApi);
        code = 20;
        /* Contact serverApi to obtain a hintToken for the requested hint. */
        const {hintToken} = yield call(serverApi, 'tasks', 'requestHint', {task: initialTaskToken, request});
        code = 30;
        /* Contact the platform to authorize the hint request. */
        yield call(askHint, hintToken);
        code = 40;
        /* When askHint returns an updated taskToken is obtained from the store. */
        const updatedTaskToken = yield select(state => state.taskToken);
        code = 50;
        /* Finally, contact the serverApi to obtain the updated taskData. */
        const taskData = yield call(serverApi, 'tasks', 'taskData', {task: updatedTaskToken});
        code = 60;
        yield put({type: actions.taskDataLoaded, payload: {taskData}});
        yield put({type: actions.taskRefresh});
        yield put({type: actions.hintRequestFulfilled, payload: {}});
    } catch (ex) {
        yield put({type: actions.hintRequestRejected, payload: {code: code, error: ex}});
    }
}

function HintRequestFeedbackSelector (state) {
    const {actions, hintRequest} = state;
    if (!hintRequest) return {};
    const {hintRequestFeedbackCleared} = actions;
    const {success, code, error} = hintRequest;
    return {visible: true, success, code, error, hintRequestFeedbackCleared};
}

class HintRequestFeedback extends React.PureComponent {
    render () {
        const {visible, success} = this.props;
        if (!visible) return false;
        if (success) {
            return (
                <Alert bsStyle='success' onDismiss={this.handleDismiss}>
                    <p>{"L'indice demandé a été délivré."}</p>
                </Alert>
            );
        } else {
            const {code, error} = this.props;
            return (
                <Alert bsStyle='danger' onDismiss={this.handleDismiss}>
                    <p>{"L'indice demandé n'a pas pu être délivré."}</p>
                    <p>{"Code "}{code}</p>
                    {error.status && <p>{"Erreur serveur "}{error.status}</p>}
                    {error.message && <p>{error.toString()}</p>}
                </Alert>
            );
        }
    }
    handleDismiss = () => {
        this.props.dispatch({type: this.props.hintRequestFeedbackCleared, payload: {}});
    }
}

export default {
    actions: {
        requestHint: 'Hint.Request',
        hintRequestFulfilled: 'Hint.Request.Fulfilled',
        hintRequestRejected: 'Hint.Request.Rejected',
        hintRequestFeedbackCleared: 'Hint.Request.FeedbackCleared',
    },
    actionReducers: {
        hintRequestFulfilled: hintRequestFulfilledReducer,
        hintRequestRejected: hintRequestRejectedReducer,
        hintRequestFeedbackCleared: hintRequestFeedbackClearedReducer,
    },
    views: {
        HintRequestFeedback: connect(HintRequestFeedbackSelector)(HintRequestFeedback)
    },
    saga: function* hintsSaga () {
        const actions = yield select(({actions}) => actions);
        yield takeEvery(actions.requestHint, requestHintSaga);
    }
};
