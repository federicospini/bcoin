'use strict';

var fs = require('fs');
var assert = require('assert');
var Network = require('../lib/protocol/network');
var util = require('../lib/utils/util');
var BufferReader = require('../lib/utils/reader');
var NetAddress = require('../lib/primitives/netaddress');
var TX = require('../lib/primitives/tx');
var Framer = require('../lib/net/framer');
var Parser = require('../lib/net/parser');
var packets = require('../lib/net/packets');
var network = Network.get('main');

describe('Protocol', function() {
  var pkg = require('../lib/pkg');
  var agent = '/bcoin:' + pkg.version + '/';
  var parser, framer, v1, v2, hosts;

  beforeEach(function() {
    parser = new Parser();
    framer = new Framer();
  });

  function packetTest(command, payload, test) {
    it('should encode/decode ' + command, function(cb) {
      var ver = new Buffer(framer.packet(command, payload.toRaw()));
      parser.once('packet', function(packet) {
        assert.equal(packet.cmd, command);
        test(packet);
        cb();
      });
      parser.feed(ver);
    });
  }

  v1 = packets.VersionPacket.fromOptions({
    version: 300,
    services: 1,
    ts: network.now(),
    remote: new NetAddress(),
    local: new NetAddress(),
    nonce: util.nonce(),
    agent: agent,
    height: 0,
    noRelay: false
  });

  packetTest('version', v1, function(payload) {
    assert.equal(payload.version, 300);
    assert.equal(payload.agent, agent);
    assert.equal(payload.height, 0);
    assert.equal(payload.noRelay, false);
  });

  v2 = packets.VersionPacket.fromOptions({
    version: 300,
    services: 1,
    ts: network.now(),
    remote: new NetAddress(),
    local: new NetAddress(),
    nonce: util.nonce(),
    agent: agent,
    height: 10,
    noRelay: true
  });

  packetTest('version', v2, function(payload) {
    assert.equal(payload.version, 300);
    assert.equal(payload.agent, agent);
    assert.equal(payload.height, 10);
    assert.equal(payload.noRelay, true);
  });

  packetTest('verack', new packets.VerackPacket(), function(payload) {
  });

  hosts = [
    new NetAddress({
      services: 1,
      host: '127.0.0.1',
      port: 8333,
      ts: util.now()
    }),
    new NetAddress({
      services: 1,
      host: '::123:456:789a',
      port: 18333,
      ts: util.now()
    })
  ];

  packetTest('addr', new packets.AddrPacket(hosts), function(payload) {
    assert.equal(typeof payload.items.length, 'number');
    assert.equal(payload.items.length, 2);

    assert.equal(typeof payload.items[0].ts, 'number');
    assert.equal(payload.items[0].services, 1);
    assert.equal(payload.items[0].host, hosts[0].host);
    assert.equal(payload.items[0].port, hosts[0].port);

    assert.equal(typeof payload.items[1].ts, 'number');
    assert.equal(payload.items[1].services, 1);
    assert.equal(payload.items[1].host, hosts[1].host);
    assert.equal(payload.items[1].port, hosts[1].port);
  });

  it('should include the raw data of only one transaction in a ' +
     'parsed transaction', function() {
    var tx, rawTwoTxs, rawFirstTx;

    rawTwoTxs = new Buffer(
      '0100000004b124cca7e9686375380c845d0fd002ed704aef4472f4cc193' +
      'fca4aa1b3404da400000000b400493046022100d3c9ba786488323c975f' +
      'e61593df6a8041c5442736f361887abfe5c97175c72b022100ca61688f4' +
      '72f4c01ede05ffc50426d68db375f72937b5f39d67835b191b6402f014c' +
      '67514104c4bee5e6dbb5c1651437cb4386c1515c7776c64535077204c6f' +
      '24f05a37d04a32bc78beb2193b53b104c9954c44b0ce168bc78efd5f1e1' +
      'c7db9d6c21b301659921027f10c31cb2ad7e0388cf5187924f1294082ba' +
      '5d4c697bbca7fd83a6af61db7d552aeffffffffb124cca7e9686375380c' +
      '845d0fd002ed704aef4472f4cc193fca4aa1b3404da401000000fd15010' +
      '0483045022100a35b7fc1973a0a8962c240a7336b501e149ef167491081' +
      'e8df91dc761f4e96c2022004ee4d20983a1d0fb96e9bedf86de03b66d7b' +
      'c50595295b1fb3b5fd2740df3c9014cc9514104c4bee5e6dbb5c1651437' +
      'cb4386c1515c7776c64535077204c6f24f05a37d04a32bc78beb2193b53' +
      'b104c9954c44b0ce168bc78efd5f1e1c7db9d6c21b3016599410495b62d' +
      '1e76a915e5ed3694298c5017d2818d22acbf2a8bd9fa4cf635184e15247' +
      'dc7e1a48beb82c1fdddc3b84ac58cec12c8f8b9ca83341ac90299c697fc' +
      '94cb4104e3394f3eea40b7abe32f4ad376a80f5a213287d1361b5580e3f' +
      'e70d13a5db0666e2593283b6b5abc01d98cfff5679d8c36b7caefa1c4df' +
      '81b10bc45c3812de5f53aeffffffffb124cca7e9686375380c845d0fd00' +
      '2ed704aef4472f4cc193fca4aa1b3404da402000000fd5e010047304402' +
      '20606d6187e0ade69192f4a447794cdabb8ea9a4e70df09aa8bc689242c' +
      '7ffeded02204165ec8edfc9de19d8a94e5f487c8a030187ae16a11e575a' +
      '955f532a81b631ad01493046022100f7764763d17757ffdeda3d66cfaa6' +
      'ad3b8f759ddc95e8f73858dba872762658a0221009e903d526595ff9d6d' +
      '53835889d816de4c47d78371d7a13223f47602b34bc71e014cc9524104c' +
      '4bee5e6dbb5c1651437cb4386c1515c7776c64535077204c6f24f05a37d' +
      '04a32bc78beb2193b53b104c9954c44b0ce168bc78efd5f1e1c7db9d6c2' +
      '1b3016599410495b62d1e76a915e5ed3694298c5017d2818d22acbf2a8b' +
      'd9fa4cf635184e15247dc7e1a48beb82c1fdddc3b84ac58cec12c8f8b9c' +
      'a83341ac90299c697fc94cb4104e3394f3eea40b7abe32f4ad376a80f5a' +
      '213287d1361b5580e3fe70d13a5db0666e2593283b6b5abc01d98cfff56' +
      '79d8c36b7caefa1c4df81b10bc45c3812de5f53aeffffffffb124cca7e9' +
      '686375380c845d0fd002ed704aef4472f4cc193fca4aa1b3404da404000' +
      '0008a473044022075c0666d413fc85cca94ea2f24adc0fedb61a3ba0fcf' +
      'b240c1a4fd2587b03bf90220525ad4d92c6bf635f8b97c188ebf491c6e3' +
      '42b767a5432f318cbb0245a7f64be014104c4bee5e6dbb5c1651437cb43' +
      '86c1515c7776c64535077204c6f24f05a37d04a32bc78beb2193b53b104' +
      'c9954c44b0ce168bc78efd5f1e1c7db9d6c21b3016599ffffffff01a029' +
      'de5c0500000017a9141d9ca71efa36d814424ea6ca1437e67287aebe348' +
      '70000000001000000019457e669dc6b344c0090d10eb22a0377022898d4' +
      '607fbdf1e3cef2a323c13fa900000000b2004730440220440d67386a27d' +
      '6776e102b82ce2d583e23d51f8ac3bb94749bd10c03ce71410e022041b4' +
      '6c5d46b14ef72af9d96fb814fa894077d534a4de1215363ee68fb8d4f50' +
      '1014c67514104c4bee5e6dbb5c1651437cb4386c1515c7776c645350772' +
      '04c6f24f05a37d04a32bc78beb2193b53b104c9954c44b0ce168bc78efd' +
      '5f1e1c7db9d6c21b301659921027f10c31cb2ad7e0388cf5187924f1294' +
      '082ba5d4c697bbca7fd83a6af61db7d552aeffffffff0250c3000000000' +
      '0001976a9146167aeaeec59836b22447b8af2c5e61fb4f1b7b088ac00a3' +
      'dc5c0500000017a9149eb21980dc9d413d8eac27314938b9da920ee53e8' +
      '700000000', 'hex');

    rawFirstTx = new Buffer(
      '0100000004b124cca7e9686375380c845d0fd002ed704aef4472f4cc193' +
      'fca4aa1b3404da400000000b400493046022100d3c9ba786488323c975f' +
      'e61593df6a8041c5442736f361887abfe5c97175c72b022100ca61688f4' +
      '72f4c01ede05ffc50426d68db375f72937b5f39d67835b191b6402f014c' +
      '67514104c4bee5e6dbb5c1651437cb4386c1515c7776c64535077204c6f' +
      '24f05a37d04a32bc78beb2193b53b104c9954c44b0ce168bc78efd5f1e1' +
      'c7db9d6c21b301659921027f10c31cb2ad7e0388cf5187924f1294082ba' +
      '5d4c697bbca7fd83a6af61db7d552aeffffffffb124cca7e9686375380c' +
      '845d0fd002ed704aef4472f4cc193fca4aa1b3404da401000000fd15010' +
      '0483045022100a35b7fc1973a0a8962c240a7336b501e149ef167491081' +
      'e8df91dc761f4e96c2022004ee4d20983a1d0fb96e9bedf86de03b66d7b' +
      'c50595295b1fb3b5fd2740df3c9014cc9514104c4bee5e6dbb5c1651437' +
      'cb4386c1515c7776c64535077204c6f24f05a37d04a32bc78beb2193b53' +
      'b104c9954c44b0ce168bc78efd5f1e1c7db9d6c21b3016599410495b62d' +
      '1e76a915e5ed3694298c5017d2818d22acbf2a8bd9fa4cf635184e15247' +
      'dc7e1a48beb82c1fdddc3b84ac58cec12c8f8b9ca83341ac90299c697fc' +
      '94cb4104e3394f3eea40b7abe32f4ad376a80f5a213287d1361b5580e3f' +
      'e70d13a5db0666e2593283b6b5abc01d98cfff5679d8c36b7caefa1c4df' +
      '81b10bc45c3812de5f53aeffffffffb124cca7e9686375380c845d0fd00' +
      '2ed704aef4472f4cc193fca4aa1b3404da402000000fd5e010047304402' +
      '20606d6187e0ade69192f4a447794cdabb8ea9a4e70df09aa8bc689242c' +
      '7ffeded02204165ec8edfc9de19d8a94e5f487c8a030187ae16a11e575a' +
      '955f532a81b631ad01493046022100f7764763d17757ffdeda3d66cfaa6' +
      'ad3b8f759ddc95e8f73858dba872762658a0221009e903d526595ff9d6d' +
      '53835889d816de4c47d78371d7a13223f47602b34bc71e014cc9524104c' +
      '4bee5e6dbb5c1651437cb4386c1515c7776c64535077204c6f24f05a37d' +
      '04a32bc78beb2193b53b104c9954c44b0ce168bc78efd5f1e1c7db9d6c2' +
      '1b3016599410495b62d1e76a915e5ed3694298c5017d2818d22acbf2a8b' +
      'd9fa4cf635184e15247dc7e1a48beb82c1fdddc3b84ac58cec12c8f8b9c' +
      'a83341ac90299c697fc94cb4104e3394f3eea40b7abe32f4ad376a80f5a' +
      '213287d1361b5580e3fe70d13a5db0666e2593283b6b5abc01d98cfff56' +
      '79d8c36b7caefa1c4df81b10bc45c3812de5f53aeffffffffb124cca7e9' +
      '686375380c845d0fd002ed704aef4472f4cc193fca4aa1b3404da404000' +
      '0008a473044022075c0666d413fc85cca94ea2f24adc0fedb61a3ba0fcf' +
      'b240c1a4fd2587b03bf90220525ad4d92c6bf635f8b97c188ebf491c6e3' +
      '42b767a5432f318cbb0245a7f64be014104c4bee5e6dbb5c1651437cb43' +
      '86c1515c7776c64535077204c6f24f05a37d04a32bc78beb2193b53b104' +
      'c9954c44b0ce168bc78efd5f1e1c7db9d6c21b3016599ffffffff01a029' +
      'de5c0500000017a9141d9ca71efa36d814424ea6ca1437e67287aebe348' +
      '700000000', 'hex');

    tx = TX.fromRaw(rawTwoTxs);
    tx._raw = null;

    assert.deepEqual(tx.toRaw(), rawFirstTx);
  });
});
