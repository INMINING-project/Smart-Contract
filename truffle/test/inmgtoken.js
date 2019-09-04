const web3ToHex = web3.utils.toHex;
let Contract = artifacts.require("INMGToken");
let Token = Contract;

const TokenName = 'INMINING';
const TokenSymbol = 'INMG';
const TokenDecimals = 18;
const TokenSupply = 150000000 * 1000000000000000000;
const paused = false;
const mintingFinished = false;

const MONTH = 2592000;//seconds in month

const largeAmount= toHex(1000*10**TokenDecimals);
const mediumAmount = toHex(100*10**TokenDecimals);
const smallAmount = toHex(10*10**TokenDecimals);
function toString(number){
	return number.toString();
}
function toNumber(string){
	return parseInt(string,16);
}
function toHex(string){
	function toFixedBigValue(x,toString=true) {
        if (Math.abs(x) < 1.0) {
            let e = parseInt(x.toString().split('e-')[1]);
            if (e) {
                x *= Math.pow(10,e-1);
                x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
            }
        } else {
            let e = parseInt(x.toString().split('+')[1]);
            if (e > 20) {
                e -= 20;
                x /= Math.pow(10,e);
                x += (new Array(e+1)).join('0');
            }
        }
        if(toString){
            x=x.toString()
        }
        return x;
    }
	let bn = toFixedBigValue(string);
	return web3ToHex(bn)
}

function add(a,b){
	return toHex(toNumber(a)+toNumber(b))
}
function sub(a,b){
	return toHex(toNumber(a)-toNumber(b))
}
function mul(a,b){
	return toHex(toNumber(a)*toNumber(b))
}

contract("INMGToken Erc20 Tests", async(accounts)=>{
const founder = accounts[0];
it("Contract Name is "+TokenName, async()=>{
    let token = await Token.deployed();
	let result = await token.name.call();    
    assert.equal(result, TokenName, 'Token name is not '+TokenName);
});

it("Contract Symbol is "+TokenSymbol, async()=>{
    let token = await Token.deployed();
	let result = await token.symbol.call();    
    assert.equal(result, TokenSymbol, 'Token Symbol is not '+TokenSymbol);
});

it("Token Decimals are "+TokenDecimals, async()=>{
    let token = await Token.deployed();
	let result = await token.decimals.call();    
    assert.equal(result.toNumber(), TokenDecimals, 'Token Decimals is not '+TokenDecimals);
});

it("Token Total Supply is "+TokenSupply, async()=>{
    let token = await Token.deployed();
	let result = await token.totalSupply.call();    
    assert.equal(result, TokenSupply, 'Token Supply is not '+TokenSupply);
});

it("Token is not paused after deploy", async()=>{
    let token = await Token.deployed();
	let result = await token.paused.call();    
    assert.equal(result, false, 'Token is paused after deploy');
});

it("Minting is not finished after deploy", async()=>{
    let token = await Token.deployed();
	let result = await token.mintingFinished.call();    
    assert.equal(result, false, 'Minting is finished after deploy');
});

it("Token Founder is "+founder, async()=>{
    let token = await Token.deployed();
	let result = await token.owner.call();    
    assert.equal(result, founder, 'Token Founder is not '+founder);
});

it("Founder owns all tokens", async()=>{
	let token = await Token.deployed();
	let result = await token.balanceOf.call(founder);
	let balance = result;    
    assert.equal(balance, TokenSupply, 'Token Founder does not own all tokens');
});

it("Users can transfer tokens to other addresses", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let amount = mediumAmount;
	assert.isTrue(await TestSuite.testTransfer(sender,receiver,amount));
});

it("Users can allow other addresses to spend tokens", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let amount = largeAmount;
	assert.isTrue(await TestSuite.testApproval(sender,receiver,amount));
	amount = smallAmount;
	assert.isTrue(await TestSuite.testIncreaseApproval(sender,receiver,amount));
	amount = mul(2,smallAmount);
	assert.isTrue(await TestSuite.testDecreaseApproval(sender,receiver,amount));
});

