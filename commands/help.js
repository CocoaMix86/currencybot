const prefix = '$'
const Discord = require('discord.js');

module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	aliases: ['h'],
	usage: '[command name]',
	execute(message, args) {
		
		const data = [];
		const { commands } = message.client;

		if (!args.length) {
			data.push('***I bequeath upon you this knowledge, mortal!***\n**COMMAND LIST:** ');
			data.push('• $' + commands.map(command => command.name).join('\n• $'));
			data.push(`\nUse \`${prefix}help [command name]\` to get info on a specific command.`);

			return message.author.send(data, { split: true })
				.then(() => {
				if (message.channel.type === 'dm') return;
					message.reply('*__A DM was sent to aid you__*');
				})
				.catch(error => {
					message.reply('I cannot DM you. Do you have DMs disabled?');
				});
		}
		
		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply('***You have spoken a wrong command.***');
		}
		
		data.push(`**NAME:** ${prefix}${command.name}`);
		if (command.aliases) data.push(`**ALIASES:** ${command.aliases.join(', ')}`);
		if (command.description) data.push(`**DESCRIPTION:** ${command.description}`);
		if (command.usage) data.push(`**USAGE:** ${prefix}${command.name} ${command.usage}`);
		if (command.details) data.push(`\n**DETAILS:**\n${command.details}`);
		

		message.author.send(Embed_Help(data));

	},
};

function Embed_Help(data){

	const Embed = new Discord.MessageEmbed()
	.setColor('#009900')
	.setTitle('HELP')
	.setThumbnail('https://i.imgur.com/IHAnl9m.png')
	.addFields(
		{ name: 'Command Help', value: data},
	)

	return Embed
}