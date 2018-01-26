
import React from 'react';
import classnames from 'classnames';
import {Button} from 'react-bootstrap';
import {range} from 'range';
import update from 'immutability-helper';

export default function (bundle) {
  bundle.addReducer('appInit', appInitReducer);
  bundle.addReducer('taskInit', taskInitReducer);
  bundle.defineView('DecodingRotor', DecodingRotorSelector, DecodingRotorView);
  bundle.defineAction('decodingRotorCellLockChanged', 'DecodingRotor.Cell.Lock.Changed');
  bundle.addReducer('decodingRotorCellLockChanged', decodingRotorCellLockChangedReducer);
  bundle.defineAction('decodingRotorCellClearChanged', 'DecodingRotor.Cell.Clear.Changed');
  bundle.addReducer('decodingRotorCellClearChanged', decodingRotorCellClearChangedReducer);
  bundle.defineAction('decodingRotorStatusChanged', 'DecodingRotor.Status.Changed');
  bundle.addReducer('decodingRotorStatusChanged', decodingRotorStatusChangedReducer);
  bundle.defineAction('decodingRotorStepBackward', 'DecodingRotor.StepBackward');
  bundle.addReducer('decodingRotorStepBackward', decodingRotorStepBackwardReducer);
  bundle.defineAction('decodingRotorStepForward', 'DecodingRotor.StepForward');
  bundle.addReducer('decodingRotorStepForward', decodingRotorStepForwardReducer);
  bundle.addSaga(decodingRotorSaga);
}

function appInitReducer (state, _action) {
  return {...state, decodingRotor: {
    cells: [],
    status: 'start',
    speed: 1.0,
    position: 0,
    startPosition: 0,
    endPosition: 0
  }};
}

function taskInitReducer (state, _action) {
  let {decodingRotor, taskData: {alphabet, cipherText}} = state;
  const cells = alphabet.split('')
    .map(c => ({cipher: c, clear: null, isLocked: false}));
  decodingRotor = {...decodingRotor, cells, endPosition: cipherText.length - 1};
  return {...state, decodingRotor};
}

function decodingRotorCellClearChangedReducer (state, {payload: {index, value}}) {
  const {taskData: {alphabet}, decodingRotor} = state;
  value = value.toUpperCase();
  if (value.length !== 1 || alphabet.indexOf(value) === -1) return state;
  const cellsUpdate = {};
  /* First remove a previous occurrence of the entered value. */
  const prevIndex = decodingRotor.cells.findIndex(cell => cell.clear === value);
  if (prevIndex !== -1) {
    cellsUpdate[prevIndex] = {clear: {$set: null}};
  }
  /* Set the new value.  If a letter was entered in the same spot, no change will occur. */
  cellsUpdate[index] = {clear: {$set: value}};
  return update(state, {decodingRotor: {cells: cellsUpdate}});
}

function decodingRotorCellLockChangedReducer (state, {payload: {index, isLocked}}) {
  return update(state, {decodingRotor: {cells: {[index]: {isLocked: {$set: isLocked}}}}});
}

function decodingRotorStatusChangedReducer (state, {payload: {status}}) {
  const {decodingRotor} = state;
  const changes = {status: {$set: status}};
  if (status === 'start') {
    changes.position = {$set: decodingRotor.startPosition};
  } else if (status === 'end') {
    changes.position = {$set: decodingRotor.endPosition};
  }
  return update(state, {decodingRotor: changes});
}

function decodingRotorStepBackwardReducer (state, action) {
  const {decodingRotor: {position}} = state;
  if (position === 0) return state;
  return update(state, {decodingRotor: {
    status: {$set: 'pause'},
    position: {$set: position - 1}
  }});
}

function decodingRotorStepForwardReducer (state, action) {
  const {decodingRotor: {position, endPosition}} = state;
  if (position === endPosition) return state;
  return update(state, {decodingRotor: {
    status: {$set: 'pause'},
    position: {$set: position + 1}
  }});
}

function* decodingRotorSaga () {
  /* TODO */
}

function DecodingRotorSelector (state) {
  const {scope, taskData: {alphabet}, decodingRotor: {status, cells, position}} = state;
  const {
    decodingRotorCellLockChanged, decodingRotorCellClearChanged,
    decodingRotorStatusChanged,
    decodingRotorStepBackward, decodingRotorStepForward
  } = scope;
  const shift = position % alphabet.length;
  return {
    decodingRotorCellLockChanged, decodingRotorCellClearChanged,
    decodingRotorStatusChanged, decodingRotorStepBackward,
    decodingRotorStepForward,
    alphabet, status, cells, shift: shift
  };
}