it("Receiver can transfer tokens from Sender to Benefitiary if Sender approved to Receiver approved", async()=>{
	let owner = accounts[0];
	let sender = accounts[1];
	let receiver = accounts[2];
	let amount = smallAmount;
	assert.isTrue(await TestSuite.testTransferFrom(owner,sender,receiver,amount));
});

it("Noone except receiver can transferFrom tokens", async()=>{
	let owner = accounts[0];
	let sender = accounts[1];
	let receiver = accounts[2];
	let amount = smallAmount;

	assert.isFalse(await TestSuite.testTransferFrom(owner,sender,receiver,amount,true,owner));		
	assert.isFalse(await TestSuite.testTransferFrom(owner,sender,receiver,amount,true,receiver));		
	assert.isTrue(await TestSuite.testTransferFrom(owner,sender,receiver,amount,false,sender));		
});

it("Users cannot approve again if allowance is not 0", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let amount = largeAmount;	
	let token = await Token.deployed();
	let startAllowance = toNumber(await token.allowance.call(sender,receiver));
	if(startAllowance>0){
		assert.isFalse(await TestSuite.testApproval(sender,receiver,amount,true,sender));
	}else{
		throw new Error('Allowance was 0 on start')
	}
});

it("Users can nullify allowance to other addresses", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	assert.isTrue(await TestSuite.testApproval(sender,receiver,0));
});

it("Users cannot transfer more tokens than they have", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let token = await Token.deployed();
	let amount = add(await token.balanceOf.call(sender),smallAmount);
	assert.isFalse(await TestSuite.testTransfer(sender,receiver,amount,true));
});

it("Users cannot transferFrom more tokens than they are allowed", async()=>{
	let owner = accounts[0];
	let sender = accounts[1];
	let receiver = accounts[2];

	let token = await Token.deployed();
	let amount = add(await token.allowance(owner,sender),smallAmount);
	assert.isFalse(await TestSuite.testTransferFrom(owner,sender,receiver,amount,true,sender));
});

it("Users can allow other addresses to spend tokens more tokens than they have", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let token = await Token.deployed();
	let amount = add(await token.allowance.call(sender,receiver),smallAmount);
	assert.isTrue(await TestSuite.testApproval(sender,receiver,amount));

	amount = smallAmount;
	assert.isTrue(await TestSuite.testIncreaseApproval(sender,receiver,amount));
});

it("Allowance cannot go lower than 0", async()=>{
	let sender = accounts[0];
	let receiver = accounts[1];
	let token = await Token.deployed();
	let senderStartBalance = toHex(await token.balanceOf.call(sender));
	let receiverStartBalance = toHex(await token.balanceOf.call(receiver));
	let startAllowance = toHex(await token.allowance.call(sender,receiver));
	let approve = await token.decreaseApproval(receiver, add(startAllowance,smallAmount));		
	let newAllowance = toHex(await token.allowance.call(sender,receiver));
    assert.equal(newAllowance,0, 'Allowance after decrease is wrong');
});

it("Only owner can pause token", async()=>{
	let sender = founder;
	let receiver = accounts[1];
	let thirdParty = accounts[2];
	let array = [receiver,thirdParty];
	let token = await Token.deployed();
	let isPaused = await token.paused.call();
	if(!isPaused){
		for(let i=0;i<array.length;i++){
			let _from = array[i];
			try{
				await token.pause.sendTransaction({from:_from});
			}catch(e){
				TestSuite.handleTxRevert(e)
			}
			isPausedByUser = await token.paused.call();
		    assert.equal(isPausedByUser, false, 'Minting is paused by not founder');
		}
		await token.pause.sendTransaction({from:founder});
		isPaused = await token.paused.call();
	    assert.equal(isPaused, true, 'Minting is not paused by founder');
	}else{
		throw new Error('Minting is already paused');
	}
});

