const { MessageEmbed, MessageAttachment } = require('discord.js');
const long = new MessageAttachment('./img/long.png');
const short = new MessageAttachment('./img/short.png');

module.exports = class DiscordBot {
	constructor(channel, systemUtil, logger) {
		this.channel = channel;
		this.systemUtil = systemUtil;
		this.logger = logger;
	}

	send(message, messageInfo) {
		const color = messageInfo.signal === 'long' ? '#62d2a2' : '#ff6464';
		const url = messageInfo.signal === 'long' ? 'attachment://long.png' : 'attachment://short.png';
		const pos = messageInfo.signal === 'long' ? long : short;

		const sendEmbed = new MessageEmbed()
			.setColor(color)
			.setAuthor({ name: `${messageInfo.strategyKey}(${messageInfo.period})`, iconURL: '', url: '' })
			.setTitle(`${messageInfo.symbol}`)
			// .setDescription(`price ${messageInfo.price}`)
			.setThumbnail(url)
			.setTimestamp()
			.setFooter({ text: 'date', iconURL: '' });
		this.channel.then((channel) => {
			channel.send({ embeds: [sendEmbed], files: [pos] })
		})
	}
};
