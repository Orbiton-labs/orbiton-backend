import { Jetton } from '../../src/models';
//@ts-ignore
import { mock, jest } from 'bun:test';

mock.module('../../src/mappings/utils/ton', () => {
  const funcs = require('../../src/mappings/utils/ton');
  return {
    ...funcs,
    getTonPrice: jest.fn().mockReturnValue(2),
    findTonPerJetton: jest.fn().mockImplementation((jetton: Jetton) => {
      switch (jetton.id) {
        case 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs':
          return '0.5';
        case 'EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo':
          return '0.01';
      }
    }),
  };
});

mock.module('@src/services/ton-client', () => {
  return {
    tonClient: {
      open: () => ({
        getFeesGrowthGlobalAtTick: jest.fn(() => ['10000', '20000']),
        getFeesGrowthGlobal: jest.fn(() => ['10000', '20000']),
      }),
    },
  };
});
