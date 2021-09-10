import React from 'react'

import { Container, Row, Col, Button, Dropdown, DropdownButton, ButtonGroup } from 'react-bootstrap'
import { Flow } from "../components/Layout"

import { shortenAccount, getAccount } from "../web3/utils"

import { myWeb3 } from "../web3/provider"

import { getBalance as getBalanceCake, getAllowance as getAllowanceCake } from "../web3/cake_lp"
import { getBalance as getBalanceETB, getAllowance as getAllowanceETB } from "../web3/etb"


export default class Header extends React.Component {

    constructor(props) {
        super(props);
        this.state = {}
        this.handleAccount = this.handleAccount.bind(this);
    }

    componentDidMount() {
        this.reload()

        ethereum.on('chainChanged', (chainId) => {
            // Handle the new chain.
            // Correctly handling chain changes can be complicated.
            // We recommend reloading the page unless you have good reason not to.
            window.location.reload();
        });
    }

    reloadPressed = async () => {
        this.reload()
        this.props.reload()  // reaload parent page
    }

    reload = async () => {
        await this.loadBlockInfo()
        await this.loadAccount()
        await this.loadBalance()
    }


    connect = () => {
        ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => {
            let account = accounts.length > 0? accounts[0] : undefined
            this.reload()
            this.handleAccount(account)
        })
    }

    handleAccount = (account) => {
        if (account) {
            this.setState({
                account: shortenAccount(account),
            })
            this.props.setAccountConnected(true)
        } else {
            this.setState({
                account: undefined,
            })
            this.props.setAccountConnected(false)
        }
    }


    loadAccount = () => {
        getAccount().then((account) => {
            this.handleAccount(account)
        }).catch(error => {
            this.setState({ error: error.message })
            this.props.setAccountConnected(false)
        })
    }

    loadBalance = () => {
        getBalanceETB().then(data => {
            this.setState({
                balanceETB: data.units
            })
            return getBalanceCake()
        }).then(data => {
            this.setState({
                balanceCake: data.units
            })
        }).catch(error => {
            this.setState({ error: error.message })
        })
    }


    loadBlockInfo = () => {
        myWeb3.eth.getBlock().then((block) => {
            this.setState({
                blockNumber: block.number,
                blockTimestamp: block.timestamp
            })
        })
    }


    render() {

        const { balanceETB, balanceCake } = this.state

        const blockNumber = this.state && this.state.blockNumber
        const blockDate = this.state && this.state.blockTimestamp && new Date(this.state.blockTimestamp * 1000)
        const blockDateFormatted = (blockDate && `${blockDate.toLocaleDateString()} @ ${blockDate.toLocaleTimeString()}`) || "-"
        const account = this.state && this.state.account

        return (
            <div className="header">
                <Container fluid>
                    <Row>
                        <Col>
                            <Flow>
                                <div>
                                { (balanceETB !== undefined) && <h5 className="m-2"> {balanceETB} ETB</h5> }
                                </div>
                                <div>
                                { (balanceCake !== undefined) && <h5 className="m-2"> {balanceCake} Cake-LP </h5> }
                                </div>
                            </Flow>
                        </Col>

                        <Col xs className="text-end">
                            {(account &&
                                <DropdownButton
                                    id="menu"
                                    variant="outline-primary"
                                    title={account}
                                >
                                    <Dropdown.Item eventKey="1" disabled >Block Info</Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item eventKey="2" disabled >number: {blockNumber} </Dropdown.Item>
                                    <Dropdown.Item eventKey="3" disabled >date: {blockDateFormatted}</Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item eventKey="4" onClick={() => this.reloadPressed()}>Reload</Dropdown.Item>
                                </DropdownButton>
                            ) || <Button name="connect" variant="primary" onClick={() => this.connect()} >Connect Wallet</Button>}
                        </Col>
                    </Row>
                </Container>

            </div>
        )
    }
}