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
		console.log(messageInfo, 'discord');

		const sendEmbed = new MessageEmbed()
			.setColor(color)
			.setAuthor({ name: `${messageInfo.strategyKey}`, iconURL: 'https://i.imgur.com/AfFp7pu.png', url: '' })
			.setTitle(`${messageInfo.symbol}`)
			.setDescription(`${messageInfo.exchange} ${messageInfo.price}`)
			.setThumbnail(url)
			// .addFields(
			// 	{ name: '', value: `${messageInfo.signal}` },
			// 	{ name: '', value: `${messageInfo.exchange} ${messageInfo.price}` },
			// )
			.setTimestamp()
			.setFooter({ text: 'Date', iconURL: '' });
		this.channel.then((channel) => {
			channel.send({ embeds: [sendEmbed], files: [long, short] })
		})
	}
};
