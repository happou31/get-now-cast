import fetch from "node-fetch";
import sharp from "sharp";
import fs from "fs";

const tileWidth = 3;
const tileHeight = 2;

const imageBasePixel = 256;

const mapIds = ["35_29", "36_29", "37_29", "35_30", "36_30", "37_30"];

export default async function getNowCast(date: Date) {
  const dateStr = dateStrRound(new Date(date.getTime() - 5 * 60 * 1000));

  try {
    const image = await readAsync(`.cache/dist_${dateStr}.png`);

    return image;
  } catch (e) {
    // 県境の画像
    const masks = await Promise.all(
      mapIds.map(
        async id =>
          await readCacheOrFetch(
            `.cache/mask_${id}.png`,
            `https://www.jma.go.jp/jp/commonmesh/map_tile/MAP_MASK/none/none/zoom6/${id}.png`
          )
      )
    );

    // 地形の画像
    const colors = await Promise.all(
      mapIds.map(
        async id =>
          await readCacheOrFetch(
            `.cache/color_${id}.png`,
            `https://www.jma.go.jp/jp/commonmesh/map_tile/MAP_COLOR/none/anal/zoom6/${id}.png`
          )
      )
    );

    // 雨雲の画像
    const rains = await Promise.all(
      mapIds.map(
        async id =>
          await (await fetch(
            `https://www.jma.go.jp/jp/highresorad/highresorad_tile/HRKSNC/${dateStr}/${dateStr}/zoom6/${id}.png`
          )).buffer()
      )
    );

    // なんか sharp#composite は配列を一気に渡さないと狙った画像を出力してくれないのでこうする
    const composites: ({
      input: string | Buffer;
    } & sharp.OverlayOptions)[] = [];
    for (let y = 0; y < tileHeight; ++y) {
      for (let x = 0; x < tileWidth; ++x) {
        composites.push({
          input: colors[y * tileWidth + x],
          left: x * imageBasePixel,
          top: y * imageBasePixel
        });
        composites.push({
          input: rains[y * tileWidth + x],
          left: x * imageBasePixel,
          top: y * imageBasePixel
        });
        composites.push({
          input: masks[y * tileWidth + x],
          left: x * imageBasePixel,
          top: y * imageBasePixel
        });
      }
    }

    const s = await sharp({
      create: {
        width: 256 * tileWidth,
        height: 256 * tileHeight,
        background: {
          r: 0,
          g: 0,
          b: 0
        },
        channels: 3
      }
    })
      .composite(composites)
      .png()
      .toBuffer();

    await writeAsync(`.cache/dist_${dateStr}.png`, s);

    return s;
  }
}

async function readCacheOrFetch(path: string, url: string) {
  try {
    return await readAsync(path);
  } catch (e) {
    const result = await fetch(url);
    const data = await result.buffer();
    await writeAsync(path, data);

    return data;
  }
}

function dateStrRound(date: Date): string {
  const utcDate = new Date(
    date.getTime() + date.getTimezoneOffset() * 60 * 1000
  );

  return (
    `${utcDate.getFullYear()}` +
    `00${utcDate.getMonth() + 1}`.slice(-2) +
    `00${utcDate.getDate()}`.slice(-2) +
    `00${utcDate.getHours()}`.slice(-2) +
    `00${Math.floor(utcDate.getMinutes() / 5) * 5}`.slice(-2)
  );
}

async function readAsync(path: string) {
  return new Promise<Buffer>((res, rej) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}

async function writeAsync(path: string, data: Buffer) {
  return new Promise<void>((res, rej) => {
    fs.writeFile(path, data, err => {
      if (err) {
        rej(err);
        return;
      }
      res();
    });
  });
}
