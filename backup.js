require('dotenv').config();
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const SimpleNodeLogger = require('simple-node-logger');
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

const logger = SimpleNodeLogger.createSimpleLogger({
  logFilePath: path.join(localFolder, 'backup.log'),
  timestampFormat: 'YYYY-MM-DD HH:mm:ss',
});
logger.info('Backup begin!');

Promise.delay(6000).then(() => {
  ssh.connect({
    host: process.env.DISCOURSE_HOST,
    username: process.env.SSH_USER,
    privateKey: process.env.PRIVATE_KEY,
  }).then(() => {
    ssh.execCommand('ls', { cwd: remoteFolder }).then((result) => {
      const stdout = result.stdout || '';
      const stderr = result.stderr;
      if (stderr) {
        loggr.error('ls error', stderr);
        return process.exit();
      }

      const files = stdout.split(/\r?\n/) || [];
      Promise.each(files, (file) => {
        if (_.endsWith(file, extension) && !backupFiles[file]) {
          logger.info('Backup file', file);
          return ssh.getFile(path.join(localFolder, file), path.join(remoteFolder, file));
        } else {
          return Promise.resolve();
        }
      }).then((data) => {
        logger.info('Backup finished!');
        setTimeout(() => {
          process.exit();
        }, 2000);
      });
    });
  }, (error) => {
    logger.error('SSH error', error);
    process.exit();
  });
});
