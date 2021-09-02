import React from 'react'
import { Table, Alert, Button } from 'react-bootstrap'

import Header from "../components/Header" 
import RewardPhase from "../components/RewardPhase"
import { Page, Center } from "../components/Layout"
import { getRewardPhases } from "../web3/reward_phases"
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
        this.loadRewardPhases()
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


    async loadRewardPhases() {
        getRewardPhases().then((phases) => {
            this.setState({
                rewardPhases: phases.reverse(),
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

        const { accountConnected, showCreateRewardPhaseModal, rewardPhases } = this.state // Get the state


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

        // const rewardPhases = this.state && this.state.rewardPhases
        const rewardPhasesRows = rewardPhases && rewardPhases.map((item, idx) => {
            return (
                <RewardPhase key={item.id} {...item}/>
            )
        })

        let lastRewardPhase = this.state.rewardPhases && this.state.rewardPhases.length > 0 && this.state.rewardPhases[0]

        return (

            <Page>

                <Header ref={this.headerRef} reload={() => this.reload()} setAccountConnected={connected => this.setAccountConnected(connected)}/>

                {showCreateRewardPhaseModal && (
                    <Modal onClose={this.toggleCreateRewardPhaseModal} >
                         <CreateRewardPhaseForm 
                            handleSuccess={(result) => this.handleSuccess(result)} 
                            handleError={(error, message) => this.handleError(error, message)}
                            allowanceUpdated={() => this.handleAllowanceUpdated()}
                            startDate={lastRewardPhase && lastRewardPhase.to}
                         />
                    </Modal>
                )}

                <Center> 
                { this.state.error && <AlertDismissible variant="danger" title="Error"> {this.state.error} </AlertDismissible> }
                { this.state.info && <AlertDismissible variant="info" title={this.state.info.title}>{this.state.info.detail}</AlertDismissible> }
                </Center>


                { (rewardPhasesRows && rewardPhasesRows.length == 0) &&
                    <Center className="mt-2">
                        <Alert variant="info"> No reward phase configured</Alert> 
                    </Center>
                }
                { rewardPhasesRows && rewardPhasesRows.length > 0 && 
                 <Center> 
                    <Table responsive bordered striped="on">
                          <thead>
                            <tr>
                                <th>#</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Total Reward</th>
                                <th>Reward / sec</th>
                                <th>Reward Paid</th>
                                <th>Currently Staked</th>
                            </tr>
                        </thead>
                        <tbody>
                            { rewardPhasesRows }
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