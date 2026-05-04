export function preprocessForOCR(imageDataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const inverted = 255 - gray;
        const contrast = inverted < 80 ? 0 : inverted > 180 ? 255 : inverted;
        data[i] = data[i + 1] = data[i + 2] = contrast;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataURL;
  });
}

export function preprocessRegion(imageDataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const inverted = 255 - gray;
        const threshold = inverted > 100 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = threshold;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataURL;
  });
}
