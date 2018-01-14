const Jimp = require("jimp");
const moment = require("moment");

// 寻找棋子底部中心坐标
let getChessPos = im => {
  let scanEndX = im.bitmap.width;
  let scanEndY = im.bitmap.height * 2 / 3;

  // 棋子的左边缘坐标
  let minChessX = im.bitmap.width;
  let minChessY = 0;

  // 棋子的右边缘坐标
  let maxChessX = 0;
  let maxChessY = 0;

  // 根据左右边缘坐标算出棋子底部中心坐标
  let chessX = 0;
  let chessY = 0;

  return new Promise((resolve, reject) => {
    im.scan(0, deviceConfig.scanStartY, scanEndX, scanEndY, function(
      x,
      y,
      idx
    ) {
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

        resolve({ x: chessX, y: chessY });
      }
    });
  });
};

// 寻找方块中心坐标
let getBoardPos = (im, chessPos) => {
  let scanEndX = im.bitmap.width;
  let scanEndY = im.bitmap.height * 2 / 3;

  let backColor = Jimp.intToRGBA(im.getPixelColor(1, 1));

  let topX = 0;
  let topY = 0;

  let borderX = 0;
  let borderY = 0;

  return new Promise((resolve, reject) => {
    im.scan(0, 400, scanEndX, scanEndY, function(x, y, idx) {
      let red = this.bitmap.data[idx + 0];
      let green = this.bitmap.data[idx + 1];
      let blue = this.bitmap.data[idx + 2];

      if (
        Math.abs(red - backColor.r) +
          Math.abs(green - backColor.g) +
          Math.abs(blue - backColor.b) >
        50
      ) {
        if (
          40 < red &&
          red < 66 &&
          (30 < green && green < 63) &&
          (68 < blue && blue < 110)
        ) {
          return;
        }

        if (!topY) {
          topY = y;
          topX = x;
        }

        if (topY == y) {
          topX = (topX + x) / 2;
        }
      }

      if (x == scanEndX - 1 && y == scanEndY - 1) {
        borderX = Math.round(topX);
        borderY = Math.round(
          chessPos.y -
            Math.abs(borderX - chessPos.x) * Math.sqrt(3) / 3
        );

        logger.debug("Border scan finish", borderX, borderY);

        resolve({ x: borderX, y: borderY });
      }
    });
  });
};

let drawLine = function(im, color, drawX, drawY) {
  return new Promise((resolve, reject) => {
    im.scan(0, 0, im.bitmap.width, im.bitmap.height, function(x, y, idx) {
      if (x == drawX || y == drawY) {
        im.setPixelColor(color, x, y);
      }

      if (x == im.bitmap.width - 1 && y == im.bitmap.height - 1) {
        resolve(im);
      }
    });
  });
};

module.exports = {
  autoPlay: async function(im) {
      logger.debug("autoPlay");

      let chessPos = await getChessPos(im);
      let boardPos = await getBoardPos(im, chessPos);

      im = await drawLine(im, 0xFF0000FF, chessPos.x, chessPos.y);
      im = await drawLine(im, 0x00FF00FF, boardPos.x, boardPos.y);

      let filename = moment().format("HHmmssSSS") + "_d.png";

      im.write(screenShotDir+ "/" + filename);

      let distance = Math.sqrt(Math.pow((chessPos.x - boardPos.x), 2) + Math.pow((chessPos.x - boardPos.x), 2));
      let pressTime = distance * deviceConfig.pressCoefficient / 1000;

      logger.debug(`distance: ${distance}, press time: ${pressTime}`);
      return Promise.resolve(pressTime);
  }
};
