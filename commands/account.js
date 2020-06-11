module.exports = {
	name: 'account',
	description: 'Gets account info for user.',
	aliases: ['a', 'acc'],
	usage: '[details] or [balance [page number]] or [currencyowned [page number]]',
	details: `\`$account details\`
		Lists summary of account, with items such as Total Worth and # of currencies owned.
		
		\`$account balance [page number]\`
		Lists balance of every currency you currently have, sorted by most valuable.
		
		\`$account currencyowned [page number]\`
		Similar to $currency, but only lists currencies that you own.`,
	execute(message, args) {
		Start(message, args)
	},
};

const Discord = require('discord.js');
var pad = require('pad-right');

//
//SQL
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./currencybot.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('ACCOUNT - Connected to CurrencyBot database');
});


//filters input
function Start(message, args){
	if (!args.length)
		args[0] = 'balance'
	
	if (typeof args[1] == 'undefined')
		args[1] = 1
	else if (isNaN(args[1]) || !isFinite(args[1]) || args[1] < 1)
		return message.channel.send('Page number entered was not valid.')
	
	
	if (args[0] == 'details' || args[0] == 'd')
		Account(message)
	else if (args[0] == 'balance' || args[0] == 'b')
		GetBalance(message, args)
	else if (args[0] == 'currencyowned' || args[0] == 'co')
		OwnedCurrencies(message, args)
	else
		message.channel.send("argument `" + args[0] + "` not recognized.")
}

//
//Gets details of a user's account
async function Account(message){
	var _account = 'a'+message.author.id
	
	var _currenciesowned
	var _totalworth
	var _created
	var _currencies = ''
	
	let sql1 = 'SELECT SUM(a.amount*c.value) as total FROM CurrencyEntry a, Currencies c WHERE c.name=a.currency_id AND account_id = ?'
	let sql2 = 'SELECT COUNT(*) as count FROM Currencies WHERE owner_id = ?'
	let sql3 = 'SELECT created_date FROM Accounts WHERE account_id = ?'
	let sql4 = 'SELECT name FROM Currencies WHERE owner_id = ? ORDER BY name'
	
	db.each(sql1, _account, (err, row) => {
		_totalworth = row.total
	})
	db.each(sql2, _account, (err, row) => {
		_currenciesowned = row.count
	})
	db.each(sql3, _account, (err, row) => {
		_created = row.created_date
	})
	db.each(sql4, _account, (err, row) => {
		_currencies += `\`${row.name}\`, `
	})
	await new Promise(resolve => setTimeout(resolve, 50));
	Embed_AccountDetails(message, [`${_currenciesowned} \n ${_currencies}`, _totalworth, _created])
}
//
//Sends message containing account details obtained above
function Embed_AccountDetails(message, args){

	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('$account details')
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'DETAILS', value: `**USER:** ${message.author}\n**DATE JOINED:** ${args[2]}\n\n**NET WORTH:** ${args[1]}💰\n**CURRENCIES OWNED:** ${args[0]}`},
	)

	message.channel.send(Embed);
}


//
//Gets users balance of all currencies
async function GetBalance(message, args){
	await new Promise(resolve => setTimeout(resolve, 50));
	var _account = 'a' + message.author.id
	var _balance = []
	var _totalconverted = parseFloat(0)
	let sql = 'SELECT c.name,c.value,c.owner_id,c.tax,CAST(SUM(a.amount) as TEXT) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name AND a.account_id= ? Group BY a.currency_id ORDER BY c.value DESC'
	
	db.each(sql, _account, (err, row) => {
		_totalconverted += row.value * row.amount
		_temp = row.name.toString();
		_expNotation = row.value
		_expNotation2 = row.amount
		//shorten string if digits are too long
		if (row.value.toString().length > 20) {
			_expNotation = ExponentNotation(row.value, 15);
		}
		if (row.amount.toString().length > 20) {
			_expNotation2 = ExponentNotation(row.amount, 15);
		}
		_balance.push('**' + _temp + '**\n`[' + pad(_expNotation + '', 20, ' ') + 'x💰]..' + pad(_expNotation2 + '', 20, ' ') + '`\n')
	}, function() {
		message.channel.send(Embed_AccountBalance(message, _balance, _totalconverted, args));
	});
}
//
//Sends message containing current account balances
function Embed_AccountBalance(message, _balance, _total, args){
	var _pages = Math.ceil(_balance.length/10)
	var _output = []
	
	for (i = 10*(args[1]-1); i < 10*args[1]; i++)
		_output.push(_balance[i])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('$account balance')
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'BALANCE', value: '```\nNAME\nVALUE                 AMOUNT\n```' + _output.join('')},
		{ name: 'Total Balance Converted', value: '**' + _total + "** 💰"},
	)
	.setFooter('PAGE ' + args[1] + ' of ' + _pages);

	return Embed;
}


//
//Gets owned currencies
function OwnedCurrencies(message, args){
	var _account = 'a'+message.author.id
	var _balance = []
	let sql = 'SELECT c.name,c.value,CAST(SUM(a.amount) as TEXT) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name AND c.owner_id = ? Group BY a.currency_id ORDER BY c.value DESC'
	
	db.each(sql, _account, (err, row) => {
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
		message.channel.send(Embed_OwnedCurrencies(message, _balance, args));
	});
}
//
//Sends message containing owned currencies
function Embed_OwnedCurrencies(message, _balance, args){
	var _pages = Math.ceil(_balance.length/10)
	var _output = []
	
	for (i = 10*(args[1]-1); i < 10*args[1]; i++)
		_output.push(_balance[i])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('$account currencyowned')
	.setDescription(`requested by ${message.author}`)
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'OWNED CURRENCIES', value: '```\nNAME\nVALUE                  EXISTING\n```' + _output.join('')},
	)
	.setFooter('PAGE ' + args[1] + ' of ' + _pages);

	return Embed;
}




function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}