
import React from 'react';
import {Button} from 'react-bootstrap';
import update from 'immutability-helper';

import {getRotorShift} from './utils';

export default function (bundle) {
  bundle.addReducer('appInit', appInitReducer);
  bundle.addReducer('taskInit', taskInitReducer);
  bundle.defineView('SchedulingControls', SchedulingControlsSelector, SchedulingControlsView);
  bundle.defineAction('schedulingStatusChanged', 'scheduling.Status.Changed');
  bundle.addReducer('schedulingStatusChanged', schedulingStatusChangedReducer);
  bundle.defineAction('schedulingStepBackward', 'scheduling.StepBackward');
  bundle.addReducer('schedulingStepBackward', schedulingStepBackwardReducer);
  bundle.defineAction('schedulingStepForward', 'scheduling.StepForward');
  bundle.addReducer('schedulingStepForward', schedulingStepForwardReducer);
  bundle.defineAction('schedulingJump', 'scheduling.Jump');
  bundle.addReducer('schedulingJump', schedulingJumpReducer);
  bundle.addLateReducer(schedulingLateReducer);
  bundle.addSaga(schedulingSaga);
}

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
  let {scheduling, taskData: {alphabet, cipherText}} = state;
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
  }
  return update(state, {scheduling: changes});
}

function schedulingStepBackwardReducer (state, action) {
  const {scheduling: {position}} = state;
  if (position === 0) return state;
  return update(state, {scheduling: {
    status: {$set: 'pause'},
    position: {$set: position - 1}
  }});
}

function schedulingStepForwardReducer (state, action) {
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
  /* TODO: write scheduling saga
     - When status changes to play, fork a task that puts schedulingStopForward every (1/speed) seconds.
     - When status changes away from play, kill the task. */
}

function SchedulingControlsSelector (state) {
  const {scope, taskData: {alphabet}, scheduling: {status, position}} = state;
  const {schedulingStatusChanged, schedulingStepBackward, schedulingStepForward} = scope;
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
