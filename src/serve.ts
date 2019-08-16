import express from "express";
import getNowCast from "./get-now-cast";

const port = parseInt(process.env.PORT || "3000");

const app = express();

app.listen(port);

app.get("/get-now-cast", async (req, res, next) => {
  const image = await getNowCast(new Date());

  if (image) {
    res.header("Content-Type", "image/png");
    res.send(image);
  } else {
    res.status(500);
  }
});
