const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();

// tmp ディレクトリ作成（存在しない場合）
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const upload = multer({ dest: tmpDir });

app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index'));

app.post('/convert', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputFormat = req.body.format;
  const originalName = path.parse(req.file.originalname).name;
  const outputFilename = `${req.file.filename}.${outputFormat}`;
  const outputPath = path.join(tmpDir, outputFilename);

  const command = `"${ffmpegPath}" -y -i "${inputPath}" "${outputPath}"`;

  exec(command, (err, stdout, stderr) => {
    fs.unlinkSync(inputPath); // 元ファイル削除
    if (err) {
      console.error(stderr);
      return res.status(500).send('変換中にエラーが発生しました');
    }

    // 5分後に変換ファイルを削除
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        fs.unlink(outputPath, e => { if (e)
