require('dotenv').config();
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const SSH = require('node-ssh');

const ssh = new SSH();
const extension = 'tar.gz';
const localFolder = process.env.LOCAL_BACKUP_FOLDER;
const remoteFolder = process.env.REMOTE_BACKUP_FOLDER || '/var/discourse/shared/standalone/backups/default';

if (!localFolder) {
  return;
}

const backupFiles = {};
if (!fs.existsSync(localFolder)) {
  fs.mkdirSync(localFolder);
}
fs.readdirSync(localFolder).forEach(file => {
  backupFiles[file] = true;
})

console.log('Discourse backup begin!');

Promise.delay(6000).then(() => {
  ssh.connect({
    host: process.env.DISCOURSE_HOST,
    username: process.env.SSH_USER,
    privateKey: process.env.PRIVATE_KEY,
  }).then(() => {
    ssh.execCommand('ls', { cwd: remoteFolder }).then(function (result) {
      const stdout = result.stdout || '';
      const stderr = result.stderr;
      if (stderr) {
        console.error(stderr);
        return process.exit();
      }

      const files = stdout.split(/\r?\n/) || [];
      Promise.each(files, function (file) {
        if (_.endsWith(file, extension) && !backupFiles[file]) {
          console.log(file);
          return ssh.getFile(path.join(localFolder, file), path.join(remoteFolder, file));
        }
      }).then(function () {
        console.log('Discourse backup finished!');
        process.exit();
      });
    });
  }, (error) => {
    console.error('Discourse backup error', error);
    process.exit();
  });
});
