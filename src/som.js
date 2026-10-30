let audio
export function bipe(freq, duracao) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    const osc = audio.createOscillator()
    const vol = audio.createGain()
    osc.frequency.value = freq
    vol.gain.value = 0.15
    osc.connect(vol).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + duracao)
  } catch {}
}
