import React from 'react'
import { Form, Button, InputGroup } from 'react-bootstrap'
import DatePicker from "react-datepicker";
import { getAllowance, approve } from "../web3/etb"
import { createRewardPeriod } from '../web3/reward_phases' 

import "react-datepicker/dist/react-datepicker.css";

export default class CreateRewardPhaseForm extends React.Component {


  constructor(props) {
      super(props)

      let day = 24 * 60 * 60
      let start = (props.startDate &&  new Date((props.startDate + 1) * 1000)) || new Date()
      let end =  new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

      this.state = {
        sufficientAllowance: false,
        validAmount: false,
        startDate: start,
        endDate: end,
        amount: "",
      }
  }


  updateAmount = (e) => {
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

  updateDate = (fieldName, date) => {
    const newState = {}
    newState[fieldName] = date
    this.setState(newState)
  }


   allowButtonPressed = async () => {
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
            resolve(allowanceOk);
          })
          .catch((error) => {
            console.error('Error checking allowance', error);
            reject(error)
          })
        })
    }


    submitForm = () => {
        const { amount, startDate, endDate, sufficientAllowance, validAmount } = this.state

        if (!sufficientAllowance) {
            this.setState({error: "Insufficient token allowance"})
            return
        }
        if (!validAmount) {
            this.setState({error: "Invalid tolen amount"})
            return
        }
        const value = parseInt(amount)

        createRewardPeriod(value, startDate, endDate).then(result => {
            this.props.handleSuccess(`New reward phase created. Transaction id: ${result.tx}`)
        }).catch((error) => {
            console.log('Error 2 createRewardPhase:', error);
            const message = this.getRewardPeriodError(error)
            this.props.handleError(error, message)
        })
    }

    getRewardPeriodError = (error) => {
        switch(true) {
          case error.message.includes('Invalid period start time'): return "Invalid period start time"
          case error.message.includes('Invalid reward amount'): return "Invalid reward amount"
          case error.message.includes('Invalid reward interval'): return "Invalid reward interval"
          default: return error.message
        }
    }

  render() {
    return (
        <div className="p-2">
        <h3>New Reward Phase</h3>

        <Form>

        <Form.Group className="mb-3" controlId="startDate">
          <Form.Label>Start Date</Form.Label>
          {/* <Form.Control type="email" placeholder="Enter email" /> */}

          <DatePicker name="startDate" 
                className="form-control datepicker" 
                autoComplete="off"
                onChange={e => this.updateDate("startDate", e)}
                dateFormat="yyyy-MM-dd"
                // value={this.state.startDate}
                // dateFormat="dd-MM-yyyy"
                // selected={this.state.startDate ? moment(this.state.startDate, 'DD-MM-YYYY') : moment()}
                selected={(this.state.startDate && new Date(this.state.startDate)) || null}

            />


          <Form.Text className="text-muted">
            The date the reward phase start
          </Form.Text>
        </Form.Group>
                    

        <Form.Group className="mb-3" controlId="endDate">
          <Form.Label>End Date</Form.Label>
          {/* <Form.Control type="email" placeholder="Enter email" /> */}
            <DatePicker name="endDate" 
                className="form-control datepicker" 
                autoComplete="off"
                onChange={e => this.updateDate("endDate", e)}
                dateFormat="yyyy-MM-dd"
                // value={this.state.endDate}
                // dateFormat="dd-MM-yyyy"
                selected={(this.state.endDate && new Date(this.state.endDate)) || null}
               
            />

          <Form.Text className="text-muted">
            The date the reward phase end
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3" controlId="rewardAmountt">
          <Form.Label>Amount</Form.Label>
          <InputGroup className="mb-3">
            <Form.Control style={{maxWidth: 200}}
                type="text" placeholder="0.0" autoComplete="off" 
                title="Amount" onChange={e => this.updateAmount(e)} 
            />
            <InputGroup.Text> ETB </InputGroup.Text>


        </InputGroup>


        </Form.Group>

        <div style={{textAlign:"center"}} className="pt-2">
            { this.state.validAmount && !this.state.sufficientAllowance &&
                <Button name="allow" type="button" variant="outline-primary"
                    onClick={e => this.allowButtonPressed()}  className="pl-2">
                        Allow ETB token transfer
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