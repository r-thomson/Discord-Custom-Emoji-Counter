const Discord = require('discord.js');
const { token, messageLimit } = require('./config.json');

const client = new Discord.Client();
client.login(token);

client.on('ready', () => {
	console.log('Bot is now ready...\n');
});

client.on('message', message => {
	// Don't respond to messages from bots (also prevents self recursion)
	if (message.author.bot) return;
	// Require that the bot be used in a server
	if (message.channel.type !== 'text') return;
	
	if (message.content.search(/^good,? +bot.?$/i) === 0) {
		return message.react('❤');
	}
	
	const botMention = `<@${client.user.id}>`;
	if (!message.content.startsWith(botMention)) return;
	
	// Argument parsing
	const args = message.content.slice(botMention.length).trim().split(/ +/);
	
	console.log(`Invoked by ${message.author} on server "${message.guild.name}"`);
	
	let activatedMessage = message.channel.send('Server Emoji audit in progress...');
	const auditStartTime = process.hrtime.bigint();
	
	// Get all of the text channels on the server
	let channels = message.guild.channels.filter(channel => channel.type === 'text');
	
	// Handle channels without view permissions
	let blockedChannels = channels.filter(channel => !channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	channels = channels.filter(channel => channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	
	let emojiCounts = message.guild.emojis;
	emojiCounts.forEach(emoji => emoji.usageCount = 0);
	
	const ignoreRepeats = args.includes('norepeats');
	
	Promise.all(channels.map(channel => {
		let messagesRetreived = 0;
		
		return recursiveEmojiCount();
		
		function recursiveEmojiCount(messagesBefore) {
			return channel.fetchMessages({limit: 100, before: messagesBefore})
				.then(messages => {
					messagesRetreived += messages.size;
					
					messages.forEach(message => {
						// Ignore messages sent by this bot
						if (message.author.id === client.user.id) return;
						
						emojiCounts.forEach(emoji => {
							const regex = new RegExp(emoji.toString(), 'gi');
							const count = (message.content.match(regex) || []).length;
							emoji.usageCount += ignoreRepeats ? count > 0 : count;
						});
					});
					
					if (messages.size < 100 || messagesRetreived >= messageLimit) {
						console.log(`Finished scanning ${messagesRetreived} messages in ${channel.name}.`);
					} else {
						const lastMessage = messages.array().pop();
						return recursiveEmojiCount(lastMessage.id);
					}
				});
		}
	})).then(() => {
		let output = emojiCounts.map(emoji => {
			return `${emoji.toString()} \`:${emoji.name}:\` ${emoji.usageCount} uses`;
		});
		
		output.push(`\n_${channels.size} channel(s) audited. ${blockedChannels.size > 0 ? `Insufficient permissions for ${blockedChannels.size} other(s).` : ''}_`);
		
		const auditTime = Number(process.hrtime.bigint() - auditStartTime);
		console.log(`Finished audit in ${(auditTime/1000000000).toFixed(3)} seconds`);
		
		message.channel.send(output.join('\n'));
		activatedMessage.then(msg => msg.delete()); // to do: handle permissions
	});
});

client.on('error', err => {
	console.log(err.message);
});

process.on('SIGINT', handleShutDown);

function handleShutDown() {
	console.log('\nShutting down...\n');
	client.destroy()
		.then(() => {
			process.exit();
		});
}
