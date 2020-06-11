module.exports = {
	name: 'get',
	description: 'Adds any amount of any currency to the account',
	aliases: ['g', 'add'],
	args: true,
	arglength: 2,
	usage: '<currency name> <amount> [skew]',
	details: `\`[skew]\` adjusts the value of the currency when being generated. A higher value skews the rng towards 1. A lower number skews away from 1. Default is 20.`,
	execute(message, args) {
		Start(message, args);
	},
};

const Discord = require('discord.js');
var Decimal = require('decimal.js')
Decimal.set({ precision: 40, rounding: 1 })

//
//SQL
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./currencybot.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('GET - Connected to CurrencyBot database');
});


//Check input arguements
function Start(message, args){
	//var args[1] = parseFloat(args[1]).toFixedDown(15)
	
	if (isNaN(args[2]) || !isFinite(args[2]))
		args[2] = 20
	
		if (args[0].length > 40)
			message.channel.send('Currency NAME specified was greater than 40 characters long. Please use UNICODE characters only.')
		else if (isNaN(args[1]))
			message.channel.send('Amount entered was not a valid number, or you had spaces in the currency\'s name.')
		else if (!isFinite(args[1]) || args[1] > 1e100)
			message.channel.send('Amount specified is TOO LARGE! Maximum 1e100.')
		else if (args[1] <= 0)
			message.channel.send('Amount cannot be 0 or less.')
		else if (/[`;\'\\|\'"@]+/.test(args[0]))
			message.channel.send('Currency NAME contains an illegal charcter **[  `  ;   \\  |  \'  "  @  ]**')
		else if (args[0].length < 1)
			message.channel.send('Currency NAME cannot be empty.')	
		else {
			args[1] = new Decimal(args[1])
			CurrencyExist(message, args);
		}
}

//
//Check if input currency exists or not
async function CurrencyExist(message, args){
	var _exists = false
	let sql = 'SELECT 1 FROM Currencies WHERE name= ?'
	
	db.each(sql, args[0], (err, rows) => {
		if (rows !== null)
			_exists = true
		
	}, function (err, rows) {
		//if exists, add amount to account
		if (_exists)
			AddToAccount(message, args)
		//if it doesn't exist, generate it and a random value for it. Then add to account
		else
			NewCurrency(message, args)
	});
}

//
//Currency Exists
function AddToAccount(message, args){
	_account = 'a'+message.author.id
	_amount = args[1]
	
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id= ? AND currency_id= ?'
	let sql2 = 'INSERT INTO CurrencyEntry VALUES("' + _account + '","' + args[0] + '",' + _amount + ')'
		
	db.each(sql1, [_account, args[0]], (err, rows) => {
		//The internals of this only run if a currency entry exists for the user.
		//It is skipped if the user does not have it yet
		if (typeof rows !== 'undefined') {
			_amount = _amount.plus(rows.amount)
			sql2 = 'UPDATE CurrencyEntry SET amount=' + _amount + ' WHERE account_id="' + _account + '" AND currency_id="' + rows.currency_id + '"'
		}
	}, function (err, rows) {
		db.run(sql2)
		Embed_Added(message, args)
	});
		
}
function Embed_Added(message, args){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'BANKING RECEIPT', value: args[1] + ' `' + args[0] + '` was deposited into your account! Thank you for choosing Currency Of The Masses.'},
	)

	message.channel.send(Embed)
}


//
//New Currency
async function NewCurrency(message, args){
	var _account = 'a'+message.author.id
	var _value = randn_bm(1, 1000000, args[2])
	await new Promise(resolve => setTimeout(resolve, 200));
	
	let sql0 = 'INSERT INTO Currencies (name, value, owner_id, tax) VALUES( ? , ? , ? ,0.01)'
	db.run(sql0, [args[0], _value, _account], () =>{}, function (err, rows) {
		Embed_Discovery(message, args, _value)
		AddToAccount(message, args)
	});
	//await new Promise(resolve => setTimeout(resolve, 50));
	
}
function Embed_Discovery(message, args, _value){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'YOU\'VE DISCOVERED A NEW CURRENCY', value: '**NAME:** `' + args[0] + '`\n**VALUE:** ' + _value},
	)

	message.channel.send(Embed)
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
	
	if (!isFinite(num) || num > 1e200)
		num = 1e200
	
    return num;
}

Number.prototype.toFixedDown = function(digits) {
    var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
        m = this.toString().match(re);
    return m ? parseFloat(m[1]) : this.valueOf();
};