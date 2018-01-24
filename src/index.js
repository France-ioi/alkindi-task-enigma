
import algoreaReactTask from './algorea_react_task';

import 'font-awesome/css/font-awesome.css';
import 'bootstrap/dist/css/bootstrap.css';
import './style.css';

import CipheredTextBundle from './ciphered_text_bundle';
import SelectedTextBundle from './selected_text_bundle';
import FrequencyAnalysisBundle from './frequency_analysis_bundle';
import DecodingRotorBundle from './decoding_rotor_bundle';
import WorkspaceBundle from './workspace_bundle';

export function run (container, options) {
    return algoreaReactTask(container, options, TaskBundle);
}

function TaskBundle (bundle) {

    bundle.defineAction('taskInit', 'taskInit');
    bundle.addReducer('taskInit', taskInitReducer);

    bundle.defineAction('taskRefresh', 'taskRefresh');
    bundle.addReducer('taskRefresh', taskRefreshReducer);

    bundle.include(CipheredTextBundle);
    bundle.include(SelectedTextBundle);
    bundle.include(FrequencyAnalysisBundle);
    bundle.include(DecodingRotorBundle);
    bundle.include(WorkspaceBundle);

    if (process.env.NODE_ENV === 'development') {
        /* eslint-disable no-console */
        bundle.addEarlyReducer(function (state, action) {
            console.log('ACTION', action.type, action);
            return state;
        });
    }

}

function taskInitReducer (state, _action) {
    /* TODO: initialize from state.task */
    return {...state, taskReady: true};
}

function taskRefreshReducer (state, _action) {
    return state; /* XXX figure out what needs to happen here */
}
