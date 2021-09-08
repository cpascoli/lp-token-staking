import React from 'react'
import { Table, Alert, Button } from 'react-bootstrap'

import Header from "../components/Header" 
import RewardPhaseInfo from "../components/RewardPhaseInfo"
import { Page, Center } from "../components/Layout"
import { getRewardPeriods } from "../web3/reward_phases"
import { AlertDismissible } from "../components/AlertDismissible"
import  CreateRewardPhaseForm from "../components/CreateRewardPhaseForm"

import Modal from "../components/Modal" 



export default class AdminPage extends React.Component {

    headerRef = React.createRef();

    constructor(props) {
        super(props)
        this.state = {
            showCreateRewardPhaseModal: false,
            accountConnected: false,
        }
        this.headerRef = React.createRef();
    }
    
    componentDidMount() {
       this.reload()
    } 

    reload() {
        console.log("reload AdminPage")
        this.loadRewardPeriods()
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


    async loadRewardPeriods() {
        getRewardPeriods().then((periods) => {
            this.setState({
                rewardPeriods: periods.reverse(),
            })
        }).catch( error => {
            console.log(">>> error loading reward phases:", error)
            this.setState({error: error.message})
        })
    }


    async handleAllowanceUpdated() {
        console.log(">>> handleAllowanceUpdated")
        // this.loadAllowance();
        this.headerRef.current.reload()
    }


    handleSuccess = (result) => {
        console.log(">>> handleSubmit done! values: ", result, "this.headerRef.", this.headerRef.current.reload)

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

        const { accountConnected, showCreateRewardPhaseModal, rewardPeriods } = this.state // Get the state


        if (!accountConnected) return (
            <Page>
                <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>
                <Center> 
                    <Alert variant="info" title="No Ethereum account connected" style={{textAlign: "center"}}> 
                    Please connect an Ethereum account to access this dapp!
                    </Alert>
                </Center>
            </Page>
        )

        const rewardPeriodsRows = rewardPeriods && rewardPeriods.map((item, idx) => {
            return (
                <RewardPhaseInfo key={item.id} {...item}/>
            )
        })

        let lastRewardPeriod = this.state.rewardPeriods && this.state.rewardPeriods.length > 0 && this.state.rewardPeriods[0]

        return (

            <Page>

                <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>

                {showCreateRewardPhaseModal && (
                    <Modal onClose={this.toggleCreateRewardPhaseModal} >
                         <CreateRewardPhaseForm 
                            handleSuccess={(result) => this.handleSuccess(result)} 
                            handleError={(error, message) => this.handleError(error, message)}
                            allowanceUpdated={() => this.handleAllowanceUpdated()}
                            startDate={lastRewardPeriod && lastRewardPeriod.to}
                         />
                    </Modal>
                )}

                <Center> 
                { this.state.error && <AlertDismissible variant="danger" title="Error"> {this.state.error} </AlertDismissible> }
                { this.state.info && <AlertDismissible variant="info" title={this.state.info.title}>{this.state.info.detail}</AlertDismissible> }
                </Center>


                { (rewardPeriodsRows && rewardPeriodsRows.length == 0) &&
                    <Center className="mt-2">
                        <Alert variant="info"> No reward phase configured</Alert> 
                    </Center>
                }
                { rewardPeriodsRows && rewardPeriodsRows.length > 0 && 
                 <Center> 
                    <Table responsive bordered striped="on">
                          <thead>
                            <tr>
                                <th>#</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Total Reward</th>
                                <th>Reward / sec</th>
                                <th>Currently Staked</th>
                            </tr>
                        </thead>
                        <tbody>
                            { rewardPeriodsRows }
                        </tbody>
                    </Table>
                 </Center> 
                }
              
                <div style={{textAlign:"center"}}>
                    <Button onClick={this.toggleCreateRewardPhaseModal}>Create New Reward Phase</Button>
                </div>

            </Page>
        
        )
  }
}