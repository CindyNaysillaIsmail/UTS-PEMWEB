
const express = require("express"); // memudahkan pembuatan server dan api

const mysql = require("mysql2"); // menghubungkan node js dan mysql
const bodyParser = require("body-parser"); // untuk me,bantu server membaca data
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // membaca data json dari body (HTTP request yg berisi data dan dikirimkan ke client)
app.use(bodyParser.json());

// Database connection (adjust config as needed)
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // put your MySQL password here
  database: "dana_kas", // set your database name here
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database.");
});

app.get("/", (req, res) => { //halaman utama saat membuka server
  res.send("Cindy<br><h1>Naysilla Ismail</h1>");
});
// menampilkan halaman dashboard dqn ringkasan data masuk dan 
app.get("/api/dashboard", (req, res) => {
  const masukSql =
    "SELECT IFNULL(SUM(jumlah),0) AS total_masuk FROM transaksi WHERE jenis = 'masuk'";
  const keluarSql =
    "SELECT IFNULL(SUM(jumlah),0) AS total_keluar FROM transaksi WHERE jenis = 'keluar'";
  db.query(masukSql, (err, masukResults) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(keluarSql, (err, keluarResults) => {
      if (err) return res.status(500).json({ error: err.message });
      const total_masuk = masukResults[0].total_masuk;
      const total_keluar = keluarResults[0].total_keluar;
      const saldo = total_masuk - total_keluar;
      res.json({ total_masuk, total_keluar, saldo });
    });
  });
});


app.get("/api/akun", (req, res) => { // buat melihat halaman get akun nya
  db.query("SELECT * FROM akun", (err, results) => { // mengambil data dari table di db 
    if (err) return res.status(500).json({ error: err.message });
    res.json(results); // jika berhasil akan dikirimkan ke client dalam format json
  });
});

app.post("/api/akun", (req, res) => { // untuk melihat post akun
  const { no_akun, nama_akun } = req.body; // ini bagian body
  if (!no_akun || !nama_akun) {
    return res
      .status(400)
      .json({ error: "no_akun and nama_akun are required" });
  }
  const query = "INSERT INTO akun (no_akun, nama_akun) VALUES (?, ?)"; // sintaks untuk menyimpan ke db 
  db.query(query, [no_akun, nama_akun], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ no_akun, nama_akun }); // berhasil
  });
});

app.put("/api/akun/:no_akun", (req, res) => {
  const { no_akun } = req.params;
  const { nama_akun } = req.body;
  if (!nama_akun) {
    return res.status(400).json({ error: "nama_akun is required" });
  }
  const query = "UPDATE akun SET nama_akun = ? WHERE no_akun = ?";
  db.query(query, [nama_akun, no_akun], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ no_akun, nama_akun });
  });
});

app.delete("/api/akun/:no_akun", (req, res) => {
  const { no_akun } = req.params;
  const query = "DELETE FROM akun WHERE no_akun = ?";
  db.query(query, [no_akun], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// Routes for transaksi
app.get("/api/transaksi", (req, res) => {
  const search = req.query.search || "";
  let sql = `
    SELECT 
      t.id,
      t.tanggal,
      t.no_bukti,
      t.diterima_dari,
      CONCAT(a.no_akun, ' ', a.nama_akun) AS untuk_keperluan,
      t.jumlah,
      t.jenis
    FROM transaksi t
    LEFT JOIN akun a ON t.untuk_keperluan = a.no_akun
  `;
  let params = [];
  if (search) {
    sql +=
      " WHERE t.no_bukti LIKE ? OR t.diterima_dari LIKE ? OR CONCAT(a.no_akun, ' ', a.nama_akun) LIKE ?";
    const likeSearch = "%" + search + "%";
    params = [likeSearch, likeSearch, likeSearch];
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/transaksi", (req, res) => {
  const { tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis } =
    req.body;
  if (
    !tanggal ||
    !no_bukti ||
    !diterima_dari ||
    !untuk_keperluan ||
    !jumlah ||
    !jenis
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const query =
    "INSERT INTO transaksi (tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    query,
    [tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: results.insertId,
        tanggal,
        no_bukti,
        diterima_dari,
        untuk_keperluan,
        jumlah,
        jenis,
      });
    }
  );
});

app.put("/api/transaksi/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis } =
    req.body;
  if (
    !tanggal ||
    !no_bukti ||
    !diterima_dari ||
    !untuk_keperluan ||
    !jumlah ||
    !jenis
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const query =
    "UPDATE transaksi SET tanggal = ?, no_bukti = ?, diterima_dari = ?, untuk_keperluan = ?, jumlah = ?, jenis = ? WHERE id = ?";
  db.query(
    query,
    [tanggal, no_bukti, diterima_dari, untuk_keperluan, jumlah, jenis, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id,
        tanggal,
        no_bukti,
        diterima_dari,
        untuk_keperluan,
        jumlah,
        jenis,
      });
    }
  );
});

app.delete("/api/transaksi/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM transaksi WHERE id = ?";
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});