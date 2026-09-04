export function awardResult(balance:number,lifetime:number,wealth:number,amount:number,count=1){if(amount<=0||!Number.isInteger(amount))throw new Error("Invalid amount");return{balance:balance+amount,lifetime:lifetime+amount,wealth:wealth+amount*count}}
export function purchaseResult(balance:number,wealth:number,price:number){if(price>balance)throw new Error("Insufficient balance");return{balance:balance-price,wealth}}
export function deductionResult(balance:number,amount:number){if(amount<=0||!Number.isInteger(amount))throw new Error("Invalid amount");const removed=Math.min(balance,amount);return{balance:balance-removed,removed}}
export function shouldUnlock(wealth:number,target:number,unlocked:boolean){return !unlocked&&wealth>=target}
