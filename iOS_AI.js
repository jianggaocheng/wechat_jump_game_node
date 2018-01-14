const Jimp = require("jimp");
const async = require("async");
const game = require("./core/game");
const wda = require("wda");
const wdaDriver = require('wda-driver');
const wdaServerURL = "http://192.168.1.15:8100";

const c = new wdaDriver.Client(wdaServerURL);

global.logger = require("./core/logger");
global.deviceConfig = require("./config.json");
console.log = function() {};

async function connect() {
  let client = wda.client(wdaServerURL);
  let status = client.status;
  logger.debug(
    "Connect",
    status.value.ios.ip,
    status.value.os.name + status.value.os.version
  );

  return Promise.resolve(client);
}

async function screenShot(client) {
  let match = false;
  let lastIm = null;

  return new Promise((resolve, reject) => {
    async.retry({times: 10, interval: 50}, function(callback) {
      let screenshot = client.screenshot().value;
      let dataBuffer = new Buffer(client.screenshot().value, 'base64');
      Jimp.read(dataBuffer, (err, nowIm)=> {
        if (!lastIm) {
          lastIm = nowIm;
          return callback({errCode: 'Not_Match'});
  
        } else {
          let distance = Jimp.distance(lastIm, nowIm); // perceived distance
          
          logger.debug('image distance', distance);
          if (distance == 0) {
            return callback(null, nowIm);
          } else {
            lastIm = nowIm;
            return callback({errCode: 'Not_Match'});
          }
        }
      });
    }, function(err, result) {
      if (err) {
        return reject(err);
      }

      return resolve(result);
    });
  });
}

// fake
async function play(){
  let client = await connect();

  let s = await c.session();

  async.forever(
    async function() {
      let im = await screenShot(client);
  
      game.autoPlay(im).then(pressTime => {
        s.tapHold(200, 200, pressTime);
      });
    },
    function(err) {
      logger.error(err);
    }
  )
};

// connect();
play();