it("Noone can transfer,transferFrom or approve after token was paused", async()=>{
	let receiver = accounts[4]
	let token = await Token.deployed();
	let receiverStartBalance = toNumber(await token.balanceOf.call(receiver));
	async function addAccount(account){
		return {
			address:account,
			balance: toNumber(await token.balanceOf.call(account)),
			allowance:toNumber(await token.allowance.call(account,receiver))
		}
	}
	let array = [
		addAccount(accounts[0]),
		addAccount(accounts[1]),
		addAccount(accounts[2])
		];
	let isPaused = await token.paused.call();
	if(isPaused){
		for(let i=0;i<array.length;i++){
			let account = array[i];
			try{
				if(account.balance>0){
					let amount = account.balance/2;
					assert.isFalse(await TestSuite.testTransfer(account.address,receiver, amount,true));					
				}
				if(account.allowance==0){
					let amount = smallAmount;
					assert.isFalse(await TestSuite.testApproval(account.address,receiver, amount,true));					
					assert.isFalse(await TestSuite.testIncreaseApproval(account.address,receiver, amount,true));					
				}
				if(account.allowance>0){
					let amount = account.allowance/2;
					assert.isFalse(await TestSuite.testDecreaseApproval(account.address,receiver, amount,true));					
				}
			}catch(e){
				TestSuite.handleTxRevert(e)
			}
		}				
	}else{
		throw new Error('Token is paused');
	}
});

it("Only owner can mint tokens", async()=>{
	let sender = founder;
	let receiver = accounts[1];
	let thirdParty = accounts[2];
	let array = [receiver,thirdParty];
	let token = await Token.deployed();
	let senderStartBalance = toHex(await token.balanceOf.call(sender));
	let receiverStartBalance = toHex(await token.balanceOf.call(receiver));
	let thirdPartyStartBalance = toHex(await token.balanceOf.call(thirdParty));
	let isMintingFinished = await token.mintingFinished.call();
	if(!isMintingFinished){
		for(let i=0;i<array.length;i++){
			let _from = array[i];
			try{
				await token.mint.sendTransaction(receiver, toHex(smallAmount),{from:_from});
			}catch(e){
				TestSuite.handleTxRevert(e);
			}
			let newSenderBalance = toHex(await token.balanceOf.call(sender));
			let newReceiverBalance = toHex(await token.balanceOf.call(receiver));
			let newThirdPartyBalance = toHex(await token.balanceOf.call(thirdParty));
		    assert.equal(newSenderBalance, senderStartBalance, 'sender balance is wrong');
		    assert.equal(newReceiverBalance, receiverStartBalance, 'receiver balance is wrong');
	   	    assert.equal(newThirdPartyBalance, thirdPartyStartBalance, 'third party balance is wrong');
		}	
		let mint = await token.mint.sendTransaction(receiver, toHex(smallAmount),{from:founder});
		let newSenderBalance = toHex(await token.balanceOf.call(sender));
		let newReceiverBalance = toHex(await token.balanceOf.call(receiver));
	    assert.equal(newSenderBalance, senderStartBalance, 'founder balance is wrong');
	    assert.equal(newReceiverBalance, add(receiverStartBalance,smallAmount), 'receiver balance is wrong');			
	}else{
		throw new Error('Token minting is finished');
	}
});

it("Only owner can finish minting", async()=>{
	let sender = founder;
	let receiver = accounts[1];
	let thirdParty = accounts[2];
	let array = [receiver,thirdParty];
	let token = await Token.deployed();
	let mintingFinished = await token.mintingFinished.call();
	if(!mintingFinished){
		for(let i=0;i<array.length;i++){
			let _from = array[i];
			try{
				await token.finishMinting.sendTransaction({from:_from});
			}catch(e){
				TestSuite.handleTxRevert(e)
			}
			mintingFinishedByUser = await token.mintingFinished.call();
		    assert.equal(mintingFinishedByUser, false, 'Minting is paused by not founder');
		}
		await token.finishMinting.sendTransaction({from:founder});
		mintingFinished = await token.mintingFinished.call();
	    assert.equal(mintingFinished, true, 'Minting is not paused by founder');
	}else{
		throw new Error('Minting is already paused');
	}
});

