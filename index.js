const Discord = require('discord.js');
const countEmojis = require('./countEmojis');

// Get the login token
const token = require('./config.json').token || process.env.TOKEN;
if (!token) {
	console.error('No token was provided.');
	process.exit(1);
}

const client = new Discord.Client();
client.login(token)
	.catch(err => {
		console.error(err.message);
		process.exit(1);
	});

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
	const args = message.content.slice(botMention.length).trim().toLowerCase().split(/ +/);
	
	console.log(`Invoked by ${message.author} on server "${message.guild.name}"`);
	
	let activatedMessage = message.channel.send('Server Emoji audit in progress...');
	const auditStartTime = process.hrtime.bigint();
	
	countEmojis(client, message.guild, {
		ignoreRepeats: args.includes('norepeats'),
		sortResults: args.includes('sorted') ? 'uses' : undefined
	})
		.then(results => {
			// Calculate the time taken by the operation (converted to seconds)
			const auditTime = Number(process.hrtime.bigint() - auditStartTime) / 1000000000;
			console.log(`Finished audit in ${auditTime.toFixed(3)} seconds`);
			
			let output = results.counts.map((count, emojiID) => {
				let emoji = message.guild.emojis.get(emojiID);
				return `${emoji.toString()} \`:${emoji.name}:\` ${count} uses`;
			});
			
			let summaryMessage = `${results.channelsAudited} channel(s) audited in ${auditTime.toFixed(0)} seconds.`;
			if (results.channelsBlocked > 0) summaryMessage += ` Insufficient permissions for ${results.channelsBlocked} other(s).`;
			output.push(`\n_${summaryMessage}_`);
			
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
