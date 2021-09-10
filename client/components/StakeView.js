import React from 'react'
import { Form, Button, InputGroup, Container, Card, FormControl, Row, Col } from 'react-bootstrap'

import { Center, Wrapped} from "../components/Layout"

import TitleValueBox from './TitleValueBox'
import RewardsInfo from './RewardsInfo'

import UpdateStakeForm from './UpdateStakeForm'
import Modal from "./Modal"


import { claimReward } from "../web3/stakes"

export default class StakeView extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      ...props,
      showUpdateStakeModal: false,
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.lpUnstaked !== this.props.lpUnstaked ||
      prevProps.lpStaked !== this.props.lpStaked ||

      prevProps.claimableRewards !== this.props.claimableRewards ||
      prevProps.rewardsPaid  !== this.props.rewardsPaid ||
      prevProps.rewardRate  !== this.props.rewardRate ||
      prevProps.totalRewardsPaid  !== this.props.totalRewardsPaid ||

      prevProps.formType !== this.props.formType ||
      prevProps.rewardPerdiod.totalStaked  !== this.props.rewardPerdiod.totalStaked
      
    ) {
      this.setState({
        lpUnstaked: this.props.lpUnstaked,
        lpStaked: this.props.lpStaked,
        claimableRewards: this.props.claimableRewards,
        rewardsPaid: this.props.rewardsPaid,
        rewardRate: this.props.rewardRate,
        totalRewardsPaid: this.props.totalRewardsPaid,
        formType: this.props.formType,
        rewardPerdiod: this.props.rewardPerdiod
      })
    }
  }



  claimRewardPressed = () => {
    claimReward().then(result => {
      this.props.handleSuccess(`Reward claimed. Transaction id: ${result.tx}`)
    }).catch((error) => {
      this.props.handleError(error)
    })
  }


  showUpdateStakeModalPreseed = (buttonType) => {
    this.setState({
      showUpdateStakeModal: true,
      formType: buttonType
    })
  }

  hideUpdateStakeModalPreseed = () => {
    this.setState({
      showUpdateStakeModal: false,
      formType: undefined
    })
  }

  handleAllowanceUpdated = () => {
    this.props.allowanceUpdated()
  }

  handleSuccess = () => {
    this.hideUpdateStakeModalPreseed()
    this.props.handleSuccess()
  }

  handleError = () => {
    this.hideUpdateStakeModalPreseed()
    this.props.handleError()
  }


  render() {

    const { showUpdateStakeModal, formType, lpUnstaked, lpStaked, claimableRewards, rewardsPaid, rewardRate, totalRewardsPaid } = this.state

    const mySharePerc = (lpStaked && this.state.rewardPerdiod.totalStaked > 0) ?  
          Math.round(lpStaked  * 10000 / this.state.rewardPerdiod.totalStaked) / 100 : '0'
    
    return (
      <div>

        <Wrapped>
            <Card style={{flex: 1, minWidth:200, margin: 10 }}>
              <Card.Title className="p-2">Total LP Tokens Staked</Card.Title>
              <Card.Body> { this.state.rewardPerdiod.totalStaked } ETB </Card.Body>
            </Card>
            <Card style={{flex: 1, minWidth:200, margin: 10 }}>
              <Card.Title className="p-2">My LP Tokens Staked</Card.Title>
              <Card.Body> {lpStaked} </Card.Body>
            </Card>
            <Card style={{flex: 1, minWidth:200, margin: 10 }}>
              <Card.Title className="p-2">My pool share</Card.Title>
              <Card.Body> {mySharePerc}%</Card.Body>
            </Card>
            <Card style={{flex: 1, minWidth:200, margin: 10 }}>
              <Card.Title className="p-2">My Rewards Received</Card.Title>
              <Card.Body>{rewardsPaid} ETB</Card.Body>
            </Card>
        </Wrapped>

        <div className="mt-4"></div>
        
        
        <Center maxWidth="500">

          <TitleValueBox title="Balance not staked yet" value={lpUnstaked} symbol="Cake-LP" />

          <div className="mt-4"></div>

          <Container>
            <Row>
              <Col>
                <Button name="stake" className="w-100" variant="primary" onClick={(e) => this.showUpdateStakeModalPreseed("stake")}>Stake</Button>
              </Col>
              <Col>
                <Button name="unstake" className="w-100" variant="secondary" onClick={(e) => this.showUpdateStakeModalPreseed("unstake")}>Unstake</Button>
              </Col>
            </Row>
          </Container>

          <div className="mt-4"></div>

          <RewardsInfo rewardRate={rewardRate} totalRewardsPaid={totalRewardsPaid} />

          <div className="mt-4"></div>

          <TitleValueBox title="Claimable rewards" value={claimableRewards} symbol="ETB" />

          <div className="mt-2"></div>

          <div className="d-grid gap-2">
            <Button name="claim" style={{ minWidth: 200 }} variant="primary" onClick={(e) => this.claimRewardPressed()}>Claim rewards</Button>
          </div>


          {showUpdateStakeModal && (
            <Modal onClose={(e) => this.hideUpdateStakeModalPreseed()}>
              <UpdateStakeForm 
                formType={formType}
                handleSuccess={(result) => this.handleSuccess(result)}
                handleError={(error, message) => this.handleError(error, message)}
                allowanceUpdated={() => this.handleAllowanceUpdated()}
                balance={formType == "stake"? this.state.lpUnstaked : formType == "unstake"? this.state.lpStaked : 0}
              />
            </Modal>
          )}

        </Center>

      </div>
    )
  }
}