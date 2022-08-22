const { Collection } = require('discord.js');
const { getFiles } = require('../utils/functions');

module.exports = async client => {
   // const buttonsArr = [];
   client.buttons = new Collection();

   const buttons = getFiles('./buttons', '.js');

   if (buttons.length === 0) throw 'No buttons provided';

   buttons.forEach(button => {
      const buttonFile = require(`../buttons/${button}`);

      if (buttonFile.id) {
         client.buttons.set(buttonFile.id, buttonFile);
      } else {
         throw new TypeError(
            `The event: ${buttonFile} failed to load because it doesn't have an ID property`
         );
      }
   });
};