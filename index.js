const Discord = require('discord.js');
const { token } = require('./config.json');
const countEmojis = require('./countEmojis');

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
	
	countEmojis(client, message.guild, {
		ignoreRepeats: args.includes('norepeats')
	})
		.then(results => {
			let output = results.counts.map((count, emojiID) => {
				let emoji = message.guild.emojis.get(emojiID);
				return `${emoji.toString()} \`:${emoji.name}:\` ${count} uses`;
			});
			
			output.push(`\n_${results.channelsAudited} channel(s) audited. ${results.channelsBlocked > 0 ? `Insufficient permissions for ${results.channelsBlocked} other(s).` : ''}_`);
			
			const auditTime = Number(process.hrtime.bigint() - auditStartTime);
			console.log(`Finished audit in ${(auditTime/1000000000).toFixed(3)} seconds`);
			
			message.channel.send(output.join('\n'), {split: true})
				.catch(err => console.log(err.message));
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
