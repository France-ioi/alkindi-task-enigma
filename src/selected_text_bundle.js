
import React from 'react';
import {connect} from 'react-redux';
import {Button} from 'react-bootstrap';
import update from 'immutability-helper';
import {range} from 'range';
import classnames from 'classnames';

import {changeSelection, sortedArrayHasElement, updateGridVisibleArea} from './utils';

function appInitReducer (state, _action) {
  return {...state, selectedText: {
    cellWidth: 17,
    cellHeight: 20,
    pageColumns: 30,
    scrollTop: 0,
    mode: 'rows',
    selectedRows: [],
    selectedColumns: [],
    nbCells: 0
  }};
}

function taskInitReducer (state, _action) {
  const {cipherText} = state.taskData;
  return update(state, {selectedText: {cells: {$set: cipherText}, nbCells: {$set: cipherText.length}}});
}

function selectedTextResizedReducer (state, {payload: {width, height}}) {
  let {selectedText} = state;
  selectedText = {...selectedText, width, height: Math.max(8 * selectedText.cellHeight, height)};
  return {...state, selectedText};
}

function selectedTextScrolledReducer (state, {payload: {scrollTop, rows}}) {
  let {selectedText} = state;
  if (typeof rows === 'number') {
    const {cellHeight, maxTop} = selectedText;
    scrollTop = Math.max(0, Math.min(maxTop, selectedText.scrollTop + rows * cellHeight));
  }
  selectedText = {...selectedText, scrollTop};
  return {...state, selectedText};
}

function selectedTextModeChangedReducer (state, {payload: {mode}}) {
  let {selectedText} = state;
  selectedText = {...selectedText, mode: mode};
  return {...state, selectedText};
}

function selectedTextPageColumnsChangedReducer (state, {payload: {columns}}) {
  let {selectedText} = state;
  selectedText = {...selectedText, pageColumns: columns, selectedRows: [], selectedColumns: []};
  return {...state, selectedText};
}

function selectedTextSelectionChangedReducer (state, {payload: {selected, index}}) {
  // /* {selected: bool} union ({} or {index: number}) */);
  let {selectedText, taskData} = state;
  const {mode} = selectedText;
  if (mode === 'rows') {
    let {selectedRows} = selectedText;
    if (typeof index === 'number') {
      if (selected === 'only') {
        selectedRows = [index];
      } else {
        selected = !sortedArrayHasElement(selectedRows, index);
        selectedRows = update(selectedRows, changeSelection(selectedRows, index, selected));
      }
    } else if (selected) {
      const rows = Math.ceil(taskData.cipherText.length / selectedText.pageColumns);
      selectedRows = range(0, rows);
    } else {
      selectedRows = [];
    }
    selectedText = {...selectedText, selectedRows};
  } else if (mode === 'columns') {
    let {selectedColumns} = selectedText;
    if (typeof index === 'number') {
      if (selected === 'only') {
        selectedColumns = [index];
      } else {
        selected = !sortedArrayHasElement(selectedColumns, index);
        selectedColumns = update(selectedColumns, changeSelection(selectedColumns, index, selected));
      }
    } else if (selected) {
      selectedColumns = range(0, selectedText.pageColumns);
    } else {
      selectedColumns = [];
    }
    selectedText = {...selectedText, selectedColumns};
  }
  return {...state, selectedText};
}

function selectedTextLateReducer (state) {
  let {selectedText} = state;
  if (selectedText) {
    selectedText = updateGeometry(selectedText);
    /* TODO: update grid.top so that the same first row remains visible? */
    selectedText = updateGridVisibleArea(selectedText);
    if (selectedText !== state.selectedText) {
      state = {...state, selectedText};
    }
  }
  return state;
}

