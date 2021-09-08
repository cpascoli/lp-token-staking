import React from 'react'
import { Alert } from 'react-bootstrap'

import { getStakedBalance, getClaimableRewards } from "../web3/stakes"
import { getBalance as getBalanceLP } from "../web3/cake_lp"

import { getCurrentRewardPeriod } from "../web3/reward_phases"

import Header from "../components/Header" 
import { Page, Center } from "../components/Layout"
import { AlertDismissible } from "../components/AlertDismissible"
import StakeView from "../components/StakeView"


export default class IndexPage extends React.Component {

  constructor(props) {
      super(props)
      this.state = {
        accountConnected: false,
        currentRewardPerdiod: undefined,
      }
      this.headerRef= React.createRef();
  }

  componentDidMount() {
    this.reload()
  } 


  reload() {
    this.loadBalances()
  }


  stakeUpdated = async () => {
    await this.headerRef.current.reload()
    await this.reload()
  }

  setAccountConnected = (connected) => {
    this.setState({
      accountConnected: connected,
    })
  }
    

  async loadBalances() {

    getCurrentRewardPeriod().then( period => {
      this.setState({currentRewardPerdiod: period})
      if (period) {
        return getStakedBalance()
      }
    }).then(stakedBalance => {
        this.setState({lpStaked: stakedBalance})
        return getBalanceLP()
      }).then( balanceLP => {
        this.setState({lpUnstaked: balanceLP.units})
        return getClaimableRewards()
      }).then(claimable => {
        this.setState({claimableRewards: claimable})
      })
      .catch( error => {
          this.setState({error: error.message})
      })
  }


  async handleAllowanceUpdated() {
      console.log(">>> handleAllowanceUpdated() -- TODO")
  }


  handleSuccess = (result) => {
      this.headerRef.current.reload()
      this.reload()
      this.setState({
          info: { 
              title: "Success!", 
              detail: result //JSON.stringify(result, null, 2),
          }
      })
  }


  handleError = (error, message) => {
      if (message) {
          this.setState({error: message})
      } else if (error && error.message) {
          this.setState({error: error.message})
      } else {
          this.setState({error: `An error occurred (${error})`})
      }
  }

  render() {

    const  { accountConnected, lpUnstaked, lpStaked, claimableRewards } =  this.state

    if (!accountConnected) return (
      <Page>
          <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>
          <Center> 
              <Alert variant="info" title="No Ethereum account connected" style={{textAlign: "center"}}> 
                Please connect an Ethereum account to use the dapp!
              </Alert>
          </Center>
      </Page>
    )


    
    return (

        <Page>

             <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>

             <Center > 
                { this.state.error && <AlertDismissible variant="danger" title="Error"> {this.state.error} </AlertDismissible> }
                { this.state.info && <AlertDismissible variant="info" title={this.state.info.title}>{this.state.info.detail}</AlertDismissible> }

                {!this.state.currentRewardPerdiod && 
                  <Alert variant="info"> No Active Reward Period. </Alert> 
                }

                {this.state.currentRewardPerdiod && 
                <StakeView 
                  lpUnstaked={lpUnstaked}
                  lpStaked={lpStaked}
                  claimableRewards={claimableRewards}
                  handleSuccess={(result) => this.handleSuccess(result)} 
                  handleError={(error, message) => this.handleError(error, message)}
                  allowanceUpdated={() => this.handleAllowanceUpdated()}
                  rewardPerdiod={this.state.currentRewardPerdiod}
                />
                }

            </Center>

        </Page>
     
    )
  }
}