//required dependencies
const Discord = require('discord.js');
const config = require('./auth.json');
var fs = require('fs'); 

//import commands
const client = new Discord.Client();
client.commands = new Discord.Collection();

//
//adjustable prefix
var prefix = "$";

//
//Client auth
client.once('ready', () => {
	console.log('Ready!');
});
client.login(config.token);

client.on("ready", () => {
    client.user.setActivity("you", { type: "WATCHING"})
})

//
//SQL
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./currencybot.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('BOT - Connected to CurrencyBot database');
});

//
//Command processing
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.on('message', message => {
	//ignore anything that doesn't start with the prefix and is written by a bot
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	
	const args = message.content.slice(prefix.length).split(' ');
	const commandName = args.shift().toLowerCase();
	
	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	if (!command) return;
	
	if (command.args && (!args.length || args.length < command.arglength)) {
		let reply = `The bankers look at you sternly for your misuse of that command, ${message.author}!`;
		if (command.usage) 
			reply += `\nThe proper usage is: \`${prefix}${command.name} ${command.usage}\``;
		return message.channel.send(reply);
	}
	
	AccountCheck(message)
	
	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
	}
});


//
//Runs SQL query to determine if the author ID exists in the Accounts database
function AccountCheck(message){
	var _account = message.author.id
	var _exists = false
	let sql = 'SELECT 1 FROM Accounts WHERE account_id=' + _account
	
	db.each(sql, [], (err, rows) => {
		if (rows !== null)
			_exists = true
		
	}, function (err, rows) {
		if (!_exists)
			NewAccount(message)
	});
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
	
	message.channel.send(Embed_NewAccount(_account))
}
//
//Message to display when a new account is created
function Embed_NewAccount(_account){
	
	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('NOTICE')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'New Account Activation', value: 'Welcome <@' + _account + '> to "Currency Of The Masses", where you can trade many useless currencies, for other useless currencies. A new account has been setup for you! 500💰 has been added to your new account as a starting bonus!\nUse `$account` to view your account balance.' },
	)

	return Embed;
}