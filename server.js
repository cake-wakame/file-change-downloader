const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const upload = multer({ dest: tmpDir });
app.set('view engine', 'ejs');

const formatInfo = {
  mp3: 'MP3: 高互換性の圧縮音声ファイル',
  wav: 'WAV: 無圧縮で高音質',
  ogg: 'OGG: 高圧縮でも音質良好',
  flac: 'FLAC: 無損失圧縮、高音質',
  m4a: 'M4A: Apple標準、高圧縮で音質良好',
  aac: 'AAC: 高圧縮でも音質維持、MP4と相性良'
};

const contentTypeMap = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac'
};

// トップページ
app.get('/', (req, res) => res.render('index', { downloadUrl: null, formatInfo }));

// 変換処理
app.post('/convert', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputFormat = req.body.format;
  const outputFilename = `${req.file.filename}.${outputFormat}`;
  const outputPath = path.join(tmpDir, outputFilename);

  // 入力形式を自動判定（ffmpeg -i でエラーにならなければOK）
  exec(`"${ffmpegPath}" -i "${inputPath}"`, (err, stdout, stderr) => {
    if (stderr.includes('Invalid data found') || err) {
      fs.unlinkSync(inputPath);
      return res.status(400).send('この形式は変換できません');
    }

    // 変換
    const cmd = `"${ffmpegPath}" -y -i "${inputPath}" "${outputPath}"`;
    exec(cmd, (err2, stdout2, stderr2) => {
      fs.unlinkSync(inputPath); // 元ファイル削除
      if (err2) {
        console.error(stderr2);
        return res.status(500).send('変換中にエラーが発生しました');
      }

      // 5分後に変換ファイルを削除
      setTimeout(() => {
        if (fs.existsSync(outputPath)) fs.unlink(outputPath, e => e && console.error(e));
      }, 5*60*1000);

      const downloadUrl = `/download/${outputFilename}`;
      res.render('index', { downloadUrl, formatInfo });
    });
  });
});

// ダウンロード
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(tmpDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('ファイルが存在しません');

  const ext = path.extname(filename).substring(1);
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
