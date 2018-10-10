const schedule = require('node-schedule');

const { BackupClient } = require('../backup');

const client = new BackupClient();
if (!client.init()) {
  console.error('Discourse backup error!');
  return process.exit();
}

client.run().then(() => {
  schedule.scheduleJob('30 10 * * *', function () {
    client.run();
  });

  schedule.scheduleJob('30 15 * * *', function () {
    client.run();
  });
});
