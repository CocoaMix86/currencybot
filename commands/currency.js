module.exports = {
	name: 'currency',
	description: 'Gets info about different currencies',
	aliases: ['c', 'curr'],
	usage: '[list] or [view <currency name>]',
	details: `\`$currency list\`
		Also implied from \`$currency\`. Lists all existing currencies, sorted by value.
		
		\`$currency view <currency name>\`
		Gets all details of a single currency, including data such as tax % and owner.
		
		\`$currency discover [?]\`
		WIP`,
	execute(message, args) {
		Start(message, args);
	},
};

const Discord = require('discord.js');
const client = new Discord.Client();
var pad = require('pad-right');
var Decimal = require('decimal.js')
Decimal.set({ precision: 40, rounding: 1 })

var _discoverUsage = `\`$currency discover <Currency name to discover> <Currency to trade> <amount to trade>\``
var _taxUsage = `\`$currency tax <Currency name> <tax amount>\``

//
//SQL
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./currencybot.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('CURRENCY - Connected to CurrencyBot database');
});


//filters input
function Start(message, args){
	if (!args.length)
		args[0] = 'list'
	
	if (args[0] == 'list' || args[0] == 'l') {
		if (typeof args[1] == 'undefined' || !isFinite(args[1]) || args[1] < 1 || isNaN(args[1]))
			args[1] = 1
		GetCurrencies(message, args)
	}
	
	else if (args[0] == 'view' || args[0] == 'v') {
		if (typeof args[1] == 'undefined')
			Embed_CurrencyHelp(message, `view`, 'A currency was not specified to view.')
		else
			ViewCurrency(message, args)
	}
	
	else if (args[0] == 'discover' || args[0] == 'd') {
		if (typeof args[1] == 'undefined' && typeof args[2] == 'undefined' && typeof args[3] == 'undefined')
			Embed_DiscoverHelp(message)
		else if (typeof args[1] == 'undefined' || typeof args[2] == 'undefined' || typeof args[3] == 'undefined')
			Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, `An argument was not specified or undefined.\nSee \`$currency discover\` for help pertaining to currency discovery\n\n**Usage:** ${_discoverUsage}`)
		else if (isNaN(args[3]) || !isFinite(args[3]))
			Embed_CurrencyHelp(message, `discover  ${args[1]} ${args[2]}`, `Amount specified was not valid.\n\n**Usage:** ${_discoverUsage}`)
		else
			Discover_Exist(message, args)
	}
	
	else if (args[0] == 'tax' || args[0] == 't') {
		if (typeof args[1] == 'undefined')
			Embed_CurrencyHelp(message, `tax`, `A currency was not specified to edit tax.\n\n**Usage:** ${_taxUsage}`)
		else if (isNaN(args[2]))
			Embed_CurrencyHelp(message, `tax`, 'Tax value supplied was invalid.')
		else if (args[2] > 50 || args[2] < 0)
			Embed_CurrencyHelp(message, `tax`, 'Tax value must be between 0 and 50.')
		else
			SetCurrencyTax(message, args)
	}
}


//
//Get list of all existing currencies
async function GetCurrencies(message, args){
	var _balance = []
	let sql = 'SELECT c.name,c.value,CAST(SUM(a.amount) as TEXT) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name Group BY a.currency_id ORDER BY c.value DESC'
	
	db.each(sql, [], (err, row) => {
		_temp = row.name.toString()
		_expNotation = row.value
		_expNotation2 = row.amount
		if (row.value.toString().length > 20) {
			_expNotation = ExponentNotation(row.value, 15);
		}
		if (row.amount.toString().length > 20) {
			_expNotation2 = ExponentNotation(row.amount, 15);
		}
		_balance.push("**" + _temp + '**\n`[' + pad(_expNotation + '', 20, ' ') + 'x💰] - ' + pad(_expNotation2 + '', 20, ' ') + '`\n')
	}, function() {
		message.channel.send(Embed_Currencies(message, _balance, args));	
	});
}
//
//Sends message containing current account balances
function Embed_Currencies(message, _balance, args){
	var _pages = Math.ceil(_balance.length/10)
	var _output = []
	
	for (i = 10*(args[1]-1); i < 10*args[1]; i++)
		_output.push(_balance[i])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('$currency list')
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: '```\nNAME\nVALUE                  EXISTING\n```' + _output.join('')},
	)
	.setFooter('PAGE ' + args[1] + ' of ' + _pages);

	return Embed;
}