it("Noone can mint after minting was finished", async()=>{
	let sender = founder;
	let receiver = accounts[1];
	let thirdParty = accounts[2];
	let array = [founder,receiver,thirdParty];
	let token = await Token.deployed();
	let senderStartBalance = toNumber(await token.balanceOf.call(sender));
	let receiverStartBalance = toNumber(await token.balanceOf.call(receiver));
	let thirdPartyStartBalance = toNumber(await token.balanceOf.call(thirdParty));
	let isPaused = await token.paused.call();
	if(isPaused){
		for(let i=0;i<array.length;i++){
			let _from = array[i];
			try{
				let mint = await token.mint.sendTransaction(receiver, toHex(smallAmount),{from:_from});
			}catch(e){
				TestSuite.handleTxRevert(e)
			}
			let newSenderBalance = toNumber(await token.balanceOf.call(sender));
			let newReceiverBalance = toNumber(await token.balanceOf.call(receiver));
			let newThirdPartyBalance = toNumber(await token.balanceOf.call(thirdParty));
		    assert.equal(newSenderBalance, senderStartBalance, 'sender balance is wrong');
		    assert.equal(newReceiverBalance, receiverStartBalance, 'receiver balance is wrong');
	   	    assert.equal(newThirdPartyBalance, thirdPartyStartBalance, 'third party balance is wrong');
		}				
	}else{
		throw new Error('Token minting is paused');
	}
});

it("Only owner can unpause token", async()=>{
	let sender = founder;
	let receiver = accounts[1];
	let thirdParty = accounts[2];
	let array = [receiver,thirdParty];
	let token = await Token.deployed();
	let isPaused = await token.paused.call();
	if(isPaused){
		for(let i=0;i<array.length;i++){
			let _from = array[i];
			try{
				let mint = await token.unpause.sendTransaction({from:_from});
			}catch(e){
				TestSuite.handleTxRevert(e);
			}
			isPausedByUser = await token.paused.call();
		    assert.equal(isPausedByUser, true, 'Minting is unpaused by not founder');
		}
		let mint = await token.unpause.sendTransaction({from:founder});
		isPaused = await token.paused.call();
	    assert.equal(isPaused, false, 'Minting is not unpaused by founder');
	}else{
		throw new Error('Minting is already unpaused');
	}
});

it("Users can burn their tokens", async()=>{
	let sender = accounts[1];
	let token = await Token.deployed();
	let startTotalSupply = toHex(await token.totalSupply.call());    
	let senderStartBalance = toHex(await token.balanceOf.call(sender));
	if(senderStartBalance<smallAmount){
		await token.burnTokens.sendTransaction(toHex(smallAmount),{from:sender});
		let newSenderBalance = toHex(await token.balanceOf.call(sender));
	    assert.equal(senderStartBalance-smallAmount,newSenderBalance, 'sender balance is wrong');
		let newTotalSupply = toHex(await token.totalSupply.call());    
	    assert.equal(sub(startTotalSupply,smallAmount),newTotalSupply, 'Token Supply is not '+toNumber(startTotalSupply-smallAmount));		
	}else{
		throw new Error('Sender balance is lower than '+smallAmount);
	}
});

it("Users cannot burn more than their balance", async()=>{
	let sender = accounts[1];
	let token = await Token.deployed();
	let startTotalSupply = toNumber(await token.totalSupply.call());    
	let senderStartBalance = toNumber(await token.balanceOf.call(sender));
	if(senderStartBalance>smallAmount){
		try{
			await token.burnTokens.sendTransaction(toHex(senderStartBalance+smallAmount),{from:sender});
		}catch(e){
			TestSuite.handleTxRevert(e)
		}
		let newSenderBalance = toNumber(await token.balanceOf.call(sender));
	    assert.equal(senderStartBalance,newSenderBalance, 'sender balance is wrong');
		let newTotalSupply = toNumber(await token.totalSupply.call());   
	    assert.equal(startTotalSupply,newTotalSupply, 'Token Supply is not '+toNumber(startTotalSupply));
	}else{
		throw new Error('Sender balance is lower than'+smallAmount);
	}
});

});

