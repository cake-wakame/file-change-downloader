const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();

// tmp ディレクトリ作成
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const upload = multer({ dest: tmpDir });

app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index'));

// 変換処理
app.post('/convert', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputFormat = req.body.format;
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
        fs.unlink(outputPath, e => { if (e) console.error(e); });
      }
    }, 5 * 60 * 1000);

    const downloadUrl = `/download/${outputFilename}`;
    res.render('index', { downloadUrl });
  });
});

// ダウンロード処理
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(tmpDir, filename);

  if (!fs.existsSync(filePath)) return res.status(404).send('ファイルが存在しません');

  const ext = path.extname(filename).substring(1);
  const contentTypeMap = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac'
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const filestream = fs.createReadStream(filePath);
  filestream.pipe(res);
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