//
//Gets data on a specific currency
async function ViewCurrency(message, args){
	var _output = ''
	let sql2 = 'SELECT c.name,c.used,c.value,c.owner_id as owner_id,c.tax,CAST(SUM(a.amount) as TEXT) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name AND c.name= ? Group BY a.currency_id ORDER BY c.value DESC'
	
	if (await DoesExist(args[1])) {
		//if exists, get data of currency and output message to channel 
		db.each(sql2, args[1], (err, row) => {
			_output = `**NAME:** ${row.name}\n**VALUE:** ${row.value}x💰\n**EXISTING:** ${row.amount}\n**OWNER:** <@${row.owner_id.substr(1)}>\n**EXCHANGE TAX:** ${row.tax}%\n**DISCOVERS USED:** ${row.used}/5`
		}, function (err, row){
			message.channel.send(Embed_View(message, _output, args))
		});
	}
	else
		Embed_CurrencyHelp(message, `view ${args[1]}`, `\`${args[1]}\` is not a valid currency.`)

	
	
}
function Embed_View(message, output, args){

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$currency view ${args[1]}`)
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: output},
	)

	return Embed;
}


//
//Discovers a new currency
async function Discover_Exist(message, args) {
	if (await DoesExist(args[1]))
		Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, `\`${args[1]}\` already exists!`)
	else {
		if (await DoesExist(args[2])) {
			Discover_PlayerHasCurrency(message, args)
		}
		else
			Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, `\`${args[2]}\` does not exist!`)
	}
}
//
//Checks if player has the currency they are using to discover
function Discover_PlayerHasCurrency(message, args) {
	var _account = 'a' + message.author.id
	var _exists1 = false
	
	//let sql1 = 'SELECT * FROM CurrencyEntry WHERE account_id= ? AND currency_id= ? '
	let sql1 = 'SELECT c.value,c.used,a.account_id,a.currency_id,a.amount FROM CurrencyEntry a, Currencies c WHERE currency_id=name AND account_id= ? AND currency_id= ? '
	
	db.each(sql1, [_account, args[2]], (err, rows) => {
		if (typeof rows !== 'undefined') {
			_exists1 = true
			args[4] = rows.amount
			args[5] = rows.value
			args[6] = rows.used
		}
		
	}, function (err, rows) {
		if (_exists1) {
			if (args[4] < args[3])
				Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, 'You do not have enough `' + args[2] + '` in your account to perform this trade!\n**You have: ' + args[4] + '**')
			else if (args[6] >= 5)
				Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, `This currency has been used the maximum amount of times already to discover a new currency!`)
			else
				Discover_ForReal(message, args)
		}
		else
			Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, 'You do not have any `' + args[2] + '` in your account!')
			
	});
}
//
//Calculates value of new currency based on input trade value
//Giant-ass equation to model the exponential curve for skew point cost increase
// -1/x-20000 * 0.005x^3 + 0.1x
async function Discover_ForReal(message, args) {
	_amount = new Decimal(args[3]).times(args[5]).sub(250)
	if (_amount.lessThan(0)) {
		//if input trade value is less than 250, do not process the rest and send back error
		_amount = new Decimal(args[3]).times(args[5])
		return Embed_CurrencyHelp(message, `discover ${args[1]} ${args[2]} ${args[3]}`, `Trade value minimum is 250.\n**You supplied: ${_amount}**\nSee \`$currency discover\` for help pertaining to currency discovery`)
	}
	_pointBuy = new Decimal(0)
	_total = new Decimal(250)
	zeroOne = new Decimal(0.1)
	_int = 0
	let _skew = 0.000
	
	while (_amount.greaterThan(0) && isFinite(_amount)) {
		_pointBuy = Decimal(-1).dividedBy(_int - 20000).times(0.005).times(_int*_int*_int).plus(zeroOne.times(_int))
		_amount = _amount.sub(_pointBuy)
		_skew += 0.001
		_int += 1
		_total = _total.plus(_pointBuy)
	}

	_skew = (_skew).toFixed(3)
	
	//This part creates the new currency
	var _account = 'a'+message.author.id
	var _value = randn_bm(1, 1000000, 20 - _skew)
	await new Promise(resolve => setTimeout(resolve, 200));
	
	let sql0 = 'INSERT INTO Currencies (name, value, owner_id, tax) VALUES( ? , ? , ? ,0.01)'
	db.run(sql0, [args[1], _value, _account], () =>{}, function (err, rows) {
		Embed_Discovery(message, args, _value)
		Discovery_RemoveFromBalance(message, args)
	});
}
//
//Remove amount traded from users's account
function Discovery_RemoveFromBalance(message, args) {
	var _account = 'a' + message.author.id
	let sql1 = 'UPDATE CurrencyEntry SET amount = amount - ? WHERE account_id= ? AND currency_id= ?'
	let sql2 = 'INSERT INTO CurrencyEntry VALUES( ? , ? , ? )'
	
	db.run(sql1, [args[3], _account, args[2]], () => {}, function (){
		//If a currency entry drops to 0, set account ID to 0 so it doesn't show up in a players $account
		db.run('UPDATE CurrencyEntry SET account_id = 0 WHERE amount = 0')
		//this deletes duplicate entries in CurrencyEntry table
		.run('DELETE FROM CurrencyEntry WHERE rowid not in (SELECT min(rowid) FROM CurrencyEntry GROUP BY account_id, currency_id)');
	}).run(sql2, [_account, args[1], 1]);
	
	//increment currency used stat by 1
	//A currency can be used max 5 times to discover other currencies
	db.run(`UPDATE Currencies SET used = used + 1 WHERE name = ?`, args[2])
	
}
//Discovery Message
function Embed_Discovery(message, args, _value){
	_math = new Decimal(args[3]).times(args[5])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$currency discover ${args[1]} ${args[2]} ${args[3]}`)
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: `YOU'VE DISCOVERED A NEW CURRENCY`, value: `**NAME:** \`${args[1]}\` \n**VALUE:** ${_value}\n**TAX:** 0.01% \n\n Your account has been credited with 1 for its discovery!`},
		{ name: `DISCOVERY STATS`, value: `**Currency Used:** \`${args[2]}\` \n**Amount Exchanged:** ${args[3]} \n**Trade Value:** ${_math}`},
	)

	message.channel.send(Embed)
}


