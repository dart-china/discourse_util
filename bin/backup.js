const schedule = require('node-schedule');

const { BackupClient } = require('../backup');

const client = new BackupClient();
if (!client.init()) {
  console.error('Discourse backup error!');
  return process.exit();
}

client.run();
