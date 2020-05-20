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
//Command processing
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}
client.on('message', message => {
	//ignore anything that doesn't start with '!' and is written by a bot
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	
	const args = message.content.slice(prefix.length).split(' ');
	const command = args.shift().toLowerCase();
	
	try {
		client.commands.get(command).execute(message, args, client);
	} catch (error) {
		console.error(error);
}
});


////////////////////////
////////////////////////
////////////////////////



function Random(){
	return Math.floor(Math.random() * (10000));
}