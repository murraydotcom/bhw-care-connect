(function () {
  const selector = ".stage img.hero, .stage img.body, .program-body-art, #active-system-image, .system-node img, .system-thumb, .figure-stage img";

  function backgroundPalette(pixels, width, height) {
    const counts = new Map();
    const add = (x, y) => {
      const offset = (y * width + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const high = Math.max(red, green, blue);
      const low = Math.min(red, green, blue);
      if ((red + green + blue) / 3 < 205 || high - low > 30) return;
      const key = `${Math.round(red / 8) * 8},${Math.round(green / 8) * 8},${Math.round(blue / 8) * 8}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    };

    const step = Math.max(1, Math.floor(Math.min(width, height) / 180));
    for (let x = 0; x < width; x += step) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y += step) {
      add(0, y);
      add(width - 1, y);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([key]) => key.split(",").map(Number));
  }

  function cropToSilhouette(canvas, pixels, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3] <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return canvas;
    const padding = Math.max(6, Math.round(Math.min(width, height) * 0.008));
    const sourceX = Math.max(0, minX - padding);
    const sourceY = Math.max(0, minY - padding);
    const sourceWidth = Math.min(width - sourceX, maxX - minX + 1 + padding * 2);
    const sourceHeight = Math.min(height - sourceY, maxY - minY + 1 + padding * 2);
    if (sourceWidth === width && sourceHeight === height) return canvas;

    const cropped = document.createElement("canvas");
    cropped.width = sourceWidth;
    cropped.height = sourceHeight;
    cropped.getContext("2d").drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );
    return cropped;
  }

  function extractConnectedBackground(image) {
    if (image.dataset.bhwBackgroundExtracted === "true") return;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || !canvas.width || !canvas.height) return;

    context.drawImage(image, 0, 0);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const palette = backgroundPalette(pixels, width, height);
    if (!palette.length) {
      let hasTransparency = false;
      for (let offset = 3; offset < pixels.length; offset += 4) {
        if (pixels[offset] < 250) {
          hasTransparency = true;
          break;
        }
      }
      if (hasTransparency) {
        image.dataset.bhwBackgroundExtracted = "true";
        image.src = cropToSilhouette(canvas, pixels, width, height).toDataURL("image/png");
      }
      return;
    }

    const total = width * height;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const matchesBackground = (index) => {
      const offset = index * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      if ((red + green + blue) / 3 < 198) return false;
      return palette.some(([sampleRed, sampleGreen, sampleBlue]) => {
        const dr = red - sampleRed;
        const dg = green - sampleGreen;
        const db = blue - sampleBlue;
        return dr * dr + dg * dg + db * db <= 34 * 34;
      });
    };

    const enqueue = (index) => {
      if (index < 0 || index >= total || visited[index] || !matchesBackground(index)) return;
      visited[index] = 1;
      queue[tail++] = index;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      if (x > 0) enqueue(index - 1);
      if (x + 1 < width) enqueue(index + 1);
      if (index >= width) enqueue(index - width);
      if (index + width < total) enqueue(index + width);
    }

    for (let index = 0; index < total; index += 1) {
      if (visited[index]) pixels[index * 4 + 3] = 0;
    }

    context.putImageData(frame, 0, 0);
    image.dataset.bhwBackgroundExtracted = "true";
    image.src = cropToSilhouette(canvas, pixels, width, height).toDataURL("image/png");
  }

  function prepare(image) {
    if (image.complete && image.naturalWidth) extractConnectedBackground(image);
    else image.addEventListener("load", () => extractConnectedBackground(image), { once: true });
  }

  window.BHWTransparentAnatomy = Object.freeze({ prepare });
  document.querySelectorAll(selector).forEach(prepare);
})();
