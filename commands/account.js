module.exports = {
	name: 'account',
	description: 'Gets account info of user',
	aliases: ['a', 'acc'],
	execute(message, args) {
		Start(message, args)
	},
};

const Discord = require('discord.js');
var fs = require('fs');
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
		GetBalance(message, [1,"value","desc"])
	//test page number arg
	else if (!isNaN(args[0])) {
		if (args[0] > 100000)
			args[0] = 100000
		else if (args[0] <= 0)
			args[0] = 1
		//test sort value
		args[0] = Math.floor(args[0])
			if (typeof args[1] == 'undefined')
				GetBalance(message,[args[0],"value","desc"])
			else if (args[1] !== 'sort')
				message.channel.send('argument `' + args[1] + '` not recognized. It must be `sort`.')
			else if (args[2] !== 'value' && args[2] !== 'amount' && args[2] !== 'name')
				message.channel.send('`sort` must be `value`, `amount`, or `name`.')
			else if (args[3] !== 'asc' && args[3] !== 'desc')
				message.channel.send('`sort direction` must be `asc` or `desc`.')
			else
				GetBalance(message,[args[0], args[2], args[3]])
		
	}
	else if (args[0] == 'currencyowned' || args[0] == 'co') {}
	else
		message.channel.send("argument `" + args[0] + "` not recognized.")
}

//
//Gets users balance of all currencies
async function GetBalance(message, args){
	var _sort = args[1]
	var _direction = args[2].toUpperCase()
	var _account = message.author.id
	var _balance = []
	var _totalconverted = parseFloat(0)
	let sql = 'SELECT Accounts.account_id, Currencies.name, Currencies.value, CurrencyEntry.amount FROM ((Accounts INNER JOIN CurrencyEntry ON Accounts.account_id=CurrencyEntry.account_id) INNER JOIN Currencies ON CurrencyEntry.currency_id=Currencies.name) WHERE Accounts.account_id = ' + _account + ' ORDER BY ' + _sort + ' ' + _direction
	
	db.all(sql, [], (err, rows) => {
		rows.forEach((row) => {
			_totalconverted += row.value * row.amount
			_temp = row.name.toString();
			_expNotation = row.value
			_expNotation2 = row.amount
			//shorten string if digits are too long
			if (row.value > 999999 || row.value.toString().length > 11) {
				_expNotation = ExponentNotation(row.value, 7);
			}
			if (row.amount > 999999 || row.amount.toString().length > 8) {
				_expNotation2 = ExponentNotation(row.amount, 4);
			}
			_balance.push('**' + _temp + '**\n`[' + pad(_expNotation + '', 12, ' ') + 'x💰]..' + pad(_expNotation2 + '', 11, ' ') + '`\n')
		});
	});
	
	await new Promise(resolve => setTimeout(resolve, 100));
	message.channel.send(Embed_AccountBalance(_balance, _totalconverted, args));
}
//
//Sends message containing current account balances
function Embed_AccountBalance(_balance, _total, args){
	var _pages = Math.ceil(_balance.length/10)
	var _output = []
	
	for (i = 10*(args[0]-1); i < 10*args[0]; i++)
		_output.push(_balance[i])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('ACCOUNT BALANCE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: '```\nNAME\nVALUE           AMOUNT  \n```' + _output.join('')},
		{ name: 'Total Balance Converted', value: '**' + _total + "** 💰"},
	)
	.setFooter('PAGE ' + args[0] + ' of ' + _pages);

	return Embed;
}

//
//Gets owned currencies
function OwnedCurrencies(message, args){
	
}

function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}