function updateGeometry (grid) {
  /* TODO: build a cache key, store it in the grid, use it to skip computation when unchanged */
  const {height, cellHeight, scrollTop, cells, pageColumns} = grid;
  const pageRows = Math.max(8, Math.ceil(height / cellHeight));
  let bottom = 100, maxTop = 0;
  if (height && cells) {
    bottom = Math.ceil(cells.length / pageColumns) * cellHeight - 1;
    maxTop = Math.max(0, bottom + 1 - pageRows * cellHeight);
  }
  return {...grid, pageRows, scrollTop: Math.min(maxTop, scrollTop), bottom, maxTop};
}

function SelectedTextViewSelector (state) {
  const {actions, selectedText} = state;
  const {selectedTextResized, selectedTextScrolled, selectedTextModeChanged, selectedTextPageColumnsChanged, selectedTextSelectionChanged} = actions;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, mode, scrollTop} = selectedText;
  return {
    selectedTextResized, selectedTextScrolled, selectedTextModeChanged, selectedTextPageColumnsChanged, selectedTextSelectionChanged,
    width, height, visible, cellWidth, cellHeight, bottom, pageRows, pageColumns, mode, scrollTop
  };
}

class SelectedTextView extends React.PureComponent {

  render () {
    const {width, height, visible, cellWidth, cellHeight, pageColumns, bottom, mode} = this.props;

    return (
      <div>
        <div className='form-inline' style={{marginBottom: '7px'}}>
          <div className='btn-group' style={{marginRight: '7px'}}>
            <Button onClick={this.setRowMode} active={mode === 'rows'} bsSize='sm'>{"lignes"}</Button>
            <Button onClick={this.setColMode} active={mode === 'columns'} bsSize='sm'>{"colonnes"}</Button>
          </div>
          <div className='btn-group' style={{marginRight: '7px'}}>
            <Button onClick={this.scrollPageUp} bsSize='sm'><i className='fa fa-angle-double-up'></i></Button>
            <Button onClick={this.scrollRowUp} bsSize='sm'><i className='fa fa-angle-up'></i></Button>
            <Button onClick={this.scrollRowDown} bsSize='sm'><i className='fa fa-angle-down'></i></Button>
            <Button onClick={this.scrollPageDown} bsSize='sm'><i className='fa fa-angle-double-down'></i></Button>
          </div>
          <div className='form-group'>
            <label style={{fontWeight: 'normal', marginRight: '3px'}}>{'Colonnes :'}</label>
            <input type='number' value={this.state.pageColumns === null ? pageColumns : this.state.pageColumns} onChange={this.pageColumnsChange}
            style={{marginRight: '7px', width:'70px', color: this.state.pageColumns === null ? 'black' : 'red'}} className={classnames('form-control', 'input-sm', this.state.pageColumns === null ? '' : 'inputError')}/>
          </div>
          <div className='btn-group'>
            <Button onClick={this.selectAll} bsSize='sm'>{" all "}</Button>
            <Button onClick={this.selectNone} bsSize='sm'>{" none "}</Button>
          </div>
        </div>
        <div>
          <div ref={this.refTextBox} onScroll={this.onScroll} style={{position: 'relative', width: width && `${width}px`, height: height && `${height}px`, overflowY: 'scroll'}}>
            {visible && (visible.rows||[]).map(({index, columns, selected}) =>
              <div key={index} className={classnames('selectText', 'selectText-rows', selected ? 'selected' : '')} style={{top: `${index * cellHeight}px`, width: `${cellWidth * pageColumns}px`, height: `${cellHeight}px`}}
                onClick={this.rowClicked} data-index={index}>
                <div className='selectTextInner' style={{width: `${cellWidth * pageColumns}px`, height: `${cellHeight - 2}px`}}>
                  {columns.map(({index, cell}) =>
                    <span key={index} style={{left: `${index * cellWidth}px`, width: `${cellWidth}px`, height: `${cellHeight}px`}}>
                      {cell || ' '}
                    </span>)}
                </div>
              </div>)}
            {visible && (visible.columns||[]).map(({index, rows, selected}) =>
              <div key={index} className={classnames('selectText', 'selectText-columns', selected ? 'selected' : '')} style={{left: `${index * cellWidth}px`, width: `${cellWidth}px`, height: `${bottom}px`}}
                onClick={this.columnClicked} data-index={index}>
                <div className='selectTextInner' style={{width: `${cellWidth - 2}px`, height: `${bottom}px`}}>
                  {rows.map(({index, cell}) =>
                    <span key={index} style={{top: `${index * cellHeight}px`, width: `${cellWidth}px`, height: `${cellHeight}px`}}>
                      {cell || ' '}
                    </span>)}
                </div>
              </div>)}
            <div style={{position: 'absolute', top: `${bottom}px`, width: '1px', height: '1px'}}/>
          </div>
        </div>
      </div>
    );
  }

