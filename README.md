# Staking Dapp for the ETB token

A Dapp to stake Cake-LP tokens into a pool contract and earn ETB tokens in return.

This project was developed for the ["ETB Project #2"](https://github.com/jklepatch/eattheblocks/tree/master/etb-projects/project2-staking) Hackathon organised by [EatTheBlocks](https://www.youtube.com/c/EatTheBlocks/about)


Features implemented:

- The staking contract allows an admin to allocate a certain amount of reward tokens to a period of time called "reward phase".
- Users staking their LP tokens into the pool during a reward phase, will earn a certain amount of reward tokens.
- The amount of reward tokens earned is proportional to the amount of tokens staked and the length of the staking period.
- The pool contract will distribute reward tokens at a constant rate (e.g reward tokens per second)  amoung all active stakes.
- Users can start and end multiple stakes at any time during a reward phase.
- When a user ends a stake, he will immediatleu receive the reward tokens earned by that stake.

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

- The user page allows to stake and unstake Cake-LP tokens and earn a reward

![Userr Page](./client/public/images/user-page.png?raw=true)

### Admin Page

- The admin page allows to create a reward phase to distribute an allocated amount of reward tokens among stakers.
![Admin Page](./client/public/images/admin-page.png?raw=true)

