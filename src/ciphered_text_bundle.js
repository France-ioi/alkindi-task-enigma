
import React from 'react';

import {updateGridGeometry, updateGridVisibleRows} from './utils';

export default function (bundle) {
  bundle.use('appInit', 'taskInit', 'taskReset');
  bundle.addReducer('appInit', appInitReducer);
  bundle.addReducer('taskInit', taskInitReducer);

  bundle.defineAction('cipheredTextResized', 'CipheredText.Resized'
    /* {width: number, height: number} */);
  bundle.addReducer('cipheredTextResized', cipheredTextResizedReducer);

  bundle.defineAction('cipheredTextScrolled', 'CipheredText.Scrolled'
    /* {scrollTop: number} */);
  bundle.addReducer('cipheredTextScrolled', cipheredTextScrolledReducer);

  bundle.defineView('CipheredText', CipherTextViewSelector, CipherTextView);
}

function appInitReducer (state, _action) {
  return {...state, cipheredText: {
    cellWidth: 15,
    cellHeight: 18,
    scrollTop: 0,
    nbCells: 0
  }};
}

function taskInitReducer (state, _action) {
  let {cipheredText, taskData: {cipherText}} = state;
  cipheredText = {...cipheredText, cells: cipherText, nbCells: cipherText.length};
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function cipheredTextResizedReducer (state, {payload: {width}}) {
  let {cipheredText} = state;
  cipheredText = {...cipheredText, width, height: 8 * cipheredText.cellHeight};
  cipheredText = updateGridGeometry(cipheredText);
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function cipheredTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {cipheredText} = state;
  cipheredText = {...cipheredText, scrollTop};
  cipheredText = updateGridVisibleRows(cipheredText);
  return {...state, cipheredText};
}

function CipherTextViewSelector (state) {
  const {scope, cipheredText} = state;
  const {cipheredTextResized, cipheredTextScrolled} = scope;
  const {width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible} = cipheredText;
  return {
    cipheredTextResized, cipheredTextScrolled,
    width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns
  };
}

class CipherTextView extends React.PureComponent {

  render () {
    const {width, height, visibleRows, cellWidth, cellHeight, bottom} = this.props;
    return (
      <div>
        <div ref={this.refTextBox} onScroll={this.onScroll} style={{position: 'relative', width: width && `${width}px`, height: height && `${height}px`, overflowY: 'scroll'}}>
          {(visibleRows||[]).map(({index, columns}) =>
            <div key={index} style={{position: 'absolute', top: `${index * cellHeight}px`}}>
              {columns.map(({index, cell}) =>
                <span key={index} style={{position: 'absolute', left: `${index * cellWidth}px`, width: `${cellWidth}px`, height: `${cellHeight}px`}}>
                  {cell || ' '}
                </span>)}
            </div>)}
          <div style={{position: 'absolute', top: `${bottom}px`, width: '1px', height: '1px'}}/>
        </div>
      </div>
    );
  }

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.cipheredTextResized, payload: {width, height}});
  };

  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.cipheredTextScrolled, payload: {scrollTop}});
  };

}
