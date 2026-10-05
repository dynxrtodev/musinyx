module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  const VPS_IP = "http://143.198.214.247:25583";

  if (action === 'search') {
    const q = req.query.q || '';
    try {
      const response = await fetch(`${VPS_IP}/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Gagal nyambung ke VPS" });
    }
  } 
  else if (action === 'home') {
    try {
      const response = await fetch(`${VPS_IP}/api/home`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Gagal nyambung ke VPS" });
    }
  }
  else if (action === 'stream') {
    const id = req.query.id;
    // Vercel backend nembak HTTP VPS (Gak akan kena Mixed Content)
    try {
      const response = await fetch(`${VPS_IP}/api/get-stream-url/${id}`);
      const data = await response.json();
      if (data.status === 'success' && data.url) {
        // Redirect browser lu langsung ke HTTPS Savetube!
        return res.redirect(302, data.url);
      } else {
        return res.status(500).json({ error: "Gagal narik URL dari VPS" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Koneksi VPS gagal" });
    }
  } 
  else {
    return res.status(400).json({ error: "Action tidak dikenali." });
  }
};
