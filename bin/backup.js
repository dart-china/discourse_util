const schedule = require('node-schedule');

const { BackupClient } = require('../backup');

const client = new BackupClient();
if (!client.init()) {
  console.error('Discourse backup error!');
  return process.exit();
}

schedule.scheduleJob('30 9,15,20 * * *', function () {
  client.run();
});