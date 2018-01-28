/*
# Performance
- task.getHeight and task.getAnswer are called every second
- task.getViews is called whenever the window's height changes
*/

import {call, put, select, takeEvery} from 'redux-saga/effects';

function taskDataLoadedReducer (state, {payload: {taskData}}) {
    return {...state, taskData};
}

function taskStateLoadedReducer (state, {payload: {hints}}) {
    return {...state, hints};
}

function taskAnswerLoadedReducer (state, {payload: {answer}}) {
    return {...state, answer};
}

function taskShowViewsEventReducer (state, {payload: {views}}) {
    return {...state, taskViews: views};
}

function* taskShowViewsEventSaga ({payload: {success}}) {
    /* The reducer has stored the views to show, just call success. */
    yield call(success);
}

function* taskGetViewsEventSaga ({payload: {success}}) {
    /* XXX only the 'task' view is declared */
    yield call(success, {'task': {}});
}

function taskUpdateTokenEventReducer (state, {payload: {token}}) {
    if (token === null) {
        console.warn('task.updateToken with null token');
    }
    return {...state, taskToken: token};
}
function* taskUpdateTokenEventSaga ({payload: {success}}) {
    yield call(success);
}

function* taskGetHeightEventSaga ({payload: {success}}) {
    const d = document;
    const h = Math.max(d.body.offsetHeight, d.documentElement.offsetHeight);
    yield call(success, h);
}

function* taskUnloadEventSaga ({payload: {success}}) {
    /* XXX No action needed? */
    yield call(success);
}

function* taskGetStateEventSaga ({payload: {success}}) {
    /* XXX some tasks want to store more of the UI state than just the hints */
    const hints = yield select(state => state.hints);
    yield call(success, JSON.stringify(hints));
}

function* taskGetMetaDataEventSaga ({payload: {success, error: _error}}) {
    /* TODO: implement */
    /* XXX legacy code does not pass error callback
       yield call(error, 'not implemented'); */
    yield call(success, {});
}

function* taskReloadAnswerEventSaga ({payload: {answer, success, error}}) {
    const {taskAnswerLoaded, taskRefresh} = yield select(({actions}) => actions);
    try {
        answer = JSON.parse(answer);
        yield put({type: taskAnswerLoaded, payload: {answer}});
        yield put({type: taskRefresh});
        yield call(success);
    } catch (ex) {
        yield call(error, `bad answer: ${ex.message}`);
    }
}

function* taskReloadStateEventSaga ({payload: {state, success, error}}) {
    const {reloadState, taskRefresh} = yield select(({actions}) => actions);
    try {
        /* XXX some tasks want to store more of the UI state than just the hints */
        const hints = JSON.parse(state);
        yield put({type: reloadState, payload: {hints}});
        yield put({type: taskRefresh});
        yield call(success);
    } catch (ex) {
        yield call(error, `bad state: ${ex.message}`);
    }
}

function* taskGetAnswerEventSaga ({payload: {success}}) {
    const answer = yield select(state => state.answer);
    yield call(success, JSON.stringify(answer));
}

function* taskLoadEventSaga ({payload: {views: _views, success, error}}) {
    const {taskDataLoaded, taskInit} = yield select(({actions}) => actions);
    /* TODO: do something with views */
    try {
        const {taskToken, serverApi} = yield select(state => state);
        const {data: taskData} = yield call(serverApi, 'tasks', 'taskData', {task: taskToken});
        yield put({type: taskDataLoaded, payload: {taskData}});
        yield put({type: taskInit});
        yield call(success);
    } catch (ex) {
        yield call(error, ex.toString());
    }
}

function* taskGradeAnswerEventSaga ({payload: {answer, answerToken, success, error}}) {
    try {
        const {taskToken, platformAdapter: {getTaskParams}, serverApi} = yield select(state => state);
        const {minScore, maxScore, noScore} = yield call(getTaskParams, null, null);
        const result = yield call(serverApi, 'tasks', 'gradeAnswer', {
            task: taskToken,
            answer,
            answerToken,
            min_score: minScore,
            max_score: maxScore,
            no_score: noScore
        });
        console.warn('TODO: handle grading result', result);
        const {score} = result;
        const message = "TODO";
        const scoreToken = "TODO";
        yield call(success, score, message, scoreToken);
    } catch (ex) {
        yield call(error, ex.toString());
    }
}

export default {
    actions: {
        taskInit: 'Task.Init',
        taskRefresh: 'Task.Refresh',
        taskShowViewsEvent: 'Task.Event.ShowViews' /* {views, success, error} */,
        taskGetViewsEvent: 'Task.Event.GetViews' /* {success, error} */,
        taskUpdateTokenEvent: 'Task.Event.UpdateToken' /* {token, success, error} */,
        taskGetHeightEvent: 'Task.Event.GetHeight' /* {success, error} */,
        taskUnloadEvent: 'Task.Event.Unload' /* {success, error} */,
        taskGetStateEvent: 'Task.Event.GetState' /* {success, error} */,
        taskGetMetaDataEvent: 'Task.Event.GetMetaData' /* {success, error} */,
        taskReloadAnswerEvent: 'Task.Event.ReloadAnswer' /* {answer, success, error} */,
        taskReloadStateEvent: 'Task.Event.ReloadState' /* {state, success, error} */,
        taskGetAnswerEvent: 'Task.Event.GetAnswer' /* {success, error} */,
        taskLoadEvent: 'Task.Event.Load' /* {views, success, error} */,
        taskGradeAnswerEvent: 'Task.Event.GradeAnswer' /* {answer, answerToken, success, error} */,
        taskDataLoaded: 'Task.Data.Loaded',
        taskStateLoaded: 'Task.State.Loaded',
        taskAnswerLoaded: 'Task.Answer.Loaded',
    },
    actionReducers: {
        taskShowViewsEvent: taskShowViewsEventReducer,
        taskUpdateTokenEvent: taskUpdateTokenEventReducer,
        taskDataLoaded: taskDataLoadedReducer,
        taskStateLoaded: taskStateLoadedReducer,
        taskAnswerLoaded: taskAnswerLoadedReducer,
    },
    saga: function* () {
        const actions = yield select(({actions}) => actions);
        yield takeEvery(actions.taskShowViewsEvent, taskShowViewsEventSaga);
        yield takeEvery(actions.taskGetViewsEvent, taskGetViewsEventSaga);
        yield takeEvery(actions.taskUpdateTokenEvent, taskUpdateTokenEventSaga);
        yield takeEvery(actions.taskGetHeightEvent, taskGetHeightEventSaga);
        yield takeEvery(actions.taskUnloadEvent, taskUnloadEventSaga);
        yield takeEvery(actions.taskGetStateEvent, taskGetStateEventSaga);
        yield takeEvery(actions.taskGetMetaDataEvent, taskGetMetaDataEventSaga);
        yield takeEvery(actions.taskReloadAnswerEvent, taskReloadAnswerEventSaga);
        yield takeEvery(actions.taskReloadStateEvent, taskReloadStateEventSaga);
        yield takeEvery(actions.taskGetAnswerEvent, taskGetAnswerEventSaga);
        yield takeEvery(actions.taskLoadEvent, taskLoadEventSaga);
        yield takeEvery(actions.taskGradeAnswerEvent, taskGradeAnswerEventSaga);
    }
}
