const { CommandInteraction } = require('discord.js');
const Logger = require('../../../helpers/logger');
const { authorizeInteraction } = require('../../../helpers/authorization');

const DEFAULT_NOUN_NUMBER = 117;
const DEFAULT_OLD_OWNER_ID = '0x281eC184E704CE57570614C33B3477Ec7Ff07243';
const DEFAULT_NEW_OWNER_ID = '0x281eC184E704CE57570614C33B3477Ec7Ff07243';

module.exports = {
   subCommand: 'nerman-trigger.transfer-noun',

   /**
    * @param {CommandInteraction} interaction
    */
   async execute(interaction) {
      await authorizeInteraction(interaction, 4);

      const oldId =
         interaction.options.getString('from-wallet') ?? DEFAULT_OLD_OWNER_ID;
      const newId =
         interaction.options.getString('to-wallet') ?? DEFAULT_NEW_OWNER_ID;
      const transferNoun =
         interaction.options.getNumber('noun-number') ?? DEFAULT_NOUN_NUMBER;

      const Nouns = interaction.client.libraries.get('Nouns');
      Nouns.trigger('Transfer', {
         tokenId: transferNoun,
         from: { id: oldId },
         to: { id: newId },
      });

      interaction.reply({
         ephemeral: true,
         content: 'Triggered a transfer noun event.',
      });

      Logger.info(
         'commands/trigger/transferNoun.js: A transfer noun event has been triggered.',
         {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            userId: interaction.user.id,
         },
      );
   },
};