//
//Set tax on specified currency, if player owns it
async function SetCurrencyTax(message, args) {
	if (await DoesExist(args[1])) {
		_account = 'a'+message.author.id
		let sql1 = `SELECT * FROM Currencies WHERE name = ?`
		let sql2 = `UPDATE Currencies SET tax = ? WHERE name = ?`
		
		db.each(sql1, args[1], (err, row) => {
			args[3] = row.tax
			if (row.owner_id == _account) {
				db.run(sql2, [args[2], args[1]])
				Embed_Tax(message, args)
			}
			else
				Embed_CurrencyHelp(message, `tax ${args[1]} ${args[2]}`, `You do not own this currency!`)
				
		})
	}
	else
		Embed_CurrencyHelp(message, `tax ${args[1]} ${args[2]}`, `\`${args[1]}\` does not exist!`)
}
//Tax Message
function Embed_Tax(message, args) {

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$currency tax ${args[1]} ${args[2]}`)
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: `By the authority invested in me, the tax % has been changed!`, value: `**CURRENCY:** \`${args[1]}\` \n**NEW TAX:** ${args[2]}% \n**OLD TAX:** ${args[3]}%`},
	)

	message.channel.send(Embed)
}




////////////
////////////
//
//SHARED FUNCTIONS
//

//Check if currency exists
async function DoesExist(currency) {
	var _exists = false
	var i = 0;
	let sql1 = 'SELECT 1 FROM Currencies WHERE name= ? '
	
	db.each(sql1, currency, (err, rows) => {
		if (rows !== null)
			_exists = true
	});	
	
	await new Promise(resolve => setTimeout(resolve, 10));
	return _exists
}

//Exponent Notation
function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}

//RNG
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


//Embed help message
function Embed_CurrencyHelp(message, args, output){

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$currency ${args}`)
	.setDescription(`requested by ${message.author}\nAlso see \`$help currency\``)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: output},
	)

	message.channel.send(Embed);
}
//Embed DISCOVER help message
function Embed_DiscoverHelp(message){
	var helptext = `Discovery is how new currencies are brought into the market. A new currency will have a randomly assigned value, based on the trade value initially used to discover it. A high trade value input into the discovery process will increase the chances of obtaining a more valuable currency.`
	
	var helptext2 = `A currency can be used a maximum 5 times to discover new currencies.
	
	To discover a new currency, you must input a trade value of at least 250x💰. Trade value can be calculated from the value of the currency, multiplied by the amount being traded.
	
	**__EXAMPLE:__**
	\`$currency discover newcurrency money 250\`
	This will attempt to discover a new currency with the name \`newcurrency\`. The trade value is the value of \`money\` multiplied by the amount [250]. \`money\` is worth 1x💰, so this total value is 250
	
	\`$currency discover lobster cocoa 9000\`
	In this example, \`cocoa\` exists and has a value of 2000x💰. The trade value here is now 2000*9000, giving us 18000000, significantly increasing chances of \`lobster\` having a high value.`
	
	var helptext3 = `The random number generator for value picks numbers between 1 and 1,000,000, but is heavily skewed towards 1 at the start. The skew has a base of 20 points. the higher this number is, the more heavily it leans towards the minimum (1). The skew can be decreased by supplying a high trade value when you discover the currency. The higher the trade value is, the more the skew points are decreased. The cost of decreasing the skew is exponential, meaning each point costs more than the previous one.`


	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle(`$currency discover [WIP - SUBJECT TO CHANGE]`)
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: '**__Help__**', value: helptext},
		{ name: '**__How It Works__**', value: helptext2},
		{ name: '**__Statistics__**', value: helptext3},
	)

	message.channel.send(Embed);
}