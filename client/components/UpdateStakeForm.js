import React from 'react'
import { Container, Row, Col, Form, Button, InputGroup, ButtonToolbar, ButtonGroup } from 'react-bootstrap'
import { getAllowance, approve } from "../web3/cake_lp"
import { startStake, endStake } from "../web3/stakes"
import { Center } from "../components/Layout"

export default class UpdateStakeForm extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            ...props,
            amount: '',
        }
    }

    setAmount = (perc) => {
        const amount = Math.floor(Number(this.state.balance) * perc) / 100
        let isValid = !isNaN(amount) && amount > 0
        this.setState({
            validAmount: isValid,
            amount: isNaN(amount)? '' : amount.toString(),
        })
    }

    updateAmount = (e) => {
        let value = this.parseAmount(e.target.value)
        let isValid = !isNaN(value) && value >= 0

        this.setState({
            validAmount: isValid,
            amount: e.target.value
        })

        if (isValid) {
            this.checkAllowance(value).then(allowanceOk => {
                this.setState({ sufficientAllowance: allowanceOk })
            })
        }
    }

    allowButtonPressed = async () => {
        const amount = Number(this.state.amount)
        await approve(amount).then(result => {
            this.checkAllowance(amount).then(allowanceOk => {
                this.setState({ sufficientAllowance: allowanceOk })
            })
        })
    }

    checkAllowance = (amount) => {
        return new Promise((resolve, reject) => {
            getAllowance().then((allowance) => {
                const allowanceOk = amount <= allowance
                resolve(allowanceOk);
            })
            .catch((error) => {
                console.error('Error checking allowance', error);
                reject(error)
            })
        })
    }

    submitForm = () => {
        if (this.state.formType === 'stake') {
            this.submitStake()
        } else if (this.state.formType === 'unstake') {
            this.submitUnstake()
        }
    }

    submitStake = () => {
        const { amount, sufficientAllowance, validAmount } = this.state

        if (!sufficientAllowance) {
            this.setState({ error: "Insufficient token allowance" })
            return
        }
        if (!validAmount) {
            this.setState({ error: "Invalid tolen amount" })
            return
        }
        const value = Number(amount)
        
        startStake(value).then(result => {
            this.props.handleSuccess(`Stake increased. Transaction id: ${result.tx}`)
        }).catch((error) => {
            console.log('>>> onSubmit startStake error:', error);
            const message = this.getStakeError(error)
            this.props.handleError(error, message)
        })
    }

    submitUnstake = () => {
        const { amount, validAmount } = this.state
        if (!validAmount) {
            this.setState({ error: "Invalid tolen amount" })
            return
        }
        const value = Number(amount)
        
        endStake(value).then(result => {
            this.props.handleSuccess(`Stake decreased. Transaction id: ${result.tx}`)
        }).catch((error) => {
            console.log('>>> submitUnstake endStake error:', error);
            const message = this.getStakeError(error)
            this.props.handleError(error, message)
        })
    }

    getStakeError = (error) => {
        switch (true) {
            case error.message.includes('No active reward phase found'): return "No active reward phase found"
            case error.message.includes('Invalid reward amount'): return "Invalid reward amount"
            case error.message.includes('Invalid reward interval'): return "Invalid reward interval"
            default: return error.message
        }
    }

    parseAmount = (amount) => {
        return Math.floor(Number(amount) * 100) / 100
    }

    render() {
        const { formType, balance } = this.state

        const title = (formType === 'stake') ? "Stake" : (formType === 'unstake') ? "Unstake" : undefined
        if (!title) return (<div>Error</div>)

        return (
            <div>
                <h3 className="text-center">{title}</h3>

                <Form className="p-4">
                    <Form.Group row controlId="stakeAmount">
                       
                        <Form.Label variant="secondary" className="w-100 text-end text-muted" >Balance: {balance}</Form.Label>
                        <InputGroup className="mb-3">
                            <Form.Control
                                type="text" placeholder="0.0" autoComplete="off" value={this.state.amount}
                                title="balance not staked" onChange={e => this.updateAmount(e)}
                            />
                            <InputGroup.Text> Cake-LP </InputGroup.Text>
                        </InputGroup>

                    </Form.Group>
            
                    <Container>
                        <Row >
                           <Col className="m-0 p-2"> <Button onClick={() => this.setAmount(25)} className="w-100" variant="outline-secondary">25%</Button> </Col>
                           <Col className="m-0 p-2"> <Button onClick={() => this.setAmount(50)} className="w-100" variant="outline-secondary">50%</Button> </Col>     
                           <Col className="m-0 p-2"> <Button onClick={() => this.setAmount(75)} className="w-100" variant="outline-secondary">75%</Button> </Col>
                           <Col className="m-0 p-2"> <Button onClick={() => this.setAmount(100)} className="w-100" variant="outline-secondary">Max</Button> </Col>
                        </Row>
                    </Container>

                    <div style={{ textAlign: "center" }} className="mt-4">
                        {this.state.validAmount && !this.state.sufficientAllowance && this.state.formType === 'stake' &&
                            <Button name="allow" type="button" variant="primary w-50"
                                onClick={e => this.allowButtonPressed()} className="pl-2">
                                Allow LP token transfer
                            </Button>
                        }
                        &nbsp;&nbsp;&nbsp;
                        {<Button variant="primary w-25" onClick={this.submitForm}
                            disabled={!(this.state.validAmount && (this.state.formType === 'unstake' || this.state.sufficientAllowance))}>
                            {title}
                        </Button>
                        }
                    </div>
                </Form>
            </div>
        )

    }
}
