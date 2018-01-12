const Jimp = require("jimp");

// 计算棋子底部中心坐标
async let getChessPos = im => {
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
    im.scan(0, deviceConfig.scanStartY, scanEndX, scanEndY, function(x, y, idx) {
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
  
        resolve({x: chessX, y: chessY});
      }
    });
  });
};

module.exports = {
  autoPlay: async function() {
    return new Promise((resolve, reject) => {});
  }
};
