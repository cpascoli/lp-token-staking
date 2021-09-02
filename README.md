# lp-token-staking

A NextJS app to stake LP tokens into a contract and earn reward tokens in return.

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


### To run the dapp locally

1. Start a local blockchain and deploy the contracts in truffle
```
truffle develop   // starts a local blockchain on port 7545
truffle migrate   // deploy the contracts
```

2. Start the nextjs server
`npm run dev`

3. Connect Metamask to the local netwotk on http://127.0.0.1:7545/

4. Access the dapp
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

