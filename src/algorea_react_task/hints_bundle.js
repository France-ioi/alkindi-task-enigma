
import {call, put, select, takeEvery} from 'redux-saga/effects';
import update from 'immutability-helper';

function hintRequestFulfilledReducer (state, _action) {
    return {...state, hintRequest: {success: true}};
}

function hintRequestRejectedReducer (state, {payload: {error}}) {
    return {...state, hintRequest: {success: false, error}};
}

function* requestHintSaga ({payload: {request}}) {
    const actions = yield select(({actions}) => actions);
    try {
        const {actions, taskToken: initialTaskToken, serverApi} = yield select(state => state);
        const {askHint} = yield select(state => state.platformApi);
        /* Contact serverApi to obtain a hintToken for the requested hint. */
        const {hintToken} = yield call(serverApi, 'tasks', 'requestHint', {task: initialTaskToken, request});
        /* Contact the platform to authorize the hint request. */
        yield call(askHint, hintToken);
        /* When askHint returns an updated taskToken is obtained from the store. */
        const updatedTaskToken = yield select(state => state.taskToken);
        /* Finally, contact the serverApi to obtain the updated taskData. */
        const taskData = yield call(serverApi, 'tasks', 'taskData', {task: updatedTaskToken});
        yield put({type: actions.taskDataLoaded, payload: {taskData}});
        yield put({type: actions.taskRefresh});
    } catch (ex) {
        yield put({type: actions.hintRequestRejected, payload: {error: ex.toString()}});
    }
}

export default {
    actions: {
        requestHint: 'Hint.Request',
        hintRequestFulfilled: 'Hint.Request.Fulfilled',
        hintRequestRejected: 'Hint.Request.Rejected',
    },
    actionReducers: {
        hintRequestFulfilled: hintRequestFulfilledReducer,
        hintRequestRejected: hintRequestRejectedReducer,
    },
    saga: function* hintsSaga () {
        const actions = yield select(({actions}) => actions);
        yield takeEvery(actions.requestHint, requestHintSaga);
    }
};
