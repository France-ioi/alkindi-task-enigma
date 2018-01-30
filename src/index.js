
import update from 'immutability-helper';
import algoreaReactTask from './algorea_react_task';

import 'font-awesome/css/font-awesome.css';
import 'bootstrap/dist/css/bootstrap.css';
import './style.css';

import CipheredTextBundle from './ciphered_text_bundle';
import SelectedTextBundle from './selected_text_bundle';
import FrequencyAnalysisBundle from './frequency_analysis_bundle';
import SchedulingBundle from './scheduling_bundle';
import RotorsBundle from './rotors_bundle';
import DecipheredTextBundle from './deciphered_text_bundle';
import WorkspaceBundle from './workspace_bundle';
import {dumpRotors, loadRotors} from './utils';

const TaskBundle = {
    actionReducers: {
        appInit: appInitReducer,
        taskInit: taskInitReducer /* possibly move to algorea-react-task */,
        taskRefresh: taskRefreshReducer /* possibly move to algorea-react-task */,
        taskAnswerLoaded: taskAnswerLoaded,
        taskStateLoaded: taskStateLoaded,
    },
    includes: [
        CipheredTextBundle,
        SelectedTextBundle,
        FrequencyAnalysisBundle,
        SchedulingBundle,
        RotorsBundle,
        DecipheredTextBundle,
        WorkspaceBundle,
    ],
    selectors: {
      getTaskState,
      getTaskAnswer,
    }
};

if (process.env.NODE_ENV === 'development') {
    /* eslint-disable no-console */
    TaskBundle.earlyReducer = function (state, action) {
        console.log('ACTION', action.type, action);
        return state;
    };
}

function appInitReducer (state, _action) {
    const taskMetaData = {
       "id": "http://concours-alkindi.fr/tasks/2018/enigma",
       "language": "fr",
       "version": "fr.01",
       "authors": "Sébastien Carlier",
       "translators": [],
       "license": "",
       "taskPathPrefix": "",
       "modulesPathPrefix": "",
       "browserSupport": [],
       "fullFeedback": true,
       "acceptedAnswers": [],
       "usesRandomSeed": true
    };
    return {...state, taskMetaData};
}

function taskInitReducer (state, _action) {
  const {taskData: {alphabet, rotors: rotorSpecs, hints}} = state;
  const rotors = loadRotors(alphabet, rotorSpecs, hints, rotorSpecs.map(_ => []));
  return {...state, rotors, taskReady: true};
}

function taskRefreshReducer (state, _action) {
  const {taskData: {alphabet, rotors: rotorSpecs, hints}} = state;
  const dump = dumpRotors(alphabet, state.rotors);
  const rotors = loadRotors(alphabet, rotorSpecs, hints, dump);
  return {...state, rotors};
}

function getTaskAnswer (state) {
  const {taskData: {alphabet}} = state;
  return {
    rotors: state.rotors.map(rotor => rotor.cells.map(({editable}) => alphabet.indexOf(editable)))
  };
}

function taskAnswerLoaded (state, {payload: {answer}}) {
  const {taskData: {alphabet, rotors: rotorSpecs, hints}} = state;
  const rotors = loadRotors(alphabet, rotorSpecs, hints, answer.rotors);
  return update(state, {rotors: {$set: rotors}});
}

function getTaskState (state) {
  const {taskData: {alphabet}} = state;
  return {rotors: dumpRotors(alphabet, state.rotors)};
}

function taskStateLoaded (state, {payload: {dump}}) {
  const {taskData: {alphabet, rotors: rotorSpecs, hints}} = state;
  const rotors = loadRotors(alphabet, rotorSpecs, hints, dump.rotors);
  return update(state, {rotors: {$set: rotors}});
}

export function run (container, options) {
    return algoreaReactTask(container, options, TaskBundle);
}
