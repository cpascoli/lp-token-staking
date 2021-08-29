import React, { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'

export const AlertDismissible = ({ ...props }) => {
    const [show, setShow] = useState(true);
    const buttonTitle = props.buttonTitle || "Close"
    const buttonAction = props.buttonAction || (() => setShow(false))

    return (
      <>
        <Alert show={show} variant={props.variant}>
          <Alert.Heading>{props.title}</Alert.Heading>
          <p> {props.children} </p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button onClick={buttonAction} variant={`outline-${props.variant}`}>
              {buttonTitle}
            </Button>
          </div>
        </Alert>

      </>
    );
  }
  
  export default AlertDismissible;
  