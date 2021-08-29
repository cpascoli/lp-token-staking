import React from 'react'
import { Form, Button, InputGroup } from 'react-bootstrap'
import { getAllowance, approve } from "../web3/cake_lp"
import { createStake } from "../web3/stakes"

export default class CreateStakeForm extends React.Component {

  constructor(props) {
      super(props)

      this.state = {
        sufficientAllowance: false,
        validAmount: false,
        amount: "",
      }
  }

  
  updateAmount = (e) => {

    console.log(">> updateField", e)
    // validate amount
    let value = parseInt(e.target.value)
    let isValid = !isNaN(value) && value > 0

    this.setState({
        validAmount: isValid, 
        amount: e.target.value
    })

    if (isValid) {
        this.checkAllowance(value).then(allowanceOk => {
            this.setState({sufficientAllowance: allowanceOk})
        })
    }
  }


    allowButtonPressed = async () => {
        console.log(">>>> allowButtonPressed  amount: ", this.state.amount)
        const amount = parseInt(this.state.amount)
        await approve(amount)

        this.checkAllowance(amount).then(allowanceOk => {
            this.setState({sufficientAllowance: allowanceOk})
        })

        this.props.allowanceUpdated()
    }

    checkAllowance = (amount) => {
        return new Promise((resolve, reject) => {
          getAllowance().then((allowance, error) => {
            const allowanceOk = parseInt(amount) <= allowance
            console.log(">> checkAllowance: ", parseInt(amount) ,  allowance, allowanceOk)
        
            resolve(allowanceOk);
          })
          .catch((error) => {
            console.error('Error checking allowance', error);
            reject(error)
          })
        })
    }


    submitForm = () => {

        console.log('>>> submitForm', this.state.amount);

        const { amount, sufficientAllowance, validAmount } = this.state

        if (!sufficientAllowance) {
            this.setState({error: "Insufficient token allowance"})
            return
        }
        if (!validAmount) {
            this.setState({error: "Invalid tolen amount"})
            return
        }
        const value = parseInt(amount)

        console.log(">>>>> submitForm: ", value)

        createStake(amount).then(result => {
            console.log(">>> onSubmit createStake success! result: ", result.tx)
            this.props.handleSuccess(`New stake created. Transaction id: ${result.tx}`)
        }).catch((error) => {
           console.log('>>> onSubmit createStake error:', error);
           const message = this.getStakeError(error)
           this.props.handleError(error, message)
        })

    }


    getStakeError = (error) => {
        switch(true) {
          case error.message.includes('No active reward phase found'): return "No active reward phase found"
          case error.message.includes('Invalid reward amount'): return "Invalid reward amount"
          case error.message.includes('Invalid reward interval'): return "Invalid reward interval"
          default: return error.message
        }
    }


  render() {
    
    console.log(">>>> render",  this.props)

    return (
        <div className="p-2">
        <h3>New Stake</h3>

        <Form>

        <Form.Group className="mb-3" controlId="stakeAmount">
          <Form.Label>Amount of LP tokens to stake</Form.Label>
          <InputGroup className="mb-3">
            <Form.Control style={{maxWidth: 200}}
                type="text" placeholder="0.0" autoComplete="off" 
                title="Amount" onChange={e => this.updateAmount(e)} 
            />
            <InputGroup.Text> Cake-LP </InputGroup.Text>
        </InputGroup>

        </Form.Group>

        <div style={{textAlign:"center"}} className="pt-2">
            { this.state.validAmount && !this.state.sufficientAllowance &&
                <Button name="allow" type="button" variant="outline-primary"
                    onClick={e => this.allowButtonPressed()}  className="pl-2">
                        Allow LP token transfer
                </Button>
            }
            &nbsp;&nbsp;&nbsp;
            { <Button variant="outline-primary" onClick={this.submitForm}
                disabled={!(this.state.validAmount && this.state.sufficientAllowance)}>
                    Submit
              </Button>
            }
        </div>
      </Form>
      </div>
    )
  }
}