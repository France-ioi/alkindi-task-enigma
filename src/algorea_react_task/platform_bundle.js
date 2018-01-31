/*
# Performance
- task.getHeight and task.getAnswer are called every second
- task.getViews is called whenever the window's height changes
*/

import {call, put, select, takeEvery} from 'redux-saga/effects';
import stringify from 'json-stable-stringify-without-jsonify';

function appInitReducer (state, {payload: {taskToken, options}}) {
    return {...state, grading: {}};
}

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
        console.warn('ignored task.updateToken with null token');
        return state;
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

function* taskGetMetaDataEventSaga ({payload: {success, error: _error}}) {
    const metaData = yield select(({taskMetaData}) => taskMetaData);
    yield call(success, metaData);
}

function* taskGetAnswerEventSaga ({payload: {success}}) {
    const answer = yield select(state => state.selectors.getTaskAnswer(state));
    const strAnswer = stringify(answer);
    yield call(success, strAnswer);
}

function* taskReloadAnswerEventSaga ({payload: {answer, success, error}}) {
    const {taskAnswerLoaded, taskRefresh} = yield select(({actions}) => actions);
    try {
        if (answer) {
            yield put({type: taskAnswerLoaded, payload: {answer: JSON.parse(answer)}});
            yield put({type: taskRefresh});
        }
        yield call(success);
    } catch (ex) {
        yield call(error, `bad answer: ${ex.message}`);
    }
}

function* taskGetStateEventSaga ({payload: {success}}) {
    const dump = yield select(state => state.selectors.getTaskState(state));
    const strDump = stringify(dump);
    yield call(success, strDump);
}

function* taskReloadStateEventSaga ({payload: {state, success, error}}) {
    const {taskStateLoaded, taskRefresh} = yield select(({actions}) => actions);
    try {
        if (state) {
            yield put({type: taskStateLoaded, payload: {dump: JSON.parse(state)}});
            yield put({type: taskRefresh});
        }
        yield call(success);
    } catch (ex) {
        yield call(error, `bad state: ${ex.message}`);
    }
}

function* taskLoadEventSaga ({payload: {views: _views, success, error}}) {
    const {taskDataLoaded, taskInit} = yield select(({actions}) => actions);
    /* TODO: do something with views */
    try {
        const {taskToken, serverApi} = yield select(state => state);
        const taskData = yield call(serverApi, 'tasks', 'taskData', {task: taskToken});
        yield put({type: taskDataLoaded, payload: {taskData}});
        yield put({type: taskInit});
        yield call(success);
    } catch (ex) {
        yield call(error, ex.toString());
    }
}

function* taskGradeAnswerEventSaga ({payload: {answer, answerToken, success, error}}) {
    const {taskAnswerGraded} = yield select(({actions}) => actions);
    let result;
    try {
        const {taskToken, platformApi: {getTaskParams}, serverApi} = yield select(state => state);
        const {minScore, maxScore, noScore} = yield call(getTaskParams, null, null);
        const {score, message, token: scoreToken} = yield call(serverApi, 'tasks', 'gradeAnswer', {
            task: taskToken, /* XXX task should be named taskToken */
            answer: answerToken,  /* XXX answer should be named answerToken */
            min_score: minScore, /* XXX no real point passing min_score, max_score, no_score to server-side grader */
            max_score: maxScore,
            no_score: noScore
        });
        yield put({type: taskAnswerGraded, payload: {grading: {score, message}}});
        yield call(success, score, message, scoreToken);
    } catch (ex) {
        yield put({type: taskAnswerGraded, payload: {grading: {error: ex.toString()}}});
        yield call(error, ex.toString());
    }
}

function taskAnswerGradedReducer (state, {payload: {grading}}) {
    return {...state, grading};
}

export default {
    actions: {
        taskInit: 'Task.Init',
        taskRefresh: 'Task.Refresh',
        taskLoadEvent: 'Task.Event.Load' /* {views, success, error} */,
        taskUnloadEvent: 'Task.Event.Unload' /* {success, error} */,
        taskUpdateTokenEvent: 'Task.Event.UpdateToken' /* {token, success, error} */,
        taskGetHeightEvent: 'Task.Event.GetHeight' /* {success, error} */,
        taskGetMetaDataEvent: 'Task.Event.GetMetaData' /* {success, error} */,
        taskGetViewsEvent: 'Task.Event.GetViews' /* {success, error} */,
        taskShowViewsEvent: 'Task.Event.ShowViews' /* {views, success, error} */,
        taskGetStateEvent: 'Task.Event.GetState' /* {success, error} */,
        taskReloadStateEvent: 'Task.Event.ReloadState' /* {state, success, error} */,
        taskGetAnswerEvent: 'Task.Event.GetAnswer' /* {success, error} */,
        taskReloadAnswerEvent: 'Task.Event.ReloadAnswer' /* {answer, success, error} */,
        taskGradeAnswerEvent: 'Task.Event.GradeAnswer' /* {answer, answerToken, success, error} */,
        taskDataLoaded: 'Task.Data.Loaded',
        taskStateLoaded: 'Task.State.Loaded',
        taskAnswerLoaded: 'Task.Answer.Loaded',
        taskAnswerGraded: 'Task.Answer.Graded',
    },
    actionReducers: {
        appInit: appInitReducer,
        taskShowViewsEvent: taskShowViewsEventReducer,
        taskUpdateTokenEvent: taskUpdateTokenEventReducer,
        taskDataLoaded: taskDataLoadedReducer,
        taskStateLoaded: taskStateLoadedReducer,
        taskAnswerLoaded: taskAnswerLoadedReducer,
        taskAnswerGraded: taskAnswerGradedReducer,
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
};
