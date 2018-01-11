const log4js = require('log4js');
log4js.configure({
    appenders: {
        console: { type: 'console'},
    },
    categories: {
        default: { appenders: ['console'], level: 'DEBUG' },
    }
});

const logger = log4js.getLogger('default');

module.exports = logger;