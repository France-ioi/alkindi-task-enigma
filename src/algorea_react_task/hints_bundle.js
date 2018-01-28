
import {call, put, select, takeEvery} from 'redux-saga/effects';

function hintRequestFulfilledReducer (state, {payload: {hints}}) {
    return {...state, hints};
}

function hintRequestRejectedReducer (state, {payload: {error}}) {
    return {...state, hintRequestError: error};
}

function* requestHintSaga (action) {
    const actions = yield select(({actions}) => actions);
    const {askHint} = yield select(state => state.platformAdapter);
    yield call(askHint, action.request);
    /* Once askHint returns, the updated token can be obtained from the store. */
    const {taskToken, serverApi} = yield select(state => state);
    const hints = yield call(serverApi, 'tasks', 'taskHintData', {task: taskToken});
    if (hints) {
        yield put({type: actions.hintRequestFulfilled, payload: {hints}});
        yield put({type: actions.taskRefresh});
    } else {
        yield put({type: actions.hintRequestRejected, payload: {error: 'server error'}});
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