class DecodingRotorView extends React.PureComponent {
  render () {
    const {alphabet, status, shift, cells} = this.props;
    const alphabetSize = alphabet.length;
    return (
      <div style={{width: `${20*alphabetSize}px`, margin: '0 auto'}}>
        <div className='clearfix'>
          {range(0, alphabetSize).map(index => {
            const {clear, isLocked} = cells[index];
            const isEditing = this.state.editing === index;
            const isLast = alphabetSize === index + 1;
            const shiftedIndex = (index + shift) % alphabetSize;
            const {cipher} = cells[shiftedIndex];
            return (
              <DecodingRotorCell key={index} index={index} isLast={isLast}
                symbol={cipher} target={clear} isLocked={isLocked} isEditing={isEditing}
                onChangeTarget={this.onChangeClear} onChangeLocked={this.onChangeLocked}
                onEditingStarted={this.onEditingStarted} />);
          })}
        </div>
        <div style={{textAlign: 'center'}}>
          <div className='btn-group'>
            <Button onClick={this.onFastBackwardClicked} style={{width: '40px'}} active={status === 'start'}><i className='fa fa-fast-backward'/></Button>
            <Button onClick={this.onStepBackwardClicked} style={{width: '40px'}}><i className='fa fa-step-backward'/></Button>
            <Button onClick={this.onPlayClicked} style={{width: '40px'}} active={status === 'play'}><i className='fa fa-play'/></Button>
            <Button onClick={this.onStepForwardClicked} style={{width: '40px'}}><i className='fa fa-step-forward'/></Button>
            <Button onClick={this.onFastForwardClicked} style={{width: '40px'}} active={status === 'end'}><i className='fa fa-fast-forward'/></Button>
          </div>
        </div>
      </div>
    );
  }
  state = {editing: false};
  onFastBackwardClicked = (_event) => {
    this.props.dispatch({type: this.props.decodingRotorStatusChanged, payload: {status: 'start'}});
  };
  onStepBackwardClicked = (_event) => {
    this.props.dispatch({type: this.props.decodingRotorStepBackward});
  };
  onPlayClicked = (_event) => {
    this.props.dispatch({type: this.props.decodingRotorStatusChanged, payload: {status: 'play'}});
  };
  onStepForwardClicked = (_event) => {
    this.props.dispatch({type: this.props.decodingRotorStepForward});
  };
  onFastForwardClicked = (_event) => {
    this.props.dispatch({type: this.props.decodingRotorStatusChanged, payload: {status: 'end'}});
  };
  onChangeClear = (index, value) => {
    this.props.dispatch({type: this.props.decodingRotorCellClearChanged, payload: {index, value}});
    this.setState({editing: false});
  };
  onChangeLocked = (index, isLocked) => {
    this.props.dispatch({type: this.props.decodingRotorCellLockChanged, payload: {index, isLocked}});
  };
  onEditingStarted = (index) => {
    this.setState({editing: index});
  };
}

class DecodingRotorCell extends React.PureComponent {
  /* XXX Clicking in the target div and entering the same letter does not
         trigger a change event.  This behavior is unfortunate. */
  render () {
    const {symbol, target, isLast, isLocked, isEditing} = this.props;
    return (
      <div style={{float: 'left', width: '20px'}}>
        <div style={{border: '1px solid black', borderRightWidth: isLast ? '1px' : '0', textAlign: 'center'}}>
          {symbol || '\u00A0'}
        </div>
        <div style={{border: '1px solid black', borderRightWidth: isLast ? '1px' : '0', textAlign: 'center', marginTop: '2px', cursor: 'text'}} onClick={this.targetClicked} >
          {isEditing
            ? <input ref={this.refTargetInput} onChange={this.targetChanged}
                type='text' value={target||''} style={{width: '19px', height: '20px', border: 'none'}} />
            : (target || '\u00A0')}
        </div>
        <div style={{marginTop: '2px', textAlign: 'center', cursor: 'pointer'}} onClick={this.lockClicked}>
          <i className={classnames(['fa', isLocked ? 'fa-lock' : 'fa-unlock-alt'])} />
        </div>
      </div>
    );
  }
  componentDidUpdate () {
    if (this._targetInput) {
      this._targetInput.select();
      this._targetInput.focus();
    }
  }
  targetClicked = (event) => {
    if (!this.props.isLocked && !this.props.isEditing) {
      event.stopPropagation();
      event.preventDefault();
      this.props.onEditingStarted(this.props.index);
    }
  };
  targetChanged = (event) => {
    const value = this._targetInput.value.substr(-1); /* /!\ IE compatibility */
    this.props.onChangeTarget(this.props.index, value);
  };
  lockClicked = (event) => {
    this.props.onChangeLocked(this.props.index, !this.props.isLocked);
  };
  refTargetInput = (element) => {
    this._targetInput = element;
  };
}
