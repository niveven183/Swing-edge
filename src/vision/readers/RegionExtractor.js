export async function extractRegions(imageDataURL) {
  const img = await loadImage(imageDataURL);
  const w = img.width;
  const h = img.height;

  return {
    titleArea: cropImage(img, 0, 0, w * 0.5, h * 0.15),
    toolArea: cropImage(img, w * 0.05, h * 0.15, w * 0.7, h * 0.6),
    priceAxis: cropImage(img, w * 0.8, 0, w * 0.2, h),
    tickerTag: cropImage(img, w * 0.7, h * 0.15, w * 0.3, h * 0.35),
    fullImage: imageDataURL,
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
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
