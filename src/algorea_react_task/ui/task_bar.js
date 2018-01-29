
import React from 'react';
import {Button} from 'react-bootstrap';

function TaskBar (props) {
  return (
     <div className='task-bar'>
        <Button onClick={props.onValidate}>
          {"Valider"}
        </Button>
     </div>
  );
}

export default TaskBar;