class TestSuite{
	static handleTxRevert(e){
		if(e!='Error: Returned error: VM Exception while processing transaction: revert'){
			console.log(e)
			throw new Error(e)
		}
	}
	static testTransfer(sender,receiver,amount,expectFailure=false,txSender=undefined){
		return new Promise(async(resolve,reject)=>{
			try{
				let result = !expectFailure;
				if(!txSender){
					txSender = sender;
				}
				let token = await Token.deployed();
				let senderStartBalance = toHex(await token.balanceOf.call(sender));
				let receiverStartBalance = toHex(await token.balanceOf.call(receiver));
				try{
					await token.transfer.sendTransaction(receiver, amount,{from:txSender});
				}catch(e){
					TestSuite.handleTxRevert(e)
				}
				let newSenderBalance = toHex(await token.balanceOf.call(sender));
				let newReceiverBalance = toHex(await token.balanceOf.call(receiver));

				if(expectFailure){
				    assert.equal(senderStartBalance,newSenderBalance, 'sender balance is wrong');
				    assert.equal(receiverStartBalance,newReceiverBalance, 'receiver balance is wrong');
				}else{
				    assert.equal(sub(senderStartBalance,amount),newSenderBalance, 'sender balance is wrong');
				    assert.equal(add(receiverStartBalance,amount),newReceiverBalance, 'receiver balance is wrong');
				}
				return resolve(result);
			}catch(e){
				return reject(e);
			}
		})
	}
	static testTransferFrom(owner,sender,receiver,amount,expectFailure=false,txSender=undefined){
		return new Promise(async(resolve,reject)=>{
			try{
				let result = !expectFailure;
				if(!txSender){
					txSender = sender;
				}
				let token = await Token.deployed();
				let ownerStartBalance = toHex(await token.balanceOf.call(owner));
				let senderStartBalance = toHex(await token.balanceOf.call(sender));
				let receiverStartBalance = toHex(await token.balanceOf.call(receiver));

				let startSRAllowance = toHex(await token.allowance.call(owner,sender));
				let startRBAllowance = toHex(await token.allowance.call(sender,receiver));
				let startSBAllowance = toHex(await token.allowance.call(owner,receiver));
				try{
					await token.transferFrom(owner,receiver, amount,{from:txSender});
				}catch(e){
					TestSuite.handleTxRevert(e)
				}
				let newOwnerBalance = toHex(await token.balanceOf.call(owner));
				let newSenderBalance = toHex(await token.balanceOf.call(sender));
				let newReceiverBalance = toHex(await token.balanceOf.call(receiver));

				let newSRAllowance= toHex(await token.allowance(owner,sender));
				let newRBAllowance= toHex(await token.allowance(sender,receiver));
				let newSBAllowance= toHex(await token.allowance(owner,receiver));
				if(expectFailure){
				    assert.equal(ownerStartBalance,newOwnerBalance, 'owner balance is wrong');
				    assert.equal(senderStartBalance,newSenderBalance, 'sender balance is wrong');
				    assert.equal(receiverStartBalance,newReceiverBalance, 'receiver balance is wrong');

		    	    assert.equal(newSRAllowance, startSRAllowance, 'Allowance is wrong');
				    assert.equal(newRBAllowance, startRBAllowance, 'Allowance is wrong');
				    assert.equal(newSBAllowance, startSBAllowance, 'Allowance is wrong');
				}else{
				    assert.equal(sub(ownerStartBalance,amount),newOwnerBalance, 'owner balance is wrong');
				    assert.equal(senderStartBalance,newSenderBalance, 'sender balance is wrong');
				    assert.equal(add(receiverStartBalance,amount),newReceiverBalance, 'receiver balance is wrong');

				    assert.equal(newSRAllowance, sub(startSRAllowance,amount), 'Allowance is wrong');
				    assert.equal(newRBAllowance, startRBAllowance, 'Allowance is wrong');
				    assert.equal(newSBAllowance, startSBAllowance, 'Allowance is wrong');
				}
				return resolve(result);
			}catch(e){
				return reject(e);
			}
		})
	}
	static testApproval(sender,receiver,amount,expectFailure=false,txSender=undefined){
			return new Promise(async(resolve,reject)=>{
				try{
					let result = !expectFailure;
					if(!txSender){
						txSender = sender;
					}
					let token = await Token.deployed();
					let startAllowance = toHex(await token.allowance.call(sender,receiver));
					try{
						await token.approve.sendTransaction(receiver, toHex(amount),{from:txSender});					
					}catch(e){
						TestSuite.handleTxRevert(e);
					}
					let newAllowance = toHex(await token.allowance.call(sender,receiver));
					if(expectFailure){
					    assert.equal(newAllowance, startAllowance, 'Allowance is wrong after approval');
					}else{
					    assert.equal(newAllowance, amount, 'Allowance is wrong after approval');
					}
					return resolve(result);
				}catch(e){
					return reject(e);
				}
			})
	}
	static testIncreaseApproval(sender,receiver,amount,expectFailure=false,txSender=undefined){
			return new Promise(async(resolve,reject)=>{
				try{
					let result = !expectFailure;
					if(!txSender){
						txSender = sender;
					}
					let token = await Token.deployed();
					let startAllowance = toHex(await token.allowance.call(sender,receiver));
					try{
						await token.increaseApproval.sendTransaction(receiver,toHex(amount),{from:txSender})
					}catch(e){
						TestSuite.handleTxRevert(e);
					}
					let newAllowance = toHex(await token.allowance.call(sender,receiver));
					if(expectFailure){
					    assert.equal(newAllowance, startAllowance, 'Allowance is wrong after increase');
					}else{
					    assert.equal(newAllowance, add(startAllowance,amount), 'Allowance is wrong after increase');
					}
					return resolve(result);
				}catch(e){
					return reject(e);
				}
			})
	}
	static testDecreaseApproval(sender,receiver,amount,expectFailure=false,txSender=undefined){
			return new Promise(async(resolve,reject)=>{
				try{
					let result = !expectFailure;
					if(!txSender){
						txSender = sender;
					}
					let token = await Token.deployed();
					let startAllowance = toHex(await token.allowance.call(sender,receiver));
					try{
						await token.decreaseApproval.sendTransaction(receiver,toHex(amount),{from:txSender})
					}catch(e){
						TestSuite.handleTxRevert(e);
					}
					let newAllowance = toHex(await token.allowance.call(sender,receiver));
					if(expectFailure){
					    assert.equal(newAllowance, startAllowance, 'Allowance is wrong after decrease');
					}else{
					    assert.equal(newAllowance, sub(startAllowance,amount), 'Allowance is wrong after decrease');
					}
					return resolve(result);
				}catch(e){
					return reject(e);
				}
			})
	}
	static testBurn(sender,amount,expectFailure=false,txSender=undefined){
		return new Promise(async(resolve,reject)=>{
			try{
				let result = !expectFailure;
				if(!txSender){
					txSender = sender;
				}
				let token = await Token.deployed();
				let startBalance = toHex(await token.balanceOf.call(sender));
				try{
					await token.burnTokens.sendTransaction(toHex(amount),{from:txSender})
				}catch(e){
					TestSuite.handleTxRevert(e);
				}
				let newBalance = toHex(await token.balanceOf.call(sender));
				if(expectFailure){
				    assert.equal(startBalance, newBalance, 'Balance is wrong after burn');
				}else{
				    assert.equal(startBalance, sub(newBalance,amount), 'Balance is wrong after burn');
				}
				return resolve(result);
			}catch(e){
				return reject(e);
			}
		})
	}
	static testReduceAsignmentTimestamp(receiver,amount,expectFailure=false,txSender=undefined){
		return new Promise(async(resolve,reject)=>{
			try{
				let result = !expectFailure;
				if(!txSender){
					txSender = receiver;
				}
				let token = await Token.deployed();
				let receiverStartBalance = toHex(await token.balanceOf.call(receiver));
				let receiverStartLockedBalance = toHex(await token.getLockedAssignedBalance.call(receiver));
				let receiverStartAllAssignedBalance = toHex(await token.getAllAssignedBalance.call(receiver));
				let receiverStartLockTimestamp = parseInt(await token.getAssignmentTimestamp.call(receiver));
				try{
					await token.reduceAssignmentTimestampByMonth.sendTransaction(receiver, amount,{from:txSender});
				}catch(e){
					TestSuite.handleTxRevert(e)
				}
				let calculateMonthPassed = function(since){
					let date = new Date(); 
					let timestamp = date.getTime()/1000;
					let span = timestamp-since;
					let monthPassed = span/MONTH;
					return Math.floor(monthPassed);
				}
				let newReceiverBalance = toHex(await token.balanceOf.call(receiver));
				let newReceiverLockedBalance = toHex(await token.getLockedAssignedBalance.call(receiver));
				let newReceiverAllAssignedBalance = toHex(await token.getAllAssignedBalance.call(receiver));
				let newReceiverLockTimestamp = parseInt(await token.getAssignmentTimestamp.call(receiver));
				let monthPassed = calculateMonthPassed(newReceiverLockTimestamp);
				let percentUnlocked = Math.floor(monthPassed/6)*33;
				if(percentUnlocked>=99){
					percentUnlocked=100;
				}
				let tokensUnlocked = toHex(newReceiverAllAssignedBalance*percentUnlocked/100);
				console.log('month',monthPassed,'percent',percentUnlocked,'tokensUnlocked',tokensUnlocked)
				if(expectFailure){
				    assert.equal(receiverStartLockedBalance, newReceiverLockedBalance, 'receiver locked balance is wrong');
				    assert.equal(receiverStartBalance,newReceiverBalance, 'receiver Total Balance is wrong');
				}else{
				    assert.equal(newReceiverLockedBalance, sub(receiverStartAllAssignedBalance,tokensUnlocked), 'receiver locked balance is wrong');
				    assert.isAbove(toNumber(receiverStartLockedBalance), toNumber(newReceiverLockedBalance), 'receiver locked balance was decreased');
				}
			    assert.equal(newReceiverBalance, add(receiverStartBalance,sub(receiverStartLockedBalance,newReceiverLockedBalance)), 'receiver Total Balance is wrong');
			    assert.isAbove(receiverStartLockTimestamp,newReceiverLockTimestamp-(MONTH*monthPassed) , 'receiver assignment timestamp was not updated');
				return resolve(result);
			}catch(e){
				return reject(e);
			}
		})
	}

