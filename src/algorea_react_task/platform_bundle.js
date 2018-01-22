import {call, put, select, takeEvery} from 'redux-saga/effects';

export default function (bundle, deps) {

    bundle.use('taskInit', 'taskRefresh');

    /*
        # Performance

        - task.getHeight and task.getAnswer are called every second
        - task.getViews is called whenever the window's height changes

    */

    /* Action dispatched by calls on window.task */
    bundle.defineAction('taskShowViewsEvent', 'Task.Event.ShowViews'); /* {views, success, error} */
    bundle.addReducer('taskShowViewsEvent', taskShowViewsEventReducer);
    bundle.defineAction('taskGetViewsEvent', 'Task.Event.GetViews'); /* {success, error} */
    bundle.defineAction('taskUpdateTokenEvent', 'Task.Event.UpdateToken'); /* {token, success, error} */
    bundle.defineAction('taskGetHeightEvent', 'Task.Event.GetHeight'); /* {success, error} */
    bundle.defineAction('taskUnloadEvent', 'Task.Event.Unload'); /* {success, error} */
    bundle.defineAction('taskGetStateEvent', 'Task.Event.GetState'); /* {success, error} */
    bundle.defineAction('taskGetMetaDataEvent', 'Task.Event.GetMetaData'); /* {success, error} */
    bundle.defineAction('taskReloadAnswerEvent', 'Task.Event.ReloadAnswer'); /* {answer, success, error} */
    bundle.defineAction('taskReloadStateEvent', 'Task.Event.ReloadState'); /* {state, success, error} */
    bundle.defineAction('taskGetAnswerEvent', 'Task.Event.GetAnswer'); /* {success, error} */
    bundle.defineAction('taskLoadEvent', 'Task.Event.Load'); /* {views, success, error} */
    bundle.defineAction('taskGradeAnswerEvent', 'Task.Event.GradeAnswer'); /* {answer, answerToken, success, error} */
    bundle.addReducer('taskUpdateTokenEvent', taskUpdateTokenEventReducer);
    bundle.addSaga(function* () {
        yield takeEvery(deps.taskShowViewsEvent, taskShowViewsEventSaga);
        yield takeEvery(deps.taskGetViewsEvent, taskGetViewsEventSaga);
        yield takeEvery(deps.taskUpdateTokenEvent, taskUpdateTokenEventSaga);
        yield takeEvery(deps.taskGetHeightEvent, taskGetHeightEventSaga);
        yield takeEvery(deps.taskUnloadEvent, taskUnloadEventSaga);
        yield takeEvery(deps.taskGetStateEvent, taskGetStateEventSaga);
        yield takeEvery(deps.taskGetMetaDataEvent, taskGetMetaDataEventSaga);
        yield takeEvery(deps.taskReloadAnswerEvent, taskReloadAnswerEventSaga);
        yield takeEvery(deps.taskReloadStateEvent, taskReloadStateEventSaga);
        yield takeEvery(deps.taskGetAnswerEvent, taskGetAnswerEventSaga);
        yield takeEvery(deps.taskLoadEvent, taskLoadEventSaga);
        yield takeEvery(deps.taskGradeAnswerEvent, taskGradeAnswerEventSaga);
    });

    bundle.defineAction('taskDataLoaded', 'Task.Data.Loaded');
    bundle.addReducer('taskDataLoaded', taskDataLoadedReducer);
    function taskDataLoadedReducer (state, {payload: {taskData}}) {
        return {...state, taskData};
    }

    bundle.defineAction('taskStateLoaded', 'Task.State.Loaded');
    bundle.addReducer('taskStateLoaded', taskStateLoadedReducer);
    function taskStateLoadedReducer (state, {payload: {hints}}) {
        return {...state, hints};
    }

    bundle.defineAction('taskAnswerLoaded', 'Task.Answer.Loaded');
    bundle.addReducer('taskAnswerLoaded', taskAnswerLoadedReducer);
    function taskAnswerLoadedReducer (state, {payload: {answer}}) {
        return {...state, answer};
    }

    function taskShowViewsEventReducer (state, {payload: {views}}) {
        return {...state, views};
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
        try {
            answer = JSON.parse(answer);
            yield put({type: deps.taskAnswerLoaded, payload: {answer}});
            yield put({type: deps.taskRefresh});
            yield call(success);
        } catch (ex) {
            yield call(error, `bad answer: ${ex.message}`);
        }
    }

    function* taskReloadStateEventSaga ({payload: {state, success, error}}) {
        try {
            /* XXX some tasks want to store more of the UI state than just the hints */
            const hints = JSON.parse(state);
            yield put({type: deps.reloadState, payload: {hints}});
            yield put({type: deps.taskRefresh});
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
        /* TODO: do something with views */
        try {
            const {taskToken, serverApi} = yield select(state => state);
            const {data: taskData} = yield call(serverApi, 'tasks', 'taskData', {task: taskToken});
            yield put({type: deps.taskDataLoaded, payload: {taskData}});
            yield put({type: deps.taskInit});
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

}
