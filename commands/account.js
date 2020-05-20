module.exports = {
	name: 'account',
	description: 'Gets account info of user',
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
		AccountCheck(message, [1,"value","desc"])
	//test page number arg
	else {
		if (isNaN(args[0]))
			message.channel.send('Page number specified was not a number.')
		else if (!isFinite(args[0]))
			message.channel.send('Page number specified was too large.')
		else if (args[0] <= 0)
			message.channel.send('Page number specified cannot be 0 or less.')
		//test sort value
		else {
			args[0] = Math.floor(args[0])
			if (typeof args[1] == 'undefined')
				AccountCheck(message,[args[0],"value","desc"])
			else if (args[1] !== 'sort')
				message.channel.send('argument ' + args[1] + ' not recognized. It should be `sort`.')
			else if (args[2] !== 'value' && args[2] !== 'amount' && args[2] !== 'name')
				message.channel.send('`sort` must be `value`, `amount`, or `name`.')
			else if (args[3] !== 'asc' && args[2] !== 'desc')
				message.channel.send('`sort direction` must be `asc` or `desc`.')
			else
				AccountCheck(message,[args[0], args[2], args[3]])
		}
	}
}


//
//Checks if user exists or not
async function AccountCheck(message, args){
	var _account = message.author.id
	var _exists = false
	let sql = 'SELECT 1 FROM Accounts WHERE account_id=' + _account
	db.each(sql, [], (err, rows) => {
		if (rows !== null)
			_exists = true
	});
	
	await new Promise(resolve => setTimeout(resolve, 10));
	if (_exists)
		GetBalance(message, args)
	else
		NewAccount(message)
}


//
//Add entries to SQL for new account
function NewAccount(message){
	var _account = message.author.id
	let sql = 'INSERT INTO Accounts (account_id, created_date) VALUES(' + _account + ', DATE())'
	let sql2 = 'INSERT INTO CurrencyEntry (account_id, currency_id, amount) VALUES(' + _account + ', "money", 500)'
	
	db.serialize(() => {
		db.run(sql).run(sql2)
	});
	
	message.channel.send(Embed_NewAccount())
}
//
//Message to display when a new account is created
function Embed_NewAccount(){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'New Account Activation', value: 'Welcome new member to "Currency Of The Masses", where you can trade many useless currencies, for other useless currencies. A new account has been setup for you! 500💰 has been added to your new account as a starting bonus!\nUse `$account` to view your account balance.' },
	)

	return Embed;
}



//
//Account Exists
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


function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}