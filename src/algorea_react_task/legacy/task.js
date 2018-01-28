
import {buffers, eventChannel} from 'redux-saga';

export default function () {
    return eventChannel(function (emit) {
        const task = makeTask(emit);
        emit({task});
        return function () {
            for (let prop of Object.keys(task)) {
                task[prop] = function () {
                    throw new Error('task channel is closed');
                };
            }
        };
    }, buffers.expanding(4));
}

function makeTask (emit) {
    return {
        showViews: function (views, success, error) {
            emit({type: 'showViews', payload: {views, success, error}});
        },
        getViews: function (success, error) {
            emit({type: 'getViews', payload: {success, error}});
        },
        updateToken: function (token, success, error) {
            emit({type: 'updateToken', payload: {token, success, error}});
        },
        getHeight: function (success, error) {
            emit({type: 'getHeight', payload: {success, error}});
        },
        unload: function (success, error) {
            emit({type: 'unload', payload: {success, error}});
        },
        getState: function (success, error) {
            emit({type: 'getState', payload: {success, error}});
        },
        getMetaData: function (success, error) {
            emit({type: 'getMetaData', payload: {success, error}});
        },
        reloadAnswer: function (answer, success, error) {
            emit({type: 'reloadAnswer', payload: {answer, success, error}});
        },
        reloadState: function (state, success, error) {
            emit({type: 'reloadState', payload: {state, success, error}});
        },
        getAnswer: function (success, error) {
            emit({type: 'getAnswer', payload: {success, error}});
        },
        load: function (views, success, error) {
            emit({type: 'load', payload: {views, success, error}});
        },
        gradeAnswer: function (answer, answerToken, success, error) {
            emit({type: 'gradeAnswer', payload: {answer, answerToken, success, error}});
        },
    };
}
