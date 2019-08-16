import getNowCast from "./get-now-cast";
import fs from "fs";

(async () => {
  const image = getNowCast(new Date());

  image.then(i => {
    fs.writeFile("./t.png", i, () => {});
  });
})();
