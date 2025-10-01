(function () {
  const $ = selector => document.querySelector(selector);
  const streamInput = $('#streamUrl');
  const btnPlay = $('#btnPlay');
  const video = $('#player');

  function isM3U8(url) {
    try {
      return new URL(url).pathname.endsWith('.m3u8');
    } catch (error) {
      return false;
    }
  }

  async function play(url) {
    if (!url) {
      alert('Introduce una URL de stream (m3u8 o MP4)');
      return;
    }

    if (isM3U8(url) && window.Hls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error', data);
        alert('Error en HLS: ' + (data && data.details ? data.details : 'desconocido'));
      });
    } else {
      video.src = url;
    }

    video.play().catch((error) => {
      console.error(error);
      alert('No se pudo iniciar la reproduccion: ' + error.message);
    });
  }

  btnPlay.addEventListener('click', () => play(streamInput.value.trim()));
})();