	static testAssignTokens(sender,receiver,amount,expectFailure=false,txSender=undefined){
		return new Promise(async(resolve,reject)=>{
			try{
				let result = !expectFailure;
				if(!txSender){
					txSender = sender;
				}
				let token = await Token.deployed();
				let senderStartBalance = toHex(await token.balanceOf.call(sender));
				let receiverStartBalance = toHex(await token.balanceOf.call(receiver));
				let receiverStartLockedBalance = toHex(await token.getLockedAssignedBalance.call(receiver));
				let receiverStartLockTimestamp = parseInt(await token.getAssignmentTimestamp.call(receiver));
				try{
					await token.assignTokens.sendTransaction(receiver, amount,{from:txSender});
				}catch(e){
					TestSuite.handleTxRevert(e)
				}
				let newSenderBalance = toHex(await token.balanceOf.call(sender));
				let newReceiverBalance = toHex(await token.balanceOf.call(receiver));
				let newReceiverLockedBalance = toHex(await token.getLockedAssignedBalance.call(receiver));
				let newReceiverLockTimestamp = parseInt(await token.getAssignmentTimestamp.call(receiver));
				if(expectFailure){
				    assert.equal(senderStartBalance,newSenderBalance, 'sender balance is wrong');
				    assert.equal(receiverStartLockedBalance, newReceiverLockedBalance, 'receiver locked balance is wrong');
				    assert.equal(receiverStartLockTimestamp, newReceiverLockTimestamp, 'receiver assignment timestamp was updated');
				}else{
				    assert.equal(sub(senderStartBalance,amount),newSenderBalance, 'sender balance is wrong');
				    assert.equal(newReceiverLockedBalance, add(receiverStartLockedBalance,amount), 'receiver locked balance is wrong');
				    assert.isBelow(receiverStartLockTimestamp,newReceiverLockTimestamp , 'receiver assignment timestamp was not updated');
				}
			    assert.equal(receiverStartBalance,newReceiverBalance, 'receiver Total Balance is wrong');
				return resolve(result);
			}catch(e){
				return reject(e);
			}
		})
	}	
}

