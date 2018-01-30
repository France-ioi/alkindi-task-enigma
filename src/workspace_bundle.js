
import React from 'react';
import {Button} from 'react-bootstrap';
import {connect} from 'react-redux';
import {range} from 'range';

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
        {range(0, nbRotors).map(index => <Rotor key={index} index={index}/>)}
        <div>
          {hintRequest &&
            <Button style={{float: 'left'}} onClick={this.requestHint}>{`Indice`}</Button>}
          <SchedulingControls/>
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