  componentDidUpdate () {
    if (this._textBox) {
      this._textBox.scrollTop = this.props.scrollTop;
    }
  }

  state = {pageColumns: null};

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.selectedTextResized, payload: {width, height}});
  };

  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.selectedTextScrolled, payload: {scrollTop}});
  };

  setRowMode = () => {
    this.props.dispatch({type: this.props.selectedTextModeChanged, payload: {mode: 'rows'}});
  };
  setColMode = () => {
    this.props.dispatch({type: this.props.selectedTextModeChanged, payload: {mode: 'columns'}});
  };

  scrollPageUp = () => {
    this.props.dispatch({type: this.props.selectedTextScrolled, payload: {rows: -this.props.pageRows}});
  };
  scrollRowUp = () => {
    this.props.dispatch({type: this.props.selectedTextScrolled, payload: {rows: -1}});
  };
  scrollRowDown = () => {
    this.props.dispatch({type: this.props.selectedTextScrolled, payload: {rows: 1}});
  };
  scrollPageDown = () => {
    this.props.dispatch({type: this.props.selectedTextScrolled, payload: {rows: this.props.pageRows}});
  };

  pageColumnsChange = (event) => {
    const text = event.target.value;
    const value = parseInt(text);
    if (!isNaN(value) && value > 0 && value < 80) {
      this.setState({pageColumns: null});
      this.props.dispatch({type: this.props.selectedTextPageColumnsChanged, payload: {columns: value}});
    } else {
      this.setState({pageColumns: text});
    }
  };

  selectAll = () => {
    this.props.dispatch({type: this.props.selectedTextSelectionChanged, payload: {selected: true}});
  };
  selectNone = () => {
    this.props.dispatch({type: this.props.selectedTextSelectionChanged, payload: {selected: false}});
  };
  rowClicked = (event) => {
    const index = parseInt(event.currentTarget.dataset.index);
    this.props.dispatch({type: this.props.selectedTextSelectionChanged, payload: {index, selected: event.shiftKey ? 'toggle' : 'only'}});
  };
  columnClicked = (event) => {
    const index = parseInt(event.currentTarget.dataset.index);
    this.props.dispatch({type: this.props.selectedTextSelectionChanged, payload: {index, selected: event.shiftKey ? 'toggle' : 'only'}});
  };

}

export default {
  actions: {
    selectedTextResized: 'SelectedText.Resized' /* {width: number, height: number} */,
    selectedTextScrolled: 'SelectedText.Scrolled' /* {top: number} */,
    selectedTextModeChanged: 'SelectedText.Mode.Changed' /* {mode: 'rows' or 'columns'} */,
    selectedTextPageColumnsChanged: 'SelectedText.PageColumns.Changed' /* {columns: number} */,
    selectedTextSelectionChanged: 'SelectedText.Selection.Changed' /* {selected: bool} union ({} or {index: number}) */,
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    selectedTextResized: selectedTextResizedReducer,
    selectedTextScrolled: selectedTextScrolledReducer,
    selectedTextModeChanged: selectedTextModeChangedReducer,
    selectedTextPageColumnsChanged: selectedTextPageColumnsChangedReducer,
    selectedTextSelectionChanged: selectedTextSelectionChangedReducer,
  },
  lateReducer: selectedTextLateReducer,
  views: {
    SelectedText: connect(SelectedTextViewSelector)(SelectedTextView)
  },
};
