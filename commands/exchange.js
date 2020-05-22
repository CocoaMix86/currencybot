module.exports = {
	name: 'exchange',
	description: 'Trade a currency for another',
	aliases: ['e'],
	args: true,
	arglength: 3,
	usage: '<currency to give> <amount> <currency to get>',
	execute(message, args) {
		Start(message, args)
	},
};

const Discord = require('discord.js');
var fs = require('fs');
//
//SQL
const sqlite3 = require('sqlite3').verbose();
let db = openDB()

function openDB() {
	var _db = new sqlite3.Database('./currencybot.db', (err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('EXCHANGE - Connected to CurrencyBot database');
	});
	return _db
}
////////////////////
////////////////////

function Start(message, args){
		if (args[0].length > 20)
			message.channel.send('Currency name `' + args[0] + '` longer than 20 characters.')
		else if (args[2].length > 20)
			message.channel.send('Currency name `' + args[2] + '` longer than 20 characters.')
		else if (args[0] == args[1])
			message.channel.send('Cannot exchange to the same currency.')
		else if (/[`;\'\\|\'"@]+/.test(args[0] + args[2]))
			message.channel.send('One of the currency names contains an illegal characters **[  `  ;  \'  \\  |  \'  "  @  ]**')
		else if (args[1] !== 'max') {
			if (isNaN(args[1]) || !isFinite(args[1]) || args[1] <= 0 )
				message.channel.send('Amount entered to trade is not a valid number.. See `$help exchange`')
			else
				CurrencyCheck(message, args)
		}
		else 
			CurrencyCheck(message, args)
}


//
//Checks if user exists or not
function CurrencyCheck(message, args){
	var _exists2 = false
	var _exists3 = false
	let sql2 = 'SELECT 1 FROM Currencies WHERE name="' + args[0] + '"'
	let sql3 = 'SELECT 1 FROM Currencies WHERE name="' + args[2] + '"'
	
			//Check if the first currency name exists
			db.each(sql2, [], (err, rows) => {
				if (rows !== null)
					_exists2 = true
				
			}, function (err, rows) {
				if (_exists2) {
					//check if the second currency exists
					db.each(sql3, [], (err, rows) => {
						if (rows !== null)
							_exists3 = true
						
					}, function (err, rows) {
						if (_exists3) {
							PlayerHasCurrency(message, args)
						}
						else
							message.channel.send('Currency `' + args[2] + '` does not exist.')
					});
				}
				else
					message.channel.send('Currency `' + args[0] + '` does not exist.')	
			});
}

//
//Check if player has the currency they are trading from, AND enough of it
function PlayerHasCurrency(message, args) {
	var _account = message.author.id
	var _exists1 = false
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id=' + _account + ' AND currency_id="' + args[0] + '"'
	
	db.each(sql1, [], (err, rows) => {
		if (typeof rows !== 'undefined') {
			_exists1 = true
			args[3] = rows.amount
		}
		
	}, function (err, rows) {
		if (_exists1) {
			if (args[3] < args[1])
				message.channel.send('You do not have enough `' + args[0] + '` in your account to perform this trade!\nYou have: ' + args[3])
			else
				ExchangeCalc(message, args)
		}
		else
			message.channel.send('You do not have any `' + args[0] + '` in your account!')
			
	});
}

//
//Calculates exchange values between two currencies
function ExchangeCalc(message, args) {
	var _account = message.author.id
	
	let sql1 = 'SELECT * FROM Currencies WHERE name="' + args[0] + '"'
	let sql2 = 'SELECT * FROM Currencies WHERE name="' + args[2] + '"'
	
	var _value1
	var _value2
	var _amount
	
	if (args[1] == 'max')
		_amount = args[3]
	else
		_amount = args[1]
	
	db.each(sql1, [], (err, rows) => {
		_value1 = rows.value
		
	}, function (err, rows){	
		db.each(sql2, [], (err, rows) => {
			_value2 = rows.value
			
		}, function (err, rows) {
			//this is where the math happens to determine how much of the 2nd currency you get
			var _exchangeValue = _value1 * _amount
			var _converted = (_exchangeValue / _value2).toFixed(8)
			var _minimum = ((0.0001 * _value2) / _value1).toFixed(4)
			var _convOutput = ExponentNotation(parseFloat(_converted).toFixed(4), 4)
			
			if (_converted >= 0.0001) {
				message.channel.send("You received " + _convOutput + " `" + args[2] +"`!")
				args[4] = parseFloat(_converted).toFixed(4)
				Exchange(message, args)
			}
			else
				message.channel.send("You need a minimum of " + _minimum + " `" + args[0] + "` to exchange to `" + args[2] + "`")
		});
	});
}

function Exchange(message, args) {
	var _account = message.author.id
	
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id=' + message.author.id + ' AND currency_id="' + args[2] + '"'
	let sql2 = 'INSERT INTO CurrencyEntry VALUES(' + message.author.id + ',"' + args[2] + '",' + args[4] + ')'
		
	db.each(sql1, [], (err, rows) => {
		//The internals of this only run if a currency entry exists for the user.
		//It is skipped if the user does not have it yet
		if (typeof rows !== 'undefined') {
			_amount = rows.amount + parseFloat(args[4])
			sql2 = 'UPDATE CurrencyEntry SET amount=' + _amount + ' WHERE account_id=' + message.author.id + ' AND currency_id="' + args[2] + '"'
		}
	}, function (err, rows) {
		db.run(sql2)
	});
}












function Embed_Help(message, args, help){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('$Help Exchange')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Help', value: help},
		{ name: 'use command `$help exchange` for more details', value: "not actually working yet"},
	)

	message.channel.send(Embed)
}

Number.prototype.toFixedDown = function(digits) {
    var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
        m = this.toString().match(re);
    return m ? parseFloat(m[1]) : this.valueOf();
}

function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}