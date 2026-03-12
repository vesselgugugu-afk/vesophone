export function useMusicApi() {
  const METING_API = 'https://api.qijieya.cn/meting/';
  const GD_API = 'https://music-api.gdstudio.xyz/api.php';
  const LYRIC_API_BASE = 'https://music-api.gdstudio.xyz/api.php';

  const normalize = (str) => (str || '').toLowerCase().replace(/\s|\(.*\)|（.*）|\[.*\]|【.*】/g, '');

  const checkAudioAvailability = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch (e) {
      return false;
    }
  };

  const Fetcher = {
    async meting(source, query, mode, songName, artistName) {
      try {
        const search = await fetch(`${METING_API}?server=${source}&type=search&keyword=${encodeURIComponent(query)}`).then(r => r.json());
        if (!search || !search.length) return null;
        const tSong = normalize(songName);
        const tArtist = normalize(artistName);

        for (const item of search) {
          const s = normalize(item.title || item.name);
          const a = normalize(item.artist || item.author);
          let ok = false;
          if (mode === 2) ok = s.includes(tSong) && a.includes(tArtist);
          else if (mode === 1) ok = s.includes(tSong);
          else ok = true;
          if (!ok) continue;

          const urlRes = await fetch(`${METING_API}?server=${source}&type=url&id=${item.id || item.pic_id}`).then(r => r.json());
          let finalUrl = urlRes.url || (typeof urlRes === 'string' ? urlRes : '');
          if (finalUrl && (await checkAudioAvailability(finalUrl))) {
            let cover = item.pic || item.cover;
            if (!cover || cover.includes('no_cover')) {
              const picRes = await fetch(`${METING_API}?server=${source}&type=pic&id=${item.pic_id || item.id}`).then(r => r.text());
              if (picRes.startsWith('http')) cover = picRes;
            }
            return { url: finalUrl, cover, lrc_id: item.id, lrc_src: source === 'tencent' ? 'tencent' : 'netease' };
          }
        }
      } catch (e) {}
      return null;
    },
    async gd(source, query, mode, songName, artistName) {
      try {
        const count = mode === 0 ? 10 : 5;
        const search = await fetch(`${GD_API}?types=search&count=${count}&source=${source}&name=${encodeURIComponent(query)}`).then(r => r.json());
        if (!search || !search.length) return null;
        const tSong = normalize(songName);
        const tArtist = normalize(artistName);

        for (const item of search) {
          const s = normalize(item.name);
          const a = normalize(Array.isArray(item.artist) ? item.artist.join('') : item.artist);
          let ok = false;
          if (mode === 2) ok = s.includes(tSong) && a.includes(tArtist);
          else if (mode === 1) ok = s.includes(tSong);
          else ok = true;
          if (!ok) continue;

          let finalUrl = '';
          if (source === 'netease') {
            try {
              const res = await fetch(`https://v.iarc.top/?type=url&id=${item.id}`);
              if (res.ok) {
                const cType = res.headers.get('content-type');
                if (res.url && !cType?.includes('json')) finalUrl = res.url;
                else {
                  const j = await res.json();
                  finalUrl = (Array.isArray(j) ? j[0].url : j.url) || j.data?.url;
                }
              }
            } catch (e) {}
          } else {
            const u = await fetch(`${GD_API}?types=url&source=${source}&id=${item.id}&br=320`).then(r => r.json());
            if (u.url) finalUrl = u.url;
          }
          if (finalUrl && finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'https://');
          if (finalUrl && (await checkAudioAvailability(finalUrl))) {
            let cover = '';
            try {
              const pic = await fetch(`${GD_API}?types=pic&source=${source}&id=${item.pic_id}`).then(r => r.json());
              cover = pic.url;
            } catch (e) {}
            return { url: finalUrl, cover, lrc_id: item.id, lrc_src: source };
          }
        }
      } catch (e) {}
      return null;
    }
  };

  const STRATEGIES = [
    { type: 'meting', source: 'netease', label: '网易云(Meting)' },
    { type: 'meting', source: 'tencent', label: 'QQ音乐(Meting)' },
    { type: 'gd', source: 'netease', label: '网易云(New)' },
    { type: 'gd', source: 'joox', label: 'Joox(GD)' },
    { type: 'gd', source: 'kuwo', label: '酷我(GD)' },
  ];

  const resolveBestMatch = async (name, artist, onProgress) => {
    const fullQuery = `${name} ${artist}`;
    const cleanName = name;
    
    for (const s of STRATEGIES) {
      if(onProgress) onProgress(`Precision Scan: ${s.label}...`);
      const res = s.type === 'meting' 
        ? await Fetcher.meting(s.source, fullQuery, 2, name, artist)
        : await Fetcher.gd(s.source, fullQuery, 2, name, artist);
      if (res) return res;
    }
    for (const s of STRATEGIES) {
      if(onProgress) onProgress(`Fuzzy Scan: ${s.label}...`);
      const res = s.type === 'meting'
        ? await Fetcher.meting(s.source, cleanName, 1, name, artist)
        : await Fetcher.gd(s.source, cleanName, 1, name, artist);
      if (res) return res;
    }
    const ForceStrategies = [STRATEGIES[0], STRATEGIES[1], STRATEGIES[2]];
    for (const s of ForceStrategies) {
      if(onProgress) onProgress(`Force Resolve: ${s.label}...`);
      const res = s.type === 'meting'
        ? await Fetcher.meting(s.source, cleanName, 0, name, artist)
        : await Fetcher.gd(s.source, cleanName, 0, name, artist);
      if (res) return res;
    }
    return null;
  };

  const fetchLyrics = async (id, src, name, artist) => {
    let lrcText = '';
    const getLrcById = async (tid, tsrc) => {
      try {
        if (tsrc === 'tencent' || tsrc === 'netease' || tsrc === 'meting') {
          const r = await fetch(`${METING_API}?server=${tsrc === 'meting' ? 'netease' : tsrc}&type=lrc&id=${tid}`).then(j => j.json());
          return r.lyric;
        } else {
          const r = await fetch(`${GD_API}?types=lyric&id=${tid}&source=${tsrc}`).then(j => j.json());
          return r.lyric;
        }
      } catch (e) { return null; }
    };
    
    lrcText = await getLrcById(id, src);
    if (!lrcText) {
      const cleanName = name.replace(/\(.*\)|（.*）/g, '').trim();
      const cleanArtist = artist.replace(/\(.*\)|（.*）/g, '').split(/[\/,&;、]/)[0].trim();
      const strategies = [
        { q: `${cleanName} ${cleanArtist}`, sources: ['netease', 'tencent', 'kuwo'] },
        { q: cleanName, sources: ['netease', 'tencent'] },
      ];
      outerLoop: for (const strat of strategies) {
        for (const s of strat.sources) {
          try {
            const searchRes = await fetch(`${LYRIC_API_BASE}?types=search&count=3&source=${s}&name=${encodeURIComponent(strat.q)}`).then(r => r.json());
            if (searchRes && searchRes.length > 0) {
              for (let i = 0; i < Math.min(searchRes.length, 3); i++) {
                const targetId = searchRes[i].lyric_id || searchRes[i].id;
                if (targetId) {
                  const res = await getLrcById(targetId, s);
                  if (res) { lrcText = res; break outerLoop; }
                }
              }
            }
          } catch (e) {}
        }
      }
    }
    return lrcText;
  };

  // 【新增】带轮询状态广播的搜索方法
  const searchMusic = async (q, onProgress) => {
    const SEARCH_SOURCES = [
      { id: 'netease', name: '网易云音乐' }, 
      { id: 'tencent', name: 'QQ音乐' }, 
      { id: 'kuwo', name: '酷我音乐' }, 
      { id: 'kugou', name: '酷狗音乐' }
    ];
    
    for (const source of SEARCH_SOURCES) {
      try {
        if(onProgress) onProgress(`正在检索 ${source.name}...`);
        const res = await fetch(`${GD_API}?types=search&count=20&source=${source.id}&name=${encodeURIComponent(q)}`).then(r => r.json());
        if (res && res.length > 0) return res;
      } catch (e) { 
        console.warn(`Source ${source.id} failed, trying next...`); 
      }
    }
    return [];
  };

  return { resolveBestMatch, fetchLyrics, searchMusic };
}
