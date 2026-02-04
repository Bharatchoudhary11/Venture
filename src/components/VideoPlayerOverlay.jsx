import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'

let ytApiPromise
const loadYouTubeAPI = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
      if (existing) {
        const checkReady = () => {
          if (window.YT && window.YT.Player) {
            resolve(window.YT)
          } else {
            setTimeout(checkReady, 50)
          }
        }
        checkReady()
        return
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      window.onYouTubeIframeAPIReady = () => resolve(window.YT)
    })
  }
  return ytApiPromise
}

const extractVideoId = (candidate) => {
  if (!candidate) return ''
  const clean = candidate.split('?')[0]
  try {
    const parsed = new URL(candidate)
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/').pop()
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || ''
      return parsed.pathname.replace('/', '')
    }
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '')
    }
  } catch {
    return clean
  }
  return clean
}

const IconPlay = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M10 6l16 10-16 10z" fill="currentColor" />
  </svg>
)

const IconPause = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M9 6h6v20H9zM17 6h6v20h-6z" fill="currentColor" />
  </svg>
)

const IconSkipForward = () => (
  <svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">
    <path d="M6 6l14 10-14 10zM22 6l14 10-14 10zM38 6l4 2.8v14.4L38 26z" fill="currentColor" />
  </svg>
)

const IconSkipBackward = () => (
  <svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">
    <path d="M42 26L28 16l14-10zM26 26L12 16l14-10zM10 26l-4-2.8V8.8L10 6z" fill="currentColor" />
  </svg>
)

export function VideoPlayerOverlay({ video, onClose }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const videoId = useMemo(() => extractVideoId(video.mediaUrl || video.slug), [video.mediaUrl, video.slug])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    let isMounted = true
    setPlayerReady(false)
    setIsPlaying(true)
    loadYouTubeAPI()
      .then((YT) => {
        if (!isMounted || !containerRef.current || !YT) return
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1 },
          events: {
            onReady: (event) => {
              if (!isMounted) return
              setPlayerReady(true)
              event.target.playVideo()
            },
            onStateChange: (event) => {
              if (!isMounted) return
              const { PlayerState } = window.YT
              if (event.data === PlayerState.PLAYING || event.data === PlayerState.BUFFERING) {
                setIsPlaying(true)
              } else if (event.data === PlayerState.PAUSED || event.data === PlayerState.ENDED) {
                setIsPlaying(false)
              }
            },
          },
        })
      })
      .catch(() => {})

    return () => {
      isMounted = false
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [videoId])

  const togglePlay = () => {
    const player = playerRef.current
    if (!player || !window.YT) return
    const state = player.getPlayerState()
    if (state === window.YT.PlayerState.PLAYING) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }

  const seekBy = (seconds) => {
    const player = playerRef.current
    if (!player) return
    const current = player.getCurrentTime?.() ?? 0
    player.seekTo(Math.max(0, current + seconds), true)
  }

  return (
    <div className="player-overlay" role="dialog" aria-modal="true">
      <button className="overlay-close" aria-label="Close player" onClick={onClose}>
        ×
      </button>
      <div className="player-frame">
        <div className="iframe-shell">
          <div ref={containerRef} className="yt-container" />
          {!playerReady && <div className="player-loading">Loading player…</div>}
        </div>
        <div className="player-meta">
          <span className="category-chip">{video.categoryName}</span>
          <h2>{video.title}</h2>
        </div>
        <div className="player-controls">
          <button className="icon-button" onClick={() => seekBy(-10)} aria-label="Skip backward 10 seconds">
            <IconSkipBackward />
            <span className="sr-only">Skip backward 10 seconds</span>
          </button>
          <button className="icon-button" onClick={togglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'}>
            {isPlaying ? <IconPause /> : <IconPlay />}
            <span className="sr-only">{isPlaying ? 'Pause video' : 'Play video'}</span>
          </button>
          <button className="icon-button" onClick={() => seekBy(10)} aria-label="Skip forward 10 seconds">
            <IconSkipForward />
            <span className="sr-only">Skip forward 10 seconds</span>
          </button>
        </div>
      </div>
    </div>
  )
}

VideoPlayerOverlay.propTypes = {
  video: PropTypes.shape({
    title: PropTypes.string.isRequired,
    mediaUrl: PropTypes.string.isRequired,
    categoryName: PropTypes.string.isRequired,
    slug: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
}
