const Chance = require('chance');
const sendBatch = require('./send-batch');

const chance = new Chance();

describe('send-batch', () => {
  let bt;

  beforeEach(() => {
    bt = {
      tokens: {
        list: jest.fn(),
      }
    }
  })

  test('generates batch', async () => {
    const routingNumber = chance.string({numeric: true});
    const accountNumber = chance.string({numeric: true});
    const id = chance.guid();

    bt.tokens.list.mockResolvedValueOnce({
      pagination: {},
      data: [{
        id,
        data: {
          routing_number: routingNumber,
          account_number: accountNumber
        }
      }]
    });

    const {raw: {batch}} = await sendBatch({
      bt,
      args: {
        File: {
          '@PaymentCount': 1,
          '@PaymentTotal': '1000.00',
          Payment: [{
            ReceiverAccount: {
              token: id,
              Account: {
                '@AccountType': 'Checking',
                Bank: {
                  '@Type': 'ABA',
                  '@Name': 'Payee',
                }
              }
            },
            Amount: '1000.00',
            Currency: 'USD',
            Date: '2023-02-06'
          }]
        }
      }
    });

    expect(bt.tokens.list).toHaveBeenCalledWith({id: [id]});
    expect(batch).toStrictEqual(`<?xml version="1.0"?><File PaymentCount="1" PaymentTotal="1000.00"><Payment><ReceiverAccount><Account AccountType="Checking" AccountNumber="${accountNumber}"><Bank Type="ABA" Name="Payee"><RoutingNumber>${routingNumber}</RoutingNumber></Bank></Account></ReceiverAccount><Amount>1000.00</Amount><Currency>USD</Currency><Date>2023-02-06</Date></Payment></File>`);

    console.info(batch)
  })

})