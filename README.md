# Staking Dapp for the ETB token

A Dapp to stake LP tokens into a pool contract and earn rewards tokens in return.

This project was developed for the ["ETB Project #2"](https://github.com/jklepatch/eattheblocks/tree/master/etb-projects/project2-staking) Hackathon organised by [EatTheBlocks](https://www.youtube.com/c/EatTheBlocks/about)


The pool implements an efficient O(1) algo to distribute the rewards based on the paper [calable-reward-distribution-paper](https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf
)


Features included:

- The staking contract allows an admin to define multiple rewards periods. These are time intervals when a certain amount of reward tokens will be distributed to stakers.
- Users staking their LP tokens into the pool during a reward period, will earn part of the allocated reward tokens.
- The amount of reward tokens earned is proportional to the amount of tokens staked and the length of the staking period.
- The pool contract will distribute reward tokens at a constant rate (e.g x reward tokens per second)  amoung all active stakers.
- Users can add and remove tokens from their staked amount at any time during a reward period.
_ Users can claim their accrued reward tokens.
- When users end their stake, they get back their LP tokens and all the reward tokens accrued so far.

### To run the tests 

```
truffle develop   // starts a local blockchain on port 7545
truffle test      // runs the test

```

### Setup environment

Install node
`brew install node`  (on Mac)

Install truffle
`npm install -g truffle`


### To run the dapp locally

1. Install dependencies
`npm install`   

2. Start a local blockchain and deploy the contracts in truffle
```
truffle develop   // starts a local blockchain on port 7545
truffle migrate   // deploy the contracts
```

3. Start the nextjs server
`npm run dev`

4. Connect Metamask to the local netwotk on http://127.0.0.1:7545/

5. Access the dapp
`http://localhost:3000/`


Note: 
Metamask has to be connected to the local truffle netowork on port 7545 : 
```
 New RPC URL:  http://127.0.0.1:7545/
 Chain ID: 1337
```


### User Page

- The user page allows to stake, unstake LP tokens and claim a reward:

![User Page](./doc/images/user-page.png?raw=true)

![Stake Modal](./doc/images/stake-modal.png?raw=true)


### Admin Page

- The admin page allows to create a reward phase to distribute an allocated amount of reward tokens among stakers.
![Admin Page](./doc/images/admin-page.png?raw=true)

