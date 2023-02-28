const { Modal } = require('discord-modals');
const {
   ButtonInteraction,
   ModalSubmitInteraction,
   MessageEmbed,
} = require('discord.js');
const { userMention, inlineCode, hyperlink } = require('@discordjs/builders');

const { Types } = require('mongoose');
const Poll = require('../../db/schemas/Poll');
const User = require('../../db/schemas/User');
const Vote = require('../../db/schemas/Vote');

const nouncilId = process.env.TESTNERMAN_NOUNCIL_CHAN_ID;
const jtsNouncilId = process.env.JTS_NOUNCIL_ID;
const doppelId = process.env.DEVNERMAN_NOUNCIL_CHAN_ID;

const guildNouncilIds = [nouncilId, jtsNouncilId, doppelId];

const { log: l, error: lerr } = console;

module.exports = {
   name: 'modalSubmit',
   /**
    * @param {ModalSubmitInteraction} interaction
    */
   async execute(modal) {
      if (modal.customId !== 'vote-modal') return;

      await modal.deferReply({ ephemeral: true });

      console.log('CUSTOM ID: \n', modal.customId);

      console.log('pollVote.js -- modal', { modal });
      // {
      const {
         client,
         guildId,
         customId,
         channelId,
         member: {
            roles: { cache: memberRoleCache },
            user: { id: userId },
         },
         message: { id: messageId },
      } = modal;

      const propRegExp = new RegExp(/^prop\s(\d{1,5})/, 'i');

      const pollStatus = await Poll.findOne(
         { messageId },
         'status pollData.voteAllowance pollData.choices config'
      ).exec();

      const pollOptions = await pollStatus.pollOptions();

      !pollOptions.anonymous && console.log({ modal });
      console.log({ pollStatus });
      console.log({ pollOptions });

      let voteArray = modal.getTextInputValue('votingSelect');

      if (voteArray !== null) {
         voteArray = voteArray
            .split(',')
            .map(x => x.trim().toLowerCase())
            .filter(v => v !== '');
      } else {
         return modal.editReply({
            content:
               'Make sure that you submit a vote, an empty string is not sufficient.',
            ephermeral: true,
         });
      }

      let incorrectOptions = voteArray.filter(
         vote => !pollStatus.pollData.choices.includes(vote)
      );

      console.log({ incorrectOptions });

      if (incorrectOptions.length) {
         return modal.editReply({
            content: `Invalid choice(s):\n\n${incorrectOptions.join(
               ' '
            )}\n\nPlease check you spelling when selecting your options.`,
            ephermeral: true,
         });
      }

      console.log('voteArray.length', voteArray.length);
      console.log(
         'pollStatus.pollData.voteAllowance',
         pollStatus.pollData.voteAllowance
      );

      if (voteArray.length !== pollStatus.pollData.voteAllowance) {
         return modal.editReply({
            content: `You are required to select ${pollStatus.pollData.voteAllowance} choice(s)`,
            ephermeral: true,
         });
      }

      // disabled until DJS SELECT MENUS Modal supported
      // const voteArray = modal.getSelectMenuValues('votingSelect');
      const voteReason = modal.getTextInputValue('voteReason');

      console.log({ voteReason });

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
         // user: pollOptions.anonymous ? undefined : userId,
         user:
            !guildNouncilIds.includes(channelId) && pollOptions.anonymous
               ? undefined
               : userId,
         choices: voteArray,
         reason: voteReason || undefined,
      });

      // await targetPoll.allowedUsers.set(userId, true);

      let votingUser = await User.findOne().byDiscordId(userId, guildId).exec();

      if (!votingUser) {
         l(
            '/////////////// !votingUser ///////////////\nGetting eligibleChannels...'
         );
         const eligibleChannels = await User.findEligibleChannels(
            memberRoleCache, pollOptions.anonymous
         );

        !pollOptions.anonymous && l({ eligibleChannels });

         votingUser = await User.createUser(guildId, userId, eligibleChannels);
      }

      const updatedPoll = await Poll.findAndSetVoted(messageId, userId);

      console.log({ channelId });
      !pollOptions.anonymous && console.log('votingUser => ', { votingUser });

      votingUser.incParticipation(channelId);

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

      l({ propRegExp });
      l(updatedPoll.pollData.title);

      if (propRegExp.test(updatedPoll.pollData.title)) {
         try {
            const matches = updatedPoll.pollData.title.match(propRegExp);

            l({ matches });
            l(matches[0]);
            l(matches[1]);

            const propText = matches[0];
            const propId = matches[1];

            l({ propText });
            l({ propId });

            const threadEmbed = new MessageEmbed()
               .setColor('#00FFFF')
               .setDescription(
                  `${
                     guildNouncilIds.includes(channelId)
                        ? 'Anon Nouncillor'
                        : !pollOptions.anonymous
                        ? userMention(userId)
                        : 'Anon'
                  } voted ${inlineCode(voteArray.join(' '))} on ${hyperlink(
                     propText,
                     `https://nouns.wtf/vote/${propId}`
                  )}.${!!voteReason ? `\n\n${voteReason.trim()}` : ``}`
               );
            // .setDescription(
            //    `${
            //       !pollOptions.anonymous
            //          ? userMention(userId)
            //          : !guildNouncilIds.includes(channelId)
            //          ? 'Anon'
            //          : 'Anon Nouncillor'
            //    } voted ${inlineCode(voteArray.join(' '))} on ${hyperlink(
            //       propText,
            //       `https://nouns.wtf/vote/${propId}`
            //    )}.${!!voteReason ? `\n\n${voteReason.trim()}` : ``}`
            // );
            // .setDescription(
            //    `Anon Nouncillor voted ${inlineCode(
            //       voteArray.join(' ')
            //    )} on ${hyperlink(
            //       propText,
            //       `https://nouns.wtf/vote/${propId}`
            //    )}.${!!voteReason ? `\n\n${voteReason.trim()}` : ``}`
            // );

            l({ threadEmbed });

            const thread = await message.thread.fetch();
            // await message.thread.fetch();
            await thread.send({ embeds: [threadEmbed] });
         } catch (error) {
            l({ error });
         }
      } else {
         try {
            // if (!guildNouncilIds.includes(channelId)) {
            //    const threadEmbed = new MessageEmbed()
            //       .setColor('#00FFFF')
            //       .setDescription(
            //          `${
            //             guildNouncilIds.includes(channelId)
            //                ? 'Anon Nouncillor'
            //                : !pollOptions.anonymous
            //                ? userMention(userId)
            //                : 'Anon'
            //          } voted ${inlineCode(voteArray.join(' '))}.${
            //             !!voteReason ? `\n\n${voteReason.trim()}` : ``
            //          }`
            //       );
            //    // .setDescription(
            //    //    `${
            //    //       !pollOptions.anonymous
            //    //          ? userMention(userId)
            //    //          : !guildNouncilIds.includes(channelId)
            //    //          ? 'Anon'
            //    //          : 'Anon Nouncillor'
            //    //    } voted ${inlineCode(voteArray.join(' '))}.${!!voteReason ? `\n\n${voteReason.trim()}` : ``}`
            //    // );
            // }
            const threadEmbed = new MessageEmbed()
               .setColor('#00FFFF')
               .setDescription(
                  `${
                     guildNouncilIds.includes(channelId)
                        ? 'Anon Nouncillor'
                        : !pollOptions.anonymous
                        ? userMention(userId)
                        : 'Anon'
                  } voted ${inlineCode(voteArray.join(' '))}.${
                     !!voteReason ? `\n\n${voteReason.trim()}` : ``
                  }`
               );
            //    .setDescription(
            //       `${
            //          !pollOptions.anonymous
            //             ? userMention(userId)
            //             : !guildNouncilIds.includes(channelId)
            //             ? 'Anon'
            //             : 'Anon Nouncillor'
            //       } voted ${inlineCode(voteArray.join(' '))}.${
            //          !!voteReason ? `\n\n${voteReason.trim()}` : ``
            //       }`
            // );
            //    .setDescription(
            //       `Anon Nouncillor voted ${inlineCode(voteArray.join(' '))}.${
            //          !!voteReason ? `\n\n${voteReason.trim()}` : ``
            //       }`
            // );
            // .setDescription(
            //    `${
            //       pollOptions.anonymous
            //          ? 'Anon Nouncillor'
            //          : userMention(userId)
            //    } voted ${inlineCode(voteArray.join(' '))} on ${hyperlink(
            //       propText,
            //       `https://nouns.wtf/vote/${propId}`
            //    )}.${!!voteReason ? `\n\n${voteReason.trim()}` : ``}`
            // );

            l({ threadEmbed });

            const thread = await message.thread.fetch();
            // await message.thread.fetch();
            await thread.send({ embeds: [threadEmbed] });
         } catch (error) {
            l({ error });
         }
      }

      console.log('pollVote.js -- userVote', { userVote });

      return modal.editReply({
         content: 'Your vote has been submitted',
         ephemeral: true,
      });
   },
};
