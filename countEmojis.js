const Discord = require('discord.js');
const { messageLimit } = require('./config.json');

/**
 * @returns A promise that resolves to an object.
 * @param client The client for the bot, used for permission checking and to prevent the bot from reading its own messages
 * @param guild The guild object for the server that the count will be performed on
 * @param options An object containing options
 */
module.exports = function(client, guild, options) {
	// Get all of the text channels on the server
	let channels = guild.channels.filter(channel => channel.type === 'text');
	
	// Handle channels without view permissions
	let blockedChannels = channels.filter(channel => !channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	channels = channels.filter(channel => channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	
	let emojiCounts = new Discord.Collection(Array.from(guild.emojis, ([key]) => [key, 0]));
	
	return Promise.all(channels.map(channel => {
		let messagesRetreived = 0;
		
		return recursiveEmojiCount();
		
		async function recursiveEmojiCount(messagesBefore) {
			let messages = await channel.fetchMessages({limit: 100, before: messagesBefore});
			messagesRetreived += messages.size;
			
			messages.forEach(message => {
				// Ignore messages sent by this bot
				if (message.author.id === client.user.id) return;
				
				emojiCounts.forEach((value, key) => {
					let emoji = guild.emojis.get(key);
					const regex = new RegExp(emoji.toString(), 'gi');
					const count = (message.content.match(regex) || []).length;
					value += options.ignoreRepeats ? count > 0 : count;
					emojiCounts.set(key, value);
				});
			});
			
			if (messages.size < 100 || messagesRetreived >= messageLimit) {
				console.log(`Finished scanning ${messagesRetreived} messages in '#${channel.name}'.`);
			} else {
				const lastMessage = messages.array().pop();
				return recursiveEmojiCount(lastMessage.id);
			}
		}
	})).then(() => ({
		channelsAudited: channels.size,
		channelsBlocked: blockedChannels.size,
		counts: emojiCounts
	}));
};
