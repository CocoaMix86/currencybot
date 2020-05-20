module.exports = {
	name: 'get',
	description: 'adds any amount of any currency to the account',
	execute(message, args) {
		Start(message, args);
	},
};

const Discord = require('discord.js');
var fs = require('fs');
var pad = require('pad-right');

//
//SQL
const sqlite3 = require('sqlite3').verbose();

let db = openDB()


//Check input arguements
function Start(message, args){
	var _account = message.author.id
	if (!args.length)
		message.channel.send('No arguments provided.')
	else {
		var _currency = args[0].toString()
		var _amount = parseFloat(args[1])
		if (_currency.length > 20)
			message.channel.send('Currency NAME specified was greater than 20 characters long. Please use UNICODE characters only.')
		else if (isNaN(_amount))
			message.channel.send('no amount specified for currency, OR you had spaces in the currency NAME.')
		else if (!isFinite(_amount) || _amount > 1e100)
			message.channel.send('Amount specified is TOO LARGE! Maximum 1e100.')
		else if (_amount <= 0)
			message.channel.send('Amount cannot be 0 or less.')
		else if (_currency.includes("`") || _currency.includes(";") || _currency.includes("'") || _currency.includes("\\") || _currency.includes("\\") || _currency.includes("\"") || _currency.includes("'"))
			message.channel.send('Currency NAME contains an illegal charcter **[  `  ;  \'  \\  |  \'  "  ]**')
		else if (_currency.length < 1)
			message.channel.send('Currency NAME cannot be empty.')	
		else
			AccountCheck([_currency, _amount, message]);
	}
}

//
//Checks if user exists or not
async function AccountCheck(message){
	var _account = message[2].author.id
	var _exists = false
	let sql = 'SELECT 1 FROM Accounts WHERE account_id=' + _account
	
	db.each(sql, [], (err, rows) => {
		if (rows !== null)
			_exists = true
		
	}, function (err, rows) {
		if (_exists) {
			CurrencyExist(message)
		}
		else
			message[2].channel.send('your account does not exist. Please use `$account` first')
	});
}

//Check if input currency exists or not
async function CurrencyExist(message){
	var _exists = false
	var _currency = message[0]
	let sql = 'SELECT 1 FROM Currencies WHERE name=\'' + _currency + '\''
	
	db.each(sql, [], (err, rows) => {
		if (rows !== null)
			_exists = true
		
	}, function (err, rows) {
		//if exists, add amount to account
		if (_exists)
			AddToAccount(message)
		//if it doesn't exist, generate it and a random value for it. Then add to account
		else
			NewCurrency(message)
	});
}

//
//Currency Exists
function AddToAccount(message){
	_amount = message[1]
	
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id=' + message[2].author.id + ' AND currency_id="' + message[0] + '"'
	let sql2 = 'INSERT INTO CurrencyEntry VALUES(' + message[2].author.id + ',"' + message[0] + '",' + _amount + ')'
		
	db.each(sql1, [], (err, rows) => {
		//The internals of this only run if a currency entry exists for the user.
		//It is skipped if the user does not have it yet
		if (typeof rows !== 'undefined') {
			_amount = rows.amount + message[1]
			sql2 = 'UPDATE CurrencyEntry SET amount=' + _amount + ' WHERE account_id=' + message[2].author.id + ' AND currency_id="' + rows.currency_id + '"'
		}
	}, function (err, rows) {
		db.run(sql2)
		Embed_Added(message)
	});
		
}
function Embed_Added(message){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'BANKING RECEIPT', value: message[1] + ' units of `' + message[0] + '` was deposited into your account! Thank you for choosing Currency Of The Masses.'},
	)

	message[2].channel.send(Embed)
}


//
//New Currency
async function NewCurrency(message){
	var _currencyid
	var _amount = message[1]
	var _value = randn_bm(0, 100000, 8)
	await new Promise(resolve => setTimeout(resolve, 200));
	
	let sql0 = 'INSERT INTO Currencies (name, value, owner_id) VALUES(\'' + message[0] + '\',' + _value + ',' + message[2].author.id +')'
	db.run(sql0, [], () =>{}, function (err, rows) {
		Embed_Discovery(message, _value)
		AddToAccount(message)
	});
	//await new Promise(resolve => setTimeout(resolve, 50));
	
}
function Embed_Discovery(message, _value){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'YOU\'VE DISCOVERED A NEW CURRENCY', value: '**NAME:** `' + message[0] + '`\n**VALUE:** ' + _value},
	)

	message[2].channel.send(Embed)
}




function randn_bm(min, max, skew) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
	num = num.toFixed(4)
    return num;
}

function openDB() {
	var _db = new sqlite3.Database('./currencybot.db', (err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('GET - Connected to CurrencyBot database');
	});
	return _db
}