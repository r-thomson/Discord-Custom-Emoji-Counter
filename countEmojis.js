const Discord = require('discord.js');
const { messageLimit } = require('./config.json');

/**
 * Scan the messages in each of a server's channels and count how many times each of the server's custom emoji has been used.
 * @param {Discord.Client} client - The bot's Client, used for handling permissions and identifying messages sent by the bot.
 * @param {Discord.Guild} guild - The Guild that the audit will be performed on.
 * @param {object} options - An object containing various options that will affect the audit.
 * @param options.ignoreRepeats - If true, only one of each emoji will be counted per message.
 * @param options.countReactions - If true, the count will also include message reactions.
 * @param options.sortResults - Sort the results. `'uses'` will sort from most to least used.
 * @returns A Promise that resolves to an object containing the results of the audit.
 */
module.exports = async function(client, guild, options) {
	// Get all of the text channels on the server
	let channels = guild.channels.filter(channel => channel.type === 'text');
	
	// Handle channels without view permissions
	let blockedChannels = channels.filter(channel => !channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	channels = channels.filter(channel => channel.permissionsFor(client.user).has('VIEW_CHANNEL'));
	
	/** @type {Discord.Collection<string, number>} */
	let emojiCounts = new Discord.Collection(Array.from(guild.emojis, ([key]) => [key, 0]));
	
	await Promise.all(channels.map(channel => {
		let messagesRetreived = 0;
		
		return recursiveEmojiCount();
		
		async function recursiveEmojiCount(messagesBefore) {
			const MAX_FETCH = 100;
			
			let messages = await channel.fetchMessages({limit: MAX_FETCH, before: messagesBefore});
			messagesRetreived += messages.size;
			
			messages.forEach(message => {
				// Ignore messages sent by this bot
				if (message.author.id === client.user.id) return;
				
				emojiCounts.forEach((value, key) => {
					// Get the Emoji object from the emoji's id
					let emoji = guild.emojis.get(key);
					
					const regex = new RegExp(emoji.toString(), 'gi');
					const count = (message.content.match(regex) || []).length;
					
					// Limits the count increase to 1 if the option is set
					value += options.ignoreRepeats ? (count > 0) : count;
					emojiCounts.set(key, value);
				});
				
				if (options.countReactions) {
					// Count each of the message's reactions
					message.reactions.forEach(reaction => {
						let count = emojiCounts.get(reaction.emoji.id);
						if (count !== undefined) {
							emojiCounts.set(reaction.emoji.id, count + 1);
						}
					});
				}
			});
			
			if (messages.size < MAX_FETCH || messagesRetreived >= messageLimit) {
				console.log(`Finished scanning ${messagesRetreived} messages in "#${channel.name}".`);
			} else {
				// Continue scanning messages, starting after the last message scanned
				const lastMessage = messages.array().pop();
				return recursiveEmojiCount(lastMessage.id);
			}
		}
	}));
	
	if (options.sortResults === 'uses') {
		emojiCounts = emojiCounts.sort((usesA, usesB, emojiA, emojiB) => {
			// Get the Emoji objects from their keys
			emojiA = guild.emojis.get(emojiA);
			emojiB = guild.emojis.get(emojiB);
			
			if (usesA !== usesB) { return usesB - usesA; }
			return emojiA.name.localeCompare(emojiB.name);
		});
	}
	
	return {
		channelsAudited: channels.size,
		channelsBlocked: blockedChannels.size,
		counts: emojiCounts
	};
};
