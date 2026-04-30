export async function extractRegions(imageDataURL) {
  const img = await loadImage(imageDataURL);
  const w = img.width;
  const h = img.height;

  return {
    titleArea: cropImage(img, 0, 0, w * 0.4, h * 0.12),
    rightAxis: cropImage(img, w * 0.85, 0, w * 0.15, h),
    centerArea: cropImage(img, w * 0.1, h * 0.15, w * 0.75, h * 0.7),
    livePriceBox: cropImage(img, w * 0.85, h * 0.4, w * 0.15, h * 0.2),
  };
}

function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

function cropImage(img, x, y, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}
