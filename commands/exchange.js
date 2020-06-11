module.exports = {
	name: 'exchange',
	description: 'Trade a currency for another currency.',
	aliases: ['e'],
	args: true,
	arglength: 3,
	usage: '<currency to give> <amount> <currency to get>',
	details: `\`$exchange <currency1> <amount> <currency2>\`
		This command allows exchanging between two currencies. You must meet a minimum exchange value of 0.00001 from currency1 to currency2. There is also a tax imposed on exchanges. The currency owner of currency2 receives a cut of the exchange, specified by the tax amount (visible with \`$currency view\`.
		
		\`<amount>\` accepts **max** to exchange all of currency1 you currently have.`,
	execute(message, args) {
		Start(message, args)
	},
};

const Discord = require('discord.js');
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
		if (args[0].length > 40)
			Embed_ExchangeHelp(message, args, 'Currency name `' + args[0] + '` longer than 20 characters.')
		else if (args[2].length > 40)
			Embed_ExchangeHelp(message, args, 'Currency name `' + args[2] + '` longer than 20 characters.')
		else if (args[0] == args[2])
			Embed_ExchangeHelp(message, args, 'Cannot exchange to the same currency.')
		else if (/[`;\'\\|\'"@]+/.test(args[0] + args[2]))
			Embed_ExchangeHelp(message, args, 'One of the currency names contains an illegal characters **[  `  ;  \'  \\  |  \'  "  @  ]**')
		else if (args[1] !== 'max') {
			if (isNaN(args[1]) || !isFinite(args[1]) || args[1] <= 0 )
				Embed_ExchangeHelp(message, args, 'Amount entered to trade is not a valid number.. See `$help exchange`')
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
	let sql2 = 'SELECT 1 FROM Currencies WHERE name=?'
	let sql3 = 'SELECT 1 FROM Currencies WHERE name=?'
	
			//Check if the first currency name exists
			db.each(sql2, args[0], (err, rows) => {
				if (rows !== null)
					_exists2 = true
				
			}, function (err, rows) {
				if (_exists2) {
					//check if the second currency exists
					db.each(sql3, args[2], (err, rows) => {
						if (rows !== null)
							_exists3 = true
						
					}, function (err, rows) {
						if (_exists3) {
							PlayerHasCurrency(message, args)
						}
						else
							Embed_ExchangeHelp(message, args, 'Currency `' + args[2] + '` does not exist.')
					});
				}
				else
					Embed_ExchangeHelp(message, args, 'Currency `' + args[0] + '` does not exist.')	
			});
}

//
//Check if player has the currency they are trading from, AND enough of it
function PlayerHasCurrency(message, args) {
	var _account = 'a' + message.author.id
	var _exists1 = false
	
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id= ? AND currency_id= ? '
	
	db.each(sql1, [_account, args[0]], (err, rows) => {
		if (typeof rows !== 'undefined') {
			_exists1 = true
			args[3] = rows.amount
		}
		
	}, function (err, rows) {
		if (_exists1) {
			if (args[3] < args[1])
				Embed_ExchangeHelp(message, args, 'You do not have enough `' + args[0] + '` in your account to perform this trade!\nYou have: ' + args[3])
			else
				ExchangeCalc(message, args)
		}
		else
			Embed_ExchangeHelp(message, args, 'You do not have any `' + args[0] + '` in your account!')
			
	});
}

//
//Calculates exchange values between two currencies
function ExchangeCalc(message, args) {
	var _account = 'a' + message.author.id
	
	let sql1 = 'SELECT * FROM Currencies WHERE name=?'
	let sql2 = 'SELECT * FROM Currencies WHERE name=?'
	
	var _value1
	var _value2
	var _tax
	var _amount
	
	if (args[1] == 'max')
		_amount = args[3]
	else
		_amount = args[1]
	args[1] = _amount
	
	//get value of traded currency
	db.each(sql1, args[0], (err, rows) => {
		_value1 = rows.value
		
	}, function (err, rows){
		//get value and tax of wanted currency
		db.each(sql2, args[2], (err, rows) => {
			_value2 = rows.value
			_tax = rows.tax
			args[5] = rows.owner_id
			args[7] = _tax
			
		}, function (err, rows) {
			//this is where the math happens to determine how much of the 2nd currency you get
			var _converted = ((_value1 * _amount) / _value2).toFixed(15)
			var _minimum = ((0.00001 * _value2) / _value1).toFixed(15)
			
			var _fixed = parseFloat(_converted).toFixed(15)
			//need minimum 0.0001 on return to exchange
			if (_converted >= 0.00001) {
				//calculate tax
				if (_converted == 0.00001)
					_tax = 0
				_taxed = (_converted * _tax).toFixed(15)
				_converted -= _taxed
				
				args[4] = _converted
				args[6] = _taxed
				args[8] = _minimum
				Exchange(message, args)
			}
			else
				Embed_ExchangeHelp(message, args, "You need a minimum of " + _minimum + " `" + args[0] + "` to exchange to `" + args[2] + "`")
		});
	});
}

//
//Performs the actual  exchange. Adds the requested currency to the account, then removes the traded currency
async function Exchange(message, args) {
	var _account = 'a' + message.author.id
	
	//add Exchanged currency to account
	let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id= ? AND currency_id= ?'
	let sql2 = 'INSERT INTO CurrencyEntry VALUES("' + _account + '","' + args[2] + '",' + args[4] + ')'
	let sql3 = 'UPDATE CurrencyEntry SET amount = amount - ? WHERE account_id= ? AND currency_id= ?'
		
	db.each(sql1, [_account, args[2]], (err, rows) => {
		//The internals of this only run if a currency entry exists for the user.
		//It is skipped if the user does not have it yet
		if (typeof rows !== 'undefined') {
			_amount = rows.amount + parseFloat(args[4])
			sql2 = 'UPDATE CurrencyEntry SET amount=' + _amount + ' WHERE account_id="' + _account + '" AND currency_id="' + args[2] + '"'
		}
	}, function (err, rows) {
		db.run(sql2).run(sql3, [args[1], _account, args[0]], () => {}, function (){
			//If a currency entry drops to 0, set account ID to 0 so it doesn't show up in a players $account
			db.run('UPDATE CurrencyEntry SET account_id = 0 WHERE amount = 0')
			//this deletes duplicate entries in CurrencyEntry table
			.run('DELETE FROM CurrencyEntry WHERE rowid not in (SELECT min(rowid) FROM CurrencyEntry GROUP BY account_id, currency_id)');
		});
	});
	
	await new Promise(resolve => setTimeout(resolve, 100));
	
	//Add taxed currency to the currency owner's account
	let sql4 = 'SELECT * FROM CurrencyEntry WHERE account_id= ? AND currency_id= ?'
	let sql5 = 'INSERT INTO CurrencyEntry VALUES("' + args[5] + '","' + args[2] + '",' + args[6] + ')'
	db.each(sql4, [args[5], args[2]], (err, rows) => {
		//The internals of this only run if a currency entry exists for the user.
		//It is skipped if the user does not have it yet
		if (typeof rows !== 'undefined') {
			_amount2 = rows.amount + parseFloat(args[6])
			sql5 = 'UPDATE CurrencyEntry SET amount=' + _amount2 + ' WHERE account_id="' + args[5] + '" AND currency_id="' + args[2] + '"'
		}
	}, function (err, rows) {
			db.run(sql5)
			Embed_Exchange(message, args)
	});
}

//
//Outputs message to channel containing info about the exchange
function Embed_Exchange(message, args){
	const _string = [];
	
	_string.push('**EXCHANGE RATE:**\n' + (args[8] * 10000) + ' `' + args[0] + '` => 1.000 `' + args[2] + '`\n');
	_string.push('**EXCHANGED:** ' + args[1] + ' `' + args[0] + '`');
	_string.push('**RECEIVED:** ' + args[4] + ' `' + args[2] + '`\n');
	_string.push('**CURRENCY OWNER:** <@' + args[5].substr(1) + '>');
	_string.push('**EXCHANGE TAX:** ' + args[7]);
	_string.push('**TAX PAYED:** ' + args[6] + ' `' + args[2] + '`');
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$exchange ${args[0]} ${args[1]} ${args[2]}`)
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'RECEIPT', value: _string},
	)

	message.channel.send(Embed)
}

//
//Outputs message to channel containing help info
function Embed_ExchangeHelp(message, args, help){

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$exchange`)
	.setDescription(`requested by ${message.author}\nPlease use \`$help exchange\``)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Help Text', value: help},
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