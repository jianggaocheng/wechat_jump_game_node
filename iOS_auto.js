const fs = require("fs");
const path = require("path");
const wda = require("wda");
const moment = require("moment");
const async = require("async");
const Jimp = require("jimp");

const game = require("./core/game");
const config = require("./config/index");
const wdaServerURL = "http://192.168.1.15:8100";

global.logger = require("./core/logger");
global.deviceConfig = require("./config.json");

// disable wda console output
console.log = function() {};

let client = wda.client(wdaServerURL);

const wdaDriver = require('wda-driver');

const c = new wdaDriver.Client(wdaServerURL);

let status = client.status;
logger.debug(
  "Connect",
  status.value.ios.ip,
  status.value.os.name + status.value.os.version
);

let screenShotDir = path.resolve(
  config.screenShotPath,
  moment().format("YYYYMMDD-HHmmss")
);
fs.mkdirSync(screenShotDir);

let takeScreenShot = function(callback) {
  // fake
  // return callback(null, "./test.png");

  let screenshot = client.screenshot().value;

  let dataBuffer = new Buffer(screenshot, "base64");
  let filename = moment().format("HHmmssSSS") + ".png";

  fs.writeFile(screenShotDir + "/" + filename, dataBuffer, function(err) {
    if (err) {
      callback(err);
    } else {
      Jimp.read(dataBuffer, function(err, im) {
        logger.debug(`Get screen shot: ${im.bitmap.height} * ${im.bitmap.width}`);
    
        callback(err, im);
      });
    }
  });

  // fake
  // Jimp.read("./test.png", function(err, im) {
  //   logger.debug(`Get screen shot: ${im.bitmap.height} * ${im.bitmap.width}`);

  //   callback(err, im);
  // });
};

let getChessPos = function(result, callback) {
  let im = result.screenShot;

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

      callback(null, {x: chessX, y: chessY});
    }
  });
};

let getBoardPos = function(result, callback) {
  let im = result.screenShot;

  let scanEndX = im.bitmap.width;
  let scanEndY = im.bitmap.height * 2 / 3;

  let backColor = Jimp.intToRGBA(im.getPixelColor(1, 1));

  let boardColor = null;

  let topX = 0
  let topY = 0;

  let leftX = im.bitmap.width
  let leftY = 0;

  let rightX = 0
  let rightY = 0;

  let borderX = 0;
  let borderY = 0;

  im.scan(0, 400, scanEndX, scanEndY, function(x, y, idx) {
    let red = this.bitmap.data[idx + 0];
    let green = this.bitmap.data[idx + 1];
    let blue = this.bitmap.data[idx + 2];

    if (Math.abs(red - backColor.r) + Math.abs(green - backColor.g) + Math.abs(blue - backColor.b) > 50) {
      if (!topY) {
        topY = y;
        topX = x;
        boardColor = {r:red, g: green, b: blue};
      }

      if (topY == y) {
        topX = (topX + x) / 2;
      }
    }

    if (x == scanEndX - 1 && y == scanEndY - 1) {
      borderX = Math.round(topX);
      borderY = Math.round(result.chessPos.y - Math.abs(borderX - result.chessPos.x) * Math.sqrt(3) / 3);

      logger.debug("Border scan finish", borderX, borderY);

      callback(null, {x: borderX, y: borderY});
    }
  });
};

// 在截图中画出定位点，以便后期debug
let drawLine = function(result, callback) {
  let im = result.screenShot;

  async.series({
    drawChess: function(cb) {
      drawPosition(im, result.chessPos.x, result.chessPos.y, 0x00000000, function(im) {
        cb(null);
      });
    },
    drawBoard: function(cb) {
      drawPosition(im, result.boardPos.x, result.boardPos.y, 0x00000000, function(im) {
        cb(null);
      });
    }
  }, function(err, result) {
    let filename = moment().format("HHmmssSSS") + "_d.png";

    im.write(screenShotDir+ "/" + filename);
    callback(null);
  })
};

// 根据棋子和方块位置算出按下屏幕的时间
let jump = function(result, callback) {
  let distance = Math.sqrt(Math.pow((result.chessPos.x - result.boardPos.x), 2) + Math.pow((result.chessPos.x - result.boardPos.x), 2));
  
  let pressTime = distance * deviceConfig.pressCoefficient / 1000;

  logger.debug('Distance', distance);
  logger.debug('PressTime', pressTime);

  c.session().then(s => {
    s.tapHold(200, 200, pressTime);
  });

  callback(null);
}

// 画线
let drawPosition = function(im, drawX, drawY, color, callback) {
  im.scan(0, 0, im.bitmap.width, im.bitmap.height, function(x, y, idx) {
    if (x == drawX || y == drawY) {
      im.setPixelColor(color, x, y);
    }

    if (x == im.bitmap.width - 1 && y == im.bitmap.height - 1) {
      callback(im);
    }
  });
};

setInterval(function() {
  async.auto(
    {
      screenShot: takeScreenShot,
      chessPos: ["screenShot", getChessPos],
      boardPos: ["chessPos", getBoardPos],
      jump: ["chessPos", "boardPos", jump],
      drawLine: ["chessPos", "boardPos", drawLine]
    },
    function(err, result) {
      if (err) {
        return logger.error(err);
      }
  
      logger.debug("success");
    }
  );
}, 5000);

