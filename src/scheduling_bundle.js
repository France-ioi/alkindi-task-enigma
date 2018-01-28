
import React from 'react';
import {connect} from 'react-redux';
import {Button} from 'react-bootstrap';
import update from 'immutability-helper';
import {delay} from 'redux-saga';
import {select, takeLatest, put} from 'redux-saga/effects';

import {getRotorShift} from './utils';

function appInitReducer (state, _action) {
  return {...state, scheduling: {
    status: 'start',
    speed: 1.0,
    position: 0,
    shifts: [],
    startPosition: 0,
    endPosition: 0
  }};
}

function taskInitReducer (state, _action) {
  let {scheduling, taskData: {cipherText}} = state;
  scheduling = {...scheduling, endPosition: cipherText.length - 1};
  return {...state, scheduling};
}

function schedulingStatusChangedReducer (state, {payload: {status}}) {
  const {scheduling} = state;
  const changes = {status: {$set: status}};
  if (status === 'start') {
    changes.position = {$set: scheduling.startPosition};
  } else if (status === 'end') {
    changes.position = {$set: scheduling.endPosition};
  } else if (status === 'play') {
    if (scheduling.position === scheduling.endPosition) {
      changes.position = {$set: scheduling.startPosition};
    }
  }
  return update(state, {scheduling: changes});
}

function schedulingStepBackwardReducer (state, _action) {
  const {scheduling: {position}} = state;
  if (position === 0) return state;
  return update(state, {scheduling: {
    status: {$set: 'pause'},
    position: {$set: position - 1}
  }});
}

function schedulingStepForwardReducer (state, _action) {
  const {scheduling: {position, endPosition}} = state;
  if (position === endPosition) return state;
  return update(state, {scheduling: {
    status: {$set: 'pause'},
    position: {$set: position + 1}
  }});
}

function schedulingJumpReducer (state, {payload: {position}}) {
  return update(state, {scheduling: {
    status: {$set: 'pause'},
    position: {$set: position}
  }});
}

function schedulingTickReducer (state, _action) {
  const {scheduling: {position, endPosition}} = state;
  if (position === endPosition) {
    return update(state, {scheduling: {
      status: {$set: 'end'}
    }});
  }
  return update(state, {scheduling: {
    position: {$set: position + 1}
  }});
}

function schedulingLateReducer (state) {
  const {rotors, scheduling} = state;
  if (!scheduling) {
    return state;
  }
  const {position} = scheduling;
  const shifts = rotors.map(rotor => getRotorShift(rotor, position));
  return update(state, {scheduling: {shifts: {$set: shifts}}});
}

function* schedulingSaga () {
  const {schedulingTick} = yield select(({actions}) => actions);
  const statusChangingActions = yield select(({actions}) => ['schedulingStatusChanged', 'schedulingStepBackward', 'schedulingStepForward', 'schedulingJump'].map(name => actions[name]));
  yield takeLatest(statusChangingActions, function* () {
    let status = yield select(({scheduling: {status}}) => status);
    if (status === 'play') {
      while (true) {
        yield put({type: schedulingTick});
        status = yield select(({scheduling: {status}}) => status);
        if ('play' !== status) {
          return; /* reached end of text */
        }
        yield delay(1000);
      }
    }
  });
}

function SchedulingControlsSelector (state) {
  const {actions, taskData: {alphabet}, scheduling: {status}} = state;
  const {schedulingStatusChanged, schedulingStepBackward, schedulingStepForward} = actions;
  const alphabetSize = alphabet.length;
  return {schedulingStatusChanged, schedulingStepBackward, schedulingStepForward, status, alphabetSize};
}

class SchedulingControlsView extends React.PureComponent {
  render () {
    const {alphabetSize, status} = this.props;
    return (
      <div style={{width: `${20*alphabetSize}px`, margin: '0 auto', textAlign: 'center'}}>
        <div className='btn-group'>
          <Button onClick={this.onFastBackwardClicked} style={{width: '40px'}} active={status === 'start'}><i className='fa fa-fast-backward'/></Button>
          <Button onClick={this.onStepBackwardClicked} style={{width: '40px'}}><i className='fa fa-step-backward'/></Button>
          <Button onClick={this.onPlayClicked} style={{width: '40px'}} active={status === 'play'}><i className='fa fa-play'/></Button>
          <Button onClick={this.onStepForwardClicked} style={{width: '40px'}}><i className='fa fa-step-forward'/></Button>
          <Button onClick={this.onFastForwardClicked} style={{width: '40px'}} active={status === 'end'}><i className='fa fa-fast-forward'/></Button>
        </div>
      </div>
    );
  }
  onFastBackwardClicked = (_event) => {
    this.props.dispatch({type: this.props.schedulingStatusChanged, payload: {status: 'start'}});
  };
  onStepBackwardClicked = (_event) => {
    this.props.dispatch({type: this.props.schedulingStepBackward});
  };
  onPlayClicked = (_event) => {
    this.props.dispatch({type: this.props.schedulingStatusChanged, payload: {status: 'play'}});
  };
  onStepForwardClicked = (_event) => {
    this.props.dispatch({type: this.props.schedulingStepForward});
  };
  onFastForwardClicked = (_event) => {
    this.props.dispatch({type: this.props.schedulingStatusChanged, payload: {status: 'end'}});
  };
}

export default {
  actions: {
    schedulingStatusChanged: 'Scheduling.Status.Changed',
    schedulingStepBackward: 'Scheduling.StepBackward',
    schedulingStepForward: 'Scheduling.StepForward',
    schedulingJump: 'Scheduling.Jump',
    schedulingTick: 'Scheduling.Tick',
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    schedulingStatusChanged: schedulingStatusChangedReducer,
    schedulingStepBackward: schedulingStepBackwardReducer,
    schedulingStepForward: schedulingStepForwardReducer,
    schedulingJump: schedulingJumpReducer,
    schedulingTick: schedulingTickReducer,
  },
  lateReducer: schedulingLateReducer,
  saga: schedulingSaga,
  views: {
    SchedulingControls: connect(SchedulingControlsSelector)(SchedulingControlsView),
  }
};
