/*!
 * foonode.js - foo node for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

var util = require('../utils/util');
var co = require('../utils/co');
var Node = require('./node');
var Pool = require('../net/pool');
var HTTPServer = require('../http/server');

/**
 * Respresents a foonode only usefull for pool connection
 * @alias module:node.FooNode
 * @extends Node
 * @constructor
 * @param {Object?} options
 * @property {Chain} chain
 * @property {PolicyEstimator} fees
 * @property {Mempool} mempool
 * @property {Pool} pool
 * @property {Miner} miner
 * @property {WalletDB} walletdb
 * @property {HTTPServer} http
 * @emits FullNode#block
 * @emits FullNode#tx
 * @emits FullNode#connect
 * @emits FullNode#disconnect
 * @emits FullNode#reset
 * @emits FullNode#error
 */

function FooNode({options, chain, hashes, map}) {
  if (!(this instanceof FooNode))
    return new FooNode(options);

  Node.call(this, options);

  // Pool needs access to the chain and mempool.
  this.pool = new Pool({
    network: this.network,
    logger: this.logger,
    selfish: this.options.selfish,
    compact: this.options.compact,
    bip37: this.options.bip37,
    bip151: this.options.bip151,
    bip150: this.options.bip150,
    authPeers: this.options.authPeers,
    knownPeers: this.options.knownPeers,
    identityKey: this.options.identityKey,
    maxOutbound: this.options.maxOutbound,
    maxInbound: this.options.maxInbound,
    proxy: this.options.proxy,
    onion: this.options.onion,
    seeds: this.options.seeds,
    nodes: this.options.nodes,
    publicHost: this.options.publicHost,
    publicPort: this.options.publicPort,
    host: this.options.host,
    port: this.options.port,
    listen: this.options.listen,
    fakeChain: {
      chain,
      hashes,
      map
    }
  });

  // HTTP needs access to the node.
  // if (!HTTPServer.unsupported) {
  //   this.http = new HTTPServer({
  //     network: this.network,
  //     logger: this.logger,
  //     node: this,
  //     key: this.options.sslKey,
  //     cert: this.options.sslCert,
  //     port: this.options.httpPort,
  //     host: this.options.httpHost,
  //     apiKey: this.options.apiKey,
  //     serviceKey: this.options.serviceKey,
  //     walletAuth: this.options.walletAuth,
  //     noAuth: this.options.noAuth
  //   });
  // }

  this._init();
}

util.inherits(FooNode, Node);

/**
 * Initialize the node.
 * @private
 */

FooNode.prototype._init = function _init() {
  var self = this;
  var onError = this.error.bind(this);

  // Bind to errors
  this.pool.on('error', onError);

  if (this.http)
    this.http.on('error', onError);
};

/**
 * Open the node and all its child objects,
 * wait for the database to load.
 * @alias FooNode#open
 * @returns {Promise}
 */

FooNode.prototype._open = co(function* open() {
  yield this.pool.open();

  if (this.http)
    yield this.http.open();

  this.logger.info('Node is loaded.');
});

/**
 * Close the node, wait for the database to close.
 * @alias FooNode#close
 * @returns {Promise}
 */

FooNode.prototype._close = co(function* close() {
  if (this.http)
    yield this.http.close();

  yield this.pool.close();
  
  this.logger.info('Node is closed.');
});

/**
 * Broadcast a transaction (note that this will _not_ be verified
 * by the mempool - use with care, lest you get banned from
 * bitcoind nodes).
 * @param {TX|Block} item
 * @returns {Promise}
 */

FooNode.prototype.broadcast = co(function* broadcast(item) {
  try {
    yield this.pool.broadcast(item);
  } catch (e) {
    this.emit('error', e);
  }
});

/**
 * Add transaction to mempool, broadcast. Silence errors.
 * @param {TX} tx
 * @returns {Promise}
 */

FooNode.prototype.relay = co(function* relay(tx) {
  try {
    yield this.sendTX(tx);
  } catch (e) {
    this.error(e);
  }
});

/**
 * Connect to the network.
 * @returns {Promise}
 */

FooNode.prototype.connect = function connect() {
  return this.pool.connect();
};

/**
 * Disconnect from the network.
 * @returns {Promise}
 */

FooNode.prototype.disconnect = function disconnect() {
  return this.pool.disconnect();
};

/**
 * Start the blockchain sync.
 */

FooNode.prototype.startSync = function startSync() {
  return this.pool.startSync();
};

/**
 * Start the blockchain MOCK sync.
 */

FooNode.prototype.startSyncMock = function startSyncMock({hashes, chain, map}) {
  return this.pool.startSyncMock({hashes, chain, map});
};

/**
 * Stop syncing the blockchain.
 */

FooNode.prototype.stopSync = function stopSync() {
  return this.pool.stopSync();
};

/*
 * Expose
 */

module.exports = FooNode;
