const express = require("express");
const { scanUrl } = require("../services/scanner");

const router = express.Router();

router.post("/", async (req, res) => {
  const rawUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!rawUrl) {
    return res.status(400).json({ error: "Masukkan alamat URL yang ingin diperiksa." });
  }

  try {
    const result = await scanUrl(rawUrl);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({
      error: err.message || "Tautan belum dapat diperiksa saat ini.",
    });
  }
});

module.exports = router;
