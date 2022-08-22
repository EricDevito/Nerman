const { Modal } = require('discord-modals');
const {
   ButtonInteraction,
   ModalSubmitInteraction,
   MessageEmbed,
} = require('discord.js');
const { Types } = require('mongoose');
const Poll = require('../db/schemas/Poll');
const Vote = require('../db/schemas/Vote');

module.exports = {
   name: 'modalSubmit',
   /**
    * @param {ModalSubmitInteraction} interaction
    */
   async execute(modal) {
      if (modal.customId !== 'vote-modal') return;
      await modal.deferReply({ ephemeral: true });
      // async execute(interaction) {
      // console.log({ modal });

      // return;
      // if (!interaction.isCommand() && customId !== 'vote-modal') return;

      console.log('CUSTOM ID: \n', modal.customId);

      console.log('pollVote.js -- modal', { modal });
      // {
      const {
         client,
         guildId,
         customId,
         channelId,
         member: {
            user: { id: userId },
         },
         message: { id: messageId },
      } = modal;

      const pollStatus = await Poll.findOne(
         { messageId },
         'status pollData.voteAllowance pollData.choices'
      );
      console.log({ pollStatus });

      const voteArray = modal
         .getTextInputValue('votingSelect')
         .split(',')
         .map(x => x.trim())
         .filter(v => v !== '');

      console.log({ voteArray });

      // disabled until DJS SELECT MENUS Modal supported
      // const voteArray = modal.getSelectMenuValues('votingSelect');
      const voteReason = modal.getTextInputValue('votingReason');

      if (pollStatus.status === 'closed') {
         return modal.editReply({
            content: 'Unable to register your vote, this poll has closed.',
            ephermeral: true,
         });
      }

      //todo include an evaluation for choosing the same option twice
      if (pollStatus.pollData.voteAllowance !== voteArray.length) {
         return modal.editReply({
            content: `You need to choose ${pollStatus.pollData.voteAllowance} option(s)`,
            ephermeral: true,
         });
      }

      const userVote = await Vote.create({
         _id: new Types.ObjectId(),
         // poll: targetPoll._id,
         poll: pollStatus._id,
         user: userId,
         choices: voteArray,
         reason: voteReason || undefined,
      });

      // await targetPoll.allowedUsers.set(userId, true);

      const updatedPoll = await Poll.findOneAndUpdate(
         { messageId },
         { $set: { [`allowedUsers.${userId}`]: true } },
         { new: true }
      ).populate([
         // { path: 'results' },
         { path: 'countVoters' },
         { path: 'getVotes', select: 'choices -poll -_id' },
      ]);

      let message = await client.channels.cache
         .get(channelId)
         .messages.fetch(messageId);

      const updateEmbed = new MessageEmbed(message.embeds[0]);

      updateEmbed.spliceFields(
         updateEmbed.fields.findIndex(({ name }) => name === 'Voters'),
         1,
         {
            name: 'Voters',
            value: `${updatedPoll.countVoters}`,
            inline: true,
         }
      );

      message.edit({ embeds: [updateEmbed] });

      // await targetPoll
      //    .save()
      //    .then(savedDoc => {
      //       console.log('targetPoll === savedDoc', targetPoll === savedDoc);
      //       console.log({ savedDoc });
      //       console.log('savedDoc.allowedUsers', savedDoc.allowedUsers);
      //    })
      //    .catch(err => console.error(err));
      // await targetPoll
      //    .save()
      //    .then(savedDoc => {
      //       console.log('targetPoll === savedDoc', targetPoll === savedDoc);
      //       console.log({ savedDoc });
      //       console.log('savedDoc.allowedUsers', savedDoc.allowedUsers);
      //    })
      //    .catch(err => console.error(err));

      // console.log('pollVote.js -- modal', { modal });
      console.log('pollVote.js -- userVote', { userVote });

      return modal.editReply({
         content: 'Your vote has been submitted',
         ephemeral: true,
      });
   },
};