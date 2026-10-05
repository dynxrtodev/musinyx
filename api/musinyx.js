module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action;
  const VPS_IP = "http://176.112.152.131:3050";

  if (action === 'search') {
    const q = req.query.q || '';
    const targetUrl = `${VPS_IP}/api/search?q=${encodeURIComponent(q)}`;
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Gagal nyambung ke VPS: " + error.message });
    }
  } 
  else if (action === 'home') {
    // TAMBAHAN BARU BUAT LOAD BERANDA
    const targetUrl = `${VPS_IP}/api/home`;
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Gagal nyambung ke VPS: " + error.message });
    }
  }
  else if (action === 'stream') {
    const id = req.query.id;
    const streamUrl = `${VPS_IP}/stream/${id}`;
    return res.redirect(302, streamUrl);
  } 
  else {
    return res.status(400).json({ error: "Action tidak dikenali." });
  }
};
