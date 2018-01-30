
import React from 'react';
import {Button} from 'react-bootstrap';
import {connect} from 'react-redux';
import {range} from 'range';
import classnames from 'classnames';

function WorkspaceSelector (state) {
  const {
    views: {CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText},
    actions: {requestHint},
    rotors, editing
  } = state;
  let hintRequest = null;
  if (typeof editing.rotorIndex === 'number') {
    const editingCell = rotors[editing.rotorIndex].cells[editing.cellRank];
    if (!editingCell.hint && !editingCell.locked) {
      hintRequest = editing;
    }
  }
  return {
    CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText,
    requestHint, hintRequest, nbRotors: rotors.length
  };
}

class Workspace extends React.PureComponent {
  render () {
    const {CipheredText, SelectedText, FrequencyAnalysis, Rotor, SchedulingControls, DecipheredText, nbRotors, hintRequest} = this.props;
    return (
      <div>
        <h2>{"Message chiffré"}</h2>
        <CipheredText/>
        <h2>{"Sélection de lignes ou colonnes"}</h2>
        <SelectedText/>
        <h2>{"Analyse de fréquence de la sélection"}</h2>
        <FrequencyAnalysis/>
        <h2>{`Rotor${nbRotors > 1 ? 's' : ''} de déchiffrement`}</h2>
        <div className='clearfix'>
          <div style={{border: '1px solid #ccc', float: 'right', width: '200px', padding: '10px', borderRadius: '5px', backgroundColor: '#f9f9f9', fontSize: '12px', marginRight: '15px'}}>
            <p style={{fontWeight: 'bold', textAlign: 'center'}}>{"Indices"}</p>
            <p>{"Pour un coût de "}<span style={{fontWeight: 'bold'}}>{"5 points"}</span>{", cliquez sur une case de rotor et validez pour obtenir sa valeur."}</p>
            <div style={{textAlign: 'center', margin: '10px 0'}}>
              <Button onClick={this.requestHint} disabled={!hintRequest}>{`Valider`}</Button>
            </div>
          </div>
          <div style={{float: 'left'}}>
            {range(0, nbRotors).map(index => <Rotor key={index} index={index}/>)}
            <SchedulingControls/>
          </div>
        </div>
        <h2>{"Texte déchiffré"}</h2>
        <DecipheredText/>
      </div>
    );
  }
  requestHint = () => {
    const {dispatch, requestHint, hintRequest} = this.props;
    dispatch({type: requestHint, payload: {request: hintRequest}});
  };
}

export default {
  views: {
    Workspace: connect(WorkspaceSelector)(Workspace),
  }
};
