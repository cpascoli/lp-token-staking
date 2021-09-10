import React from "react";

const RewardPhaseInfo = ({ ...props }) => {

  const fromDate = new Date(props.from * 1000)
  const toDate = (props.to)? new Date(props.to * 1000) : undefined

  const from = fromDate.toLocaleDateString() + " "+ fromDate.toLocaleTimeString()
  const to = (toDate)? toDate.toLocaleDateString() + " "+toDate.toLocaleTimeString() : ''
  const reward = props.reward
  const staked = props.totalStaked

  const rewardPerSec = Math.round( reward * 100000 / (props.to - props.from)) / 100000
  return (
    <tr key={props.id}>
      <td style={{textAlign:"center"}}> {props.id}  </td>
      <td style={{textAlign:"center"}}> {from} </td>
      <td style={{textAlign:"center"}}> {to} </td>
      <td style={{textAlign:"right"}}> {reward} ETB</td>
      <td style={{textAlign:"right"}}> {rewardPerSec} ETB/s </td>
      <td style={{textAlign:"right"}}> {staked} ETB </td>
    </tr>
  );
};

export default RewardPhaseInfo;

