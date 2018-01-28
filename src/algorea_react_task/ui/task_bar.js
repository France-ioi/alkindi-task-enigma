
import React from 'react';

function TaskBar (props) {
  return (
     <div className='task-bar'>
        <button type='button' className='btn btn-default' onClick={props.onValidate}>
          {"Validate"}
        </button>
     </div>
  );
}

export default TaskBar
