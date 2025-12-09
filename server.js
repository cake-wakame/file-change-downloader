const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();

// tmp ディレクトリ作成（存在しない場合）
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const upload = multer({ dest: tmpDir });

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/convert', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputFormat = req.body.format;
  const originalName = path.parse(req.file.originalname).name;
  const outputFileName = `${originalName}.${outputFormat}`;
  const outputPath = path.join(tmpDir, `${req.file.filename}.${outputFormat}`);

  const ffmpegPath = '/usr/bin/ffmpeg';
  const command = `${ffmpegPath} -y -i "${inputPath}" "${outputPath}"`;

  exec(command, (err, stdout, stderr) => {
    fs.unlinkSync(inputPath); // 元ファイル削除
    if (err) {
      console.error(stderr);
      return res.status(500).send('変換中にエラーが発生しました');
    }

    const downloadUrl = `/download/${path.basename(outputPath)}`;
    res.render('index', { downloadUrl });
  });
});

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

  filestream.on('close', () => {
    fs.unlink(filePath, (err) => { if (err) console.error(err); });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
