const fs = require("fs");
const path = require("path");
const wda = require("wda");
const moment = require("moment");
const async = require("async");
const Jimp = require("jimp");
const logger = require("./core/logger");
const config = require("./config/index");
const wdaServerURL = "http://192.168.1.15:8100";

const deviceConfig = require("./config.json");

// disable wda console output
console.log = function() {};

// let client = wda.client(wdaServerURL);

// let status = client.status;
// logger.debug(
//   "Connect",
//   status.value.ios.ip,
//   status.value.os.name + status.value.os.version
// );

// let screenShotDir = path.resolve(
//   config.screenShotPath,
//   moment().format("YYYYMMDD-HHmmss")
// );
// fs.mkdirSync(screenShotDir);

let takeScreenShot = function(callback) {
  // fake
  // return callback(null, "./test.png");

  // let screenshot = client.screenshot().value;

  // let dataBuffer = new Buffer(screenshot, "base64");
  // let filename = moment().format("HHmmssSSS") + ".png";

  // fs.writeFile(screenShotDir + "/" + filename, dataBuffer, function(err) {
  //   if (err) {
  //     callback(err);
  //   } else {
  //     callback(null);
  //   }
  // });

  Jimp.read("./test.png", function(err, im) {
    logger.debug(`Get screen shot: ${im.bitmap.height} * ${im.bitmap.width}`);

    callback(err, im);
  });
};

let getChessPos = function(result, callback) {
  let im = result.takeScreenShot;

  let scanEndX = im.bitmap.width - 300;
  let scanEndY = im.bitmap.height * 2 / 3;

  let minChessX = im.bitmap.width;
  let minChessY = 0;
  let maxChessX = 0;
  let maxChessY = 0;
  let chessX = 0;
  let chessY = 0;

  im.scan(300, 300, scanEndX, scanEndY, function(x, y, idx) {
    let red = this.bitmap.data[idx + 0];
    let green = this.bitmap.data[idx + 1];
    let blue = this.bitmap.data[idx + 2];

    if (
      40 < red &&
      red < 66 &&
      (30 < green && green < 63) &&
      (68 < blue && blue < 110)
    ) {
      if (x < minChessX) {
        minChessX = x;
        minChessY = y;
      }

      if (x == minChessX) {
        minChessY = (minChessY + y) / 2;
      }

      if (x > maxChessX) {
        maxChessX = x;
        maxChessY = (maxChessY + y) / 2;
      }

      // 颜色匹配测试
      // im.setPixelColor(0xFFFFFFFF, x, y);
    }

    if (x == scanEndX - 1 && y == scanEndY - 1) {
      // image scan finished, do your stuff
      chessX = Math.round((minChessX + maxChessX) / 2);
      chessY = Math.round((minChessY + maxChessY) / 2);
      logger.debug("Chess scan finish", chessX, chessY);

      // drawPosition(im, chessX, chessY, 0x00000000, function(im) {
        callback(null);
      // });
    }
  });
};

let getBoardPos = function(result, callback) {
  let im = result.takeScreenShot;

  let scanEndX = im.bitmap.width;
  let scanEndY = im.bitmap.height * 2 / 3;

  let backColor = Jimp.intToRGBA(im.getPixelColor(0, 0));

  let topX = 0
  let topY = 0;

  im.scan(0, 400, scanEndX, scanEndY, function(x, y, idx) {
    let red = this.bitmap.data[idx + 0];
    let green = this.bitmap.data[idx + 1];
    let blue = this.bitmap.data[idx + 2];

    if (Math.abs(red - backColor.r) + Math.abs(green - backColor.g) + Math.abs(blue - backColor.b) > 10) {
      if (!topY) {
        topY = y;
        topX = x;
      }

      if (topY == y) {
        topX = (topX + x) / 2;
      }
    }

    if (x == scanEndX - 1 && y == scanEndY - 1) {
      topX = Math.round(topX);
      topY = Math.round(topY);

      logger.debug("Border scan finish", topX, topY);

      drawPosition(im, topX, topY, 0x00000000, function(im) {
        callback(null);
      });
    }
  });
};

let drawPosition = function(im, drawX, drawY, color, callback) {
  logger.debug("Draw", drawX, drawY);

  im.scan(0, 0, im.bitmap.width, im.bitmap.height, function(x, y, idx) {
    if (x == drawX || y == drawY) {
      im.setPixelColor(color, x, y);
      // logger.debug(x, y);
    }

    if (x == im.bitmap.width - 1 && y == im.bitmap.height - 1) {
      callback(im);
    }
  });
};

async.auto(
  {
    takeScreenShot,
    getChessPos: ["takeScreenShot", getChessPos],
    getBoardPos: ["takeScreenShot", getBoardPos]
  },
  function(err, result) {
    if (err) {
      logger.error(err);
    }

    result.takeScreenShot.write('./test2.png');

    logger.debug("success");
  }
);
