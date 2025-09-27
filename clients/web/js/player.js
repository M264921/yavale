(function () {
  const $ = s => document.querySelector(s);
  const streamInput = $('#streamUrl');
  const btnPlay = $('#btnPlay');
  const video = $('#player');

  function isM3U8(u) {
    try { return new URL(u).pathname.endsWith('.m3u8'); } catch { return false; }
  }

  async function play(url) {
    if (!url) return alert('Pon una URL de stream (m3u8 o MP4)');
    // Safari en iOS suele soportar HLS nativamente en <video>,
    // en Chrome/Firefox de escritorio necesitamos hls.js.
    if (isM3U8(url) && window.Hls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (ev, data) => {
        console.error('HLS error', data);
        alert('Error en HLS: ' + (data && data.details ? data.details : 'desconocido'));
      });
    } else {
      video.src = url;
    }
    video.play().catch(err => {
      console.error(err);
      alert('No se pudo iniciar la reproducción: ' + err.message);
    });
  }

  btnPlay.addEventListener('click', () => play(streamInput.value.trim()));
})();
