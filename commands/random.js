module.exports = {
	name: 'random',
	description: 'random',
	aliases: ['r'],
	execute(message, args) {
		if (message.author.id == "132287419117600768")
			random(message, args)
	},
};

async function random(message, args){
	var nums = []
	var temp = 0
	var avg = 0
	
	for (i = 0; i < args[0]; i++) {
		temp = randn_bm(1, 1000000, args[1])
		//console.log(temp)
		nums.push(temp)
		avg += parseFloat(temp)
	}
	
	nums = [Math.max(...nums), Array.min(nums)]
	//console.log(avg)
	avg = avg / args[0]
	message.channel.send("over " + args[0] + " iterations\nMAX: " + nums[0] + "\nMIN: " + nums[1] +"\nAVERAGE: " + avg)
}

function randn_bm(min, max, skew) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    //if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
	num = num.toFixed(10)
    return num;
}


Array.min = function( array ){
    return Math.min.apply( Math, array );
};