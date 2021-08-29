import React from 'react'
import { Table, Button, Alert } from 'react-bootstrap'

import { getStakes, getStakesCount } from "../web3/stakes"
import Header from "../components/Header" 
import StakeInfo from "../components/StakeInfo"
import { Page, Center } from "../components/Layout"
import { AlertDismissible } from "../components/AlertDismissible"
import CreateStakeForm from "../components/CreateStakeForm"
import Modal from "../components/Modal" 


export default class IndexPage extends React.Component {

  constructor(props) {
      super(props)
      this.state = {
        showCreateRewardPhaseModal: false,
        accountConnected: false,
      }
      this.headerRef= React.createRef();
  }

  componentDidMount() {
    this.loadStakes()
  } 


  reload() {
    console.log("reload IndexPage")
    this.loadStakes()
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
    
  toggleCreateRewardPhaseModal = async () => {
    const { showCreateRewardPhaseModal } = this.state
    this.setState({
        showCreateRewardPhaseModal: !showCreateRewardPhaseModal,
    })
  }

  async loadStakes() {
      console.log("loadStakes 1")

      getStakesCount().then(count => {
        console.log("loadStakes 2", count)
        if (count == 0) {
            console.log("No stake found!")
            return null
        }

        console.log("loadStakes 3")
        return getStakes()
        
      }).then( stakes => {
          console.log("loadStakes 4", stakes)
          this.setState({
            stakes: (stakes && stakes.reverse())
          })
      }).catch( error => {
          console.log(">>> error loading stake:", error)
          this.setState({error: error.message})
      })
  }



  async handleAllowanceUpdated() {
      // this.loadAllowance();
      console.log(">>> handleAllowanceUpdated() -- TODO")

  }


  handleSuccess = (result) => {
      console.log(">>> handleSuccess done! result: ", result)
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
      console.log(">>> handleError", error, message)
      if (message) {
          this.setState({error: message})
      } else if (error.message) {
          this.setState({error: error.message})
      } else {
          this.setState({error: `An error occurred (${error.toString()})`})
      }
  }

  render() {

    const  { accountConnected, stakes, showCreateRewardPhaseModal } =  this.state

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

    const stakesEndedRows = stakes && stakes.filter(item => {return item.to != undefined}).map(item => {
      return (
          <StakeInfo key={item.id} {...item} stakeUpdated={() => this.stakeUpdated()}/>
      )
    })

    const stakesActiveRows = stakes && stakes.filter(item => {return item.to == undefined}).map(item => {
      return (
          <StakeInfo key={item.id} {...item} stakeUpdated={() => this.stakeUpdated()}/>
      )
    })

    
    return (

        <Page>

           <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>

           {showCreateRewardPhaseModal && (
              <Modal onClose={this.toggleCreateRewardPhaseModal} >
                    <CreateStakeForm 
                      handleSuccess={(result) => this.handleSuccess(result)} 
                      handleError={(error, message) => this.handleError(error, message)}
                      allowanceUpdated={() => this.handleAllowanceUpdated()}
                    />
              </Modal>
            )}

             <Center> 
                { this.state.error && <AlertDismissible variant="danger" title="Error"> {this.state.error} </AlertDismissible> }
                { this.state.info && <AlertDismissible variant="info" title={this.state.info.title}>{this.state.info.detail}</AlertDismissible> }
              </Center>

            { ((stakesEndedRows && stakesEndedRows.length == 0) && (stakesActiveRows && stakesActiveRows.length == 0) ) && <Center> 
                <AlertDismissible variant="info" 
                    title="No stake found" 
                    buttonTitle="Reload" 
                    buttonAction={() => this.loadStakes()}> 
                    Check you are on the corrrect network and that a reward phase has been setup.
                </AlertDismissible>
              </Center> 
            }     

            { stakesActiveRows && stakesActiveRows.length > 0 && 
                 <Center> 
                    <h3>Stakes Active</h3>
                    <Table responsive bordered striped="on">
                          <thead>
                            <tr>
                                <th style={{textAlign:"center"}}>#</th>
                                <th style={{textAlign:"center"}}>Start Date</th>
                                <th style={{textAlign:"center"}}>End Date</th>
                                <th style={{textAlign:"center"}}>Amount Staked</th>
                                <th style={{textAlign:"center"}}>Accrued Reward</th>
                            </tr>
                        </thead>
                        <tbody>
                            { stakesActiveRows }
                        </tbody>
                    </Table>
                 </Center> 
              }

            { stakesEndedRows && stakesEndedRows.length > 0 && 
                 <Center> 
                    <h3>Stakes Ended</h3>
                    <Table responsive bordered striped="on">
                          <thead>
                            <tr>
                                <th style={{textAlign:"center"}}>#</th>
                                <th style={{textAlign:"center"}}>Start Date</th>
                                <th style={{textAlign:"center"}}>End Date</th>
                                <th style={{textAlign:"center"}}>Staked Period</th>
                                <th style={{textAlign:"center"}}>Amount Staked</th>
                                <th style={{textAlign:"center"}}>Reward Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            { stakesEndedRows }
                        </tbody>
                    </Table>
                 </Center> 
              }

            <div style={{textAlign:"center"}}>
                <Button onClick={this.toggleCreateRewardPhaseModal}>Stake LP Tokens</Button>
            </div>

        </Page>
     
    )
  }
}