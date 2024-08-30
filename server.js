const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { time } = require("console");
const app = express();
const port = 8002;

// パス取得
app.use(express.static(path.join(__dirname, "public")));
const path_origin_media = "public/upload/"; //元素材のアップロード先
const path_conv_media = "public/converted/"; //変換後素材のアップロード先

//起動確認
app.listen(port, function () {
  console.log(`サーバー起動 ${port}ポート\r\nhttp://localhost:${port}`);
  CheckGen_dir("./public/upload"); //変換前の動画をアップロードするディレクトリを生成
  CheckGen_dir("./public/converted"); //変換後の動画をアップロードするディレクトリを生成
});

//アップロード
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path_origin_media);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

//-----------ルーティング-----------
//デフォルトページ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
// 圧縮
app.post("/comp", (req, res) => {
  res.sendFile(path.join(__dirname, "public/comp.html"));
});
// 変換
app.post("/conv", (req, res) => {
  res.sendFile(path.join(__dirname, "public/conv.html"));
});
// カット
app.post("/cut", (req, res) => {
  res.sendFile(path.join(__dirname, "public/cut.html"));
});
// 結合
app.post("/comb", (req, res) => {
  res.sendFile(path.join(__dirname, "public/comb.html"));
});
// 音声レベルアップ
app.post("/audio_increase", (req, res) => {
  res.sendFile(path.join(__dirname, "public/audio_increase.html"));
});
// mp3と画像からmp4を作る
app.post("/genmp4", (req, res) => {
  res.sendFile(path.join(__dirname, "public/genmp4.html"));
});

//------------処理------------
// 圧縮
app.post("/comp_conv", upload.single("file"), function (req, res, next) {
  let timestamp = Date.now(); // タイムスタンプ取得
  console.log(req.file);
  const i_filename = req.file.originalname;
  const bitrate = req.body.bitrate;
  const o_filename = "sizedown_" + timestamp + "_" + i_filename;
  let command =
    "ffmpeg -i " +
    path_origin_media +
    i_filename +
    " -b:v " +
    bitrate +
    "k " +
    path_conv_media +
    o_filename;
  const execSync = require("child_process").execSync;
  const stdout = execSync(command);
  res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
  deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除;
});

// 変換
app.post("/conv_conv", upload.single("file"), function (req, res, next) {
  let timestamp = Date.now(); // タイムスタンプ取得
  const i_filename = req.file.originalname;
  let o_filename = "";
  if (req.body.conv_radio == "MOV_to_mp4" || "mxf_to_mp4")
    o_filename = timestamp + ".mp4";
  if (req.body.conv_radio == "ma4_to_mp3") o_filename = timestamp + ".mp3";

  const command =
    "ffmpeg -i " +
    path_origin_media +
    i_filename +
    " " +
    path_conv_media +
    o_filename;
  const execSync = require("child_process").execSync;
  const stdout = execSync(command);
  res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
  console.log(res);
  deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除;
  // deleteFile(path_conv_media + o_filename); //アップロードしたファイルの削除
});

// カット
app.post("/cut_conv", upload.single("file"), function (req, res, next) {
  let timestamp = Date.now(); // タイムスタンプ取得
  console.log(req.file);
  const i_filename = req.file.originalname;
  const o_filename = "out_cut_" + timestamp + "_" + i_filename;

  const start_time = req.body.input_start_time;
  const fin_time = req.body.input_fin_time;

  const command =
    "ffmpeg -ss " +
    start_time +
    " -to " +
    fin_time +
    " -i " +
    path_origin_media +
    i_filename +
    " -c copy " +
    path_conv_media +
    o_filename;
  console.log(command);
  const execSync = require("child_process").execSync;

  const stdout = execSync(command);

  res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
  deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除;
  // deleteFile(path_conv_media + o_filename); //アップロードしたファイルの削除
});

// 結合
app.post(
  "/comb_conv",
  upload.fields([{ name: "file1" }, { name: "file2" }]),
  function (req, res, next) {
    let timestamp = Date.now(); // タイムスタンプ取得
    const file1Array = req.files["file1"];
    const file2Array = req.files["file2"];
    const file1Names = file1Array.map((file) => file.originalname);
    const file1Paths = file1Array.map((file) => file.path);
    const file2Paths = file2Array.map((file) => file.path);

    const content = "file '" + file1Paths + "'\nfile '" + file2Paths + "'";
    fs.writeFileSync("list.txt", content);
    const o_filename = "out_comb_" + timestamp + file1Names;
    const command =
      "ffmpeg -safe 0 -f concat -i list.txt -c copy " +
      path_conv_media +
      o_filename;
    const execSync = require("child_process").execSync;
    const stdout = execSync(command);
    res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
    // deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除;
    // deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除;
    // deleteFile(path_conv_media + o_filename); //アップロードしたファイルの削除
  }
);

// 音声レベルアップ（dBを入力）
app.post(
  "/audio_increase_conv",
  upload.single("file"),
  function (req, res, next) {
    let timestamp = Date.now(); // タイムスタンプ取得
    console.log(req.file);
    const i_filename = req.file.originalname;
    const vol_num = req.body.volume;
    const o_filename = "out_volup_" + timestamp + "_" + i_filename;
    let command =
      "ffmpeg -i " +
      path_origin_media +
      i_filename +
      " -af volume=" +
      vol_num +
      "dB " +
      path_conv_media +
      o_filename;
    const execSync = require("child_process").execSync;
    const stdout = execSync(command);
    res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
    deleteFile(path_origin_media + i_filename); //アップロードしたファイルの削除
    // deleteFile(path_conv_media + o_filename); //アップロードしたファイルの削除
  }
);

// mp3と画像からmp4動画を作成
app.post(
  "/genmp4_conv",
  upload.fields([{ name: "file1" }, { name: "file2" }]),
  function (req, res, next) {
    let timestamp = Date.now(); // タイムスタンプ取得
    console.log(req.file);
    const file1Array = req.files["file1"];
    const file2Array = req.files["file2"];
    // const AudioFileName = file1Array.map((file) => file.originalname);
    const AudioPaths = file1Array.map((file) => file.path);
    // const ImgFileName = file2Array.map((file) => file.originalname);
    const ImgPaths = file2Array.map((file) => file.path);
    const o_filename = "out_comb_" + timestamp + ".mp4";
    const command =
      "ffmpeg -loop 1 -i " +
      ImgPaths[0] +
      // ImgFileName[0] +
      " -i " +
      AudioPaths[0] +
      // AudioFileName[0] +
      ' -c:v libx264 -tune stillimage -c:a libmp3lame -vf "fps=25,format=yuv420p" -shortest ' +
      path_conv_media +
      o_filename;

    console.log(command);

    const execSync = require("child_process").execSync;
    const stdout = execSync(command);
    res.download(path_conv_media + o_filename); //変換したファイルのダウンロード
  }
);

// ファイルを削除する関数
function deleteFile(path) {
  try {
    fs.unlinkSync(path);
    console.log(path + " 削除しました。");
  } catch (err) {
    console.log(path + " 削除失敗しました。");
  }
}

// ログを出力する関数
function output_log() {
  fs.writeFileSync("public/log/log.txt", "logファイルです");
}

// ディレクトリの存在を確認・なければ生成する関数
function CheckGen_dir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}
