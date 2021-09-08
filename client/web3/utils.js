import { myWeb3, eth } from './provider'

// from int to string
export const toTokenDecimals = async (token, amount) => {
    
    const decimals = await token.decimals.call()
    const digits =  myWeb3.utils.toBN('10').pow(decimals); 
    const factor = myWeb3.utils.toBN(10000)
    const tokenDecimals = myWeb3.utils.toBN( Math.floor(amount * 10000) ).mul(digits).div(factor).toString()

    console.log(">>>> toTokenDecimals", amount, tokenDecimals)
    return tokenDecimals
}

// from string to int 
export const toTokenUnits = async (token, amount) => {
    const decimals = await token.decimals.call()
    const digits =  myWeb3.utils.toBN('10').pow(decimals); 
    const unitsString = myWeb3.utils.toBN(amount).div(digits).toString()
    const units = parseInt(unitsString)
    
    return units
}

// from string to number with 'precision' decimals
export const toNumber = async (token, amount, precision) => {
    const decimals = await token.decimals.call()
    const digits =  myWeb3.utils.toBN('10').pow(decimals); 
    const extra =  myWeb3.utils.toBN('10').pow(myWeb3.utils.toBN(precision)); 
    const number = myWeb3.utils.toBN(amount).mul(extra).div(digits).toNumber()
    const decimal = number / extra.toNumber()
    
    return decimal
}

export const shortenAccount = (account) => {
    return account.substring(0, 6) + "..." + account.substring(38)
}

export const getAccount = async () => {
    const accounts = await eth.getAccounts()
    if (accounts.length == 0) {
        console.error("No account found", accounts)
        //throw Error("No Ethereum account connected. Please connect a wallet and try again!")
        return
    }
    return accounts[0]
}


export const getBlock = () => {
    return Promise.resolve(myWeb3.eth.getBlock('latest'));
}


export const convertHMS = (value) => {
    const sec = parseInt(value, 10);
    let hours   = Math.floor(sec / 3600); 
    let minutes = Math.floor((sec - (hours * 3600)) / 60);
    let seconds = sec - (hours * 3600) - (minutes * 60);
   
    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}

    return hours+'h '+minutes+'m '+seconds+'s';
}

