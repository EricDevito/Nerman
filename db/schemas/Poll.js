const mongoose = require('mongoose');
const { model, Schema, Types } = require('mongoose');

// Building Up, start basic
const PollSchema = new Schema(
   {
      _id: Schema.Types.ObjectId,
      guildId: { type: String, required: true },
      creatorId: { type: String, required: true },
      messageId: { type: String, required: true },
      // allowance IMPLEMENT SOON
      // allowanceStrategy: {type: [String]}
      config: {
         type: Schema.Types.ObjectId,
         ref: 'channelConfig',
         required: true,
      },
      timeEnd: { type: Date, default: () => Date.now() + 5 * 60 * 1000 }, // add in default calc for Date.now() + pollDuration value
      pollData: {
         title: {
            type: String,
            required: true,
         },
         description: {
            type: String,
            default: '',
            // required: true,
         },
         voteAllowance: {
            type: Number,
            required: true,
            default: 1,
         },
         choices: {
            // Find a way to add validator for number of array entries
            type: [String],
            required: true,
         },
      },
      votes: [
         {
            type: Schema.Types.ObjectId,
            ref: 'Vote',
            default: () => ({}),
         },
      ],
      abstains: {
         type: Map,
         of: Boolean,
         default: new Map(),
      },
      allowedUsers: {
         type: Map,
         of: Boolean,
      },
      status: {
         type: String,
         default: 'closed',
         enum: ['open', 'closed'],
      },
   },
   {
      timestamps: { createdAt: 'timeCreated', updatedAt: 'modified' },
   }
);

// POPULATE VIRTUALS
// Simply counts to total votes on the Poll so far
PollSchema.virtual('countVoters', {
   ref: 'Vote',
   localField: '_id',
   foreignField: 'poll',
   count: true,
});
// retrieve list of vote choice arrays
PollSchema.virtual('getVotes', {
   ref: 'Vote',
   localField: '_id',
   foreignField: 'poll',
});

// VIRTUALS
PollSchema.virtual('countAbstains').get(function () {
   return this.abstains.size;
});

PollSchema.virtual('participation').get(function () {
   return parseFloat(
      ((this.countVoters / this.allowedUsers.size) * 100).toFixed(2)
   );
});

PollSchema.virtual('results').get(function () {
   const resultsObject = Object.create(null);
   resultsObject.distribution = Object.create(null);
   let len = this.pollData.choices.length;
   const flatVotes = this.getVotes.flatMap(({ choices }) => choices);

   let prevHighest = null;
   let leadingOption = null;
   let tiedLeads = [];

   for (let i = 0; i < len; i++) {
      let key = this.pollData.choices[i];
      let value = flatVotes.filter(choice => choice === key).length;

      // resultsObject[key] = value;
      resultsObject.distribution[key] = value;

      if (this.status === 'closed' && value === prevHighest) {
         // const
         if (!!tiedLeads.length) {
            tiedLeads.push([key, value]);
         } else {
            tiedLeads.push([leadingOption, prevHighest], [key, value]);
            leadingOption = key;
            prevHighest = value;
         }
      }

      if (value > prevHighest) {
         leadingOption = key;
         prevHighest = value;

         // only empty array if the poll is closed, no point calculating ties while it's open?...Shit that might not be true because of the quorum though? We'll see
         this.status === 'closed' && (tiedLeads = []);
      }
   }

   resultsObject.totalVotes = flatVotes.length;

   if (!tiedLeads.length) {
      resultsObject.winner = leadingOption;
   } else {
      resultsObject.tied = tiedLeads;
   }
   return resultsObject;
});


module.exports = model('Poll', PollSchema);