contract("INMGToken Lockup Tests", async(accounts)=>{
	const founder = accounts[0];

	it("Only owner can transfer and lock tokens to user", async()=>{
		let sender = founder;
		let receiver = accounts[1];
		let thirdParty = accounts[4];
		let amount = mediumAmount;
		assert.isTrue(await TestSuite.testAssignTokens(sender,receiver,amount,false,sender));
		assert.isFalse(await TestSuite.testAssignTokens(thirdParty,receiver,amount,true,thirdParty));
	});

	it("User with assigned tokens cannot transfer, burn or transferFrom locked tokens", async()=>{
		let sender = accounts[1];		
		let receiver = accounts[4];
		let token = await Token.deployed();

		let balance = toHex(await token.balanceOf.call(sender));
		let lockedBalance = toHex(await token.getLockedAssignedBalance.call(sender));	
		let amount = add(balance,lockedBalance);
		if(lockedBalance>0){
			assert.isFalse(await TestSuite.testTransfer(sender,receiver,amount,true,sender));
			assert.isTrue(await TestSuite.testApproval(sender,receiver,amount,false,sender));
			assert.isFalse(await TestSuite.testTransferFrom(sender,receiver,receiver,amount,true,receiver));
			assert.isFalse(await TestSuite.testBurn(sender,amount,true,sender));
		}else{
			throw new Error('Account has no locked tokens')
		}
	});

	it("Owner can transfer and lock more tokens to user", async()=>{
		let sender = founder;
		let receiver = accounts[1];
		let thirdParty = accounts[4];
		let amount = smallAmount;
		assert.isTrue(await TestSuite.testAssignTokens(sender,receiver,amount,false,sender));
		//assert.isTrue(await TestSuite.testAssignTokens(thirdParty,receiver,amount,true,thirdParty));
	});

	it("Locked tokens will unlock gradually unlock every 6 month", async()=>{
		let receiver = accounts[1];
		assert.isFalse(await TestSuite.testReduceAsignmentTimestamp(receiver,1,true,founder));
		assert.isTrue(await TestSuite.testReduceAsignmentTimestamp(receiver,5,false,founder));			
		assert.isTrue(await TestSuite.testReduceAsignmentTimestamp(receiver,6,false,founder));
		assert.isTrue(await TestSuite.testReduceAsignmentTimestamp(receiver,6,false,founder));			
		assert.isFalse(await TestSuite.testReduceAsignmentTimestamp(receiver,6,true,founder));			

		//assert.isTrue(await TestSuite.testReduceAsignmentTimestamp(receiver,6,true));
	});	
});