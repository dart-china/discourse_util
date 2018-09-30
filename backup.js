const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const SimpleNodeLogger = require('simple-node-logger');
const SSH = require('node-ssh');
const ssh = new SSH();

class BackupClient {
  constructor() {
    this.extension = 'tar.gz';
    this.backupFiles = {};
    this.localFolder = '';
    this.remoteFolder = '';
    this.logger = {};
  }

  init() {
    require('dotenv').config({
      path: path.join(__dirname, '.env'),
    });

    this.localFolder = process.env.LOCAL_BACKUP_FOLDER;
    this.remoteFolder = process.env.REMOTE_BACKUP_FOLDER || '/var/discourse/shared/standalone/backups/default';

    if (!this.localFolder) {
      return false;
    }

    if (!fs.existsSync(this.localFolder)) {
      fs.mkdirSync(this.localFolder);
    }
    fs.readdirSync(this.localFolder).forEach(file => {
      this.backupFiles[file] = true;
    })

    this.logger = SimpleNodeLogger.createSimpleLogger({
      logFilePath: path.join(this.localFolder, 'backup.log'),
      timestampFormat: 'YYYY-MM-DD HH:mm:ss',
    });
    this.logger.info('Backup ready!');

    return true;
  }

  run() {
    this.logger.info('Backup begin!');
    Promise.delay(6000).then(() => {
      ssh.connect({
        host: process.env.DISCOURSE_HOST,
        username: process.env.SSH_USER,
        privateKey: process.env.PRIVATE_KEY,
      }).then(() => {
        ssh.execCommand('ls', { cwd: this.remoteFolder }).then((result) => {
          const stdout = result.stdout || '';
          const stderr = result.stderr;
          if (stderr) {
            this.logger.error('ls error', stderr);
            return process.exit();
          }

          const files = stdout.split(/\r?\n/) || [];
          Promise.each(files, (file) => {
            if (_.endsWith(file, this.extension) && !this.backupFiles[file]) {
              this.logger.info('Backup file ', file);
              return ssh.getFile(path.join(this.localFolder, file), path.join(this.remoteFolder, file));
            } else {
              return Promise.resolve();
            }
          }).then((data) => {
            this.logger.info('Backup finished!');
          });
        });
      }, (error) => {
        this.logger.error('SSH error', error);
        process.exit();
      });
    });
  }
}

module.exports = {
  BackupClient,
};
