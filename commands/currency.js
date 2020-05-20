module.exports = {
	name: 'currency',
	description: 'gets info about different currencies',
	execute(message, args, client) {
		_client = client
		Start(message, args);
	},
};

const Discord = require('discord.js');
const client = new Discord.Client();
var fs = require('fs');
var pad = require('pad-right');
var _client

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
	//if no arguements, default page to 1
	if (!args.length)
		GetCurrencies(message, [1])
	else if (args[0] == 'view') {
		if (typeof args[1] == 'undefined')
			message.channel.send('A currency was not specified to view')
		else
			ViewCurrency(message, args)
	}
	else {
		if (isNaN(args[0]))
			message.channel.send('Page number specified was not a number.')
		else if (!isFinite(args[0]))
			message.channel.send('Page number specified was too large.')
		else if (args[0] <= 0)
			message.channel.send('Page number specified cannot be 0 or less.')
		else {
			args[0] = Math.floor(args[0])
			GetCurrencies(message, args)
		}
	}
}

//
//Account Exists
async function GetCurrencies(message, args){
	var _balance = []
	let sql = 'SELECT c.name,c.value,SUM(a.amount) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name Group BY a.currency_id ORDER BY c.value DESC'
	
	db.all(sql, [], (err, rows) => {
		rows.forEach((row) => {
			_temp = row.name.toString()
			_expNotation = row.value
			_expNotation2 = row.amount
			if (row.value > 999999 || row.value.toString().length > 11) {
				_expNotation = ExponentNotation(row.value, 7);
			}
			if (row.amount > 999999 || row.amount.toString().length > 8) {
				_expNotation2 = ExponentNotation(row.amount, 4);
			}
			_balance.push("**" + _temp + '**\n`[' + pad(_expNotation + '', 12, ' ') + 'x💰] - ' + pad(_expNotation2 + '', 11, ' ') + '`\n')
		});
	});
	
	await new Promise(resolve => setTimeout(resolve, 100));
	message.channel.send(Embed_Currencies(_balance, args));
}
//
//Sends message containing current account balances
function Embed_Currencies(_balance, args){
	var _pages = Math.ceil(_balance.length/10)
	var _output = []
	
	for (i = 10*(args[0]-1); i < 10*args[0]; i++)
		_output.push(_balance[i])
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('CURRENCIES IN CIRCULATION')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: '```\nNAME\nVALUE            EXISTING\n```' + _output.join('')},
	)
	.setFooter('PAGE ' + args[0] + ' of ' + _pages);

	return Embed;
}

function ViewCurrency(message, args){
	var _output = ''
	var _exists = false
	let sql1 = 'SELECT 1 FROM Currencies WHERE name=\'' + args[1] + '\''
	let sql2 = 'SELECT c.name,c.value,CAST(c.owner_id AS TEXT) as owner_id,CAST(SUM(a.amount) as TEXT) as amount FROM CurrencyEntry a, Currencies c WHERE a.currency_id=c.name AND c.name="' + args[1] + '" Group BY a.currency_id ORDER BY c.value DESC'
	
	db.each(sql1, [], (err, rows) => {
		if (rows !== null)
			_exists = true
		
	}, function (err, rows) {
		//if exists, get data of currency and output message to channel
		if (_exists) {
			db.each(sql2, [], (err, row) => {
				_output = '**NAME:** ' + row.name + "\n**VALUE:** " + row.value + "x💰\n**EXISTING:** " + row.amount + '\n**OWNER:** <@' + row.owner_id + '>'
			}, function (err, row){
				message.channel.send(Embed_View(message, _output))
			});
		}
		else
			message.channel.send(args[1] + " is not a valid currency.")
	});
	
	
}
function Embed_View(message, args){

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('CURRENCY DETAILS')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Statement', value: args},
	)

	return Embed;
}


//Exponent Notation
function ExponentNotation(x, f) {
	return Number.parseFloat(x).toExponential(f);
}