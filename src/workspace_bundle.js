
import React from 'react';

export default function (bundle) {

  bundle.use('CipheredText', 'SelectedText', 'FrequencyAnalysis');
  bundle.defineView('Workspace', WorkspaceSelector, Workspace);

}

function WorkspaceSelector (state) {
  const {CipheredText, SelectedText, FrequencyAnalysis} = state.scope;
  return {CipheredText, SelectedText, FrequencyAnalysis};
}

class Workspace extends React.PureComponent {
  render () {
    const {CipheredText, SelectedText, FrequencyAnalysis} = this.props;
    return (
      <div>
        <h2>{"Message chiffré"}</h2>
        <CipheredText/>
        <h2>{"Sélection de lignes ou colonnes"}</h2>
        <SelectedText/>
        <h2>{"Analyse de fréquence de la sélection"}</h2>
        <FrequencyAnalysis/>
      </div>
    );
  }
}
