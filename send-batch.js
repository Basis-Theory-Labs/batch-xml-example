// const { Client } = require('ssh2');
const builder = require('xmlbuilder2');
const { default: pLimit } = require('p-limit');
const { default: chunkify } = require('@sindresorhus/chunkify');

/**
 * Detokenizes a chunk of payments receiver account number
 * in a single list tokens request
 * @param payments
 * @param bt
 * @returns {Promise<*>}
 */
const detokenizeChunk = async (payments, bt) => {
  const tokenIds = payments.reduce((tokenIds, payment) => ([
    ...tokenIds,
    payment.ReceiverAccount.token
  ]), []);

  const { data: tokens } = await bt.tokens.list({
    id: tokenIds
  });

  return payments.map((payment, i) => ({
    ...payment,
    ReceiverAccount: {
      Account: {
        ...payment.ReceiverAccount.Account,
        '@AccountNumber': tokens[i].data.account_number,
        Bank: {
          ...payment.ReceiverAccount.Account.Bank,
          RoutingNumber: tokens[i].data.routing_number
        },
      }
    },
  }));
}

const createBatch = async (File, bt) => {
  // lets run 100 detokenization requests per time
  const limit = pLimit(100);
  // detokenize 10 tokens each request
  const chunks = [...chunkify(File.Payment, 10)];

  const Payment = await Promise.all(chunks.map(chunk => limit( () => detokenizeChunk(chunk, bt))));

  const batch = builder.create({
    File: {
      ...File,
      Payment
    }
  })

  return batch.end();
}

module.exports = async function (req) {
  try {
    const { args: { File }, bt } = req;

    const batch = await createBatch(File, bt);

    // TODO send batch

    return {
      raw: {
        batch,
      }
    }
  } catch (error) {
    return {
      raw: {
        error: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
      }
    }
  }

}