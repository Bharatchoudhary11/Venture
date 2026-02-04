import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const VIRTUAL_ITEM_HEIGHT = 84
const VIRTUAL_BUFFER = 6

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

const IconExpand = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M6 4h5v2H8v3H6V4zm7 0h5v5h-2V6h-3V4zM6 13h2v3h3v2H6v-5zm10 3v-3h2v5h-5v-2h3z"
    />
  </svg>
)

const IconCollapse = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M8 5h3V3H5v6h2zm8 0v4h2V3h-6v2zm-5 13H8v3H3v-6h2v4h4zm8 4v-4h-4v-2h6v6z"
    />
  </svg>
)

const IconMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M4 16.5A1.5 1.5 0 0 1 5.5 15h13a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z"
    />
    <path
      d="M7 4h7a2 2 0 0 1 2 2v4H5V6a2 2 0 0 1 2-2z"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
    />
  </svg>
)

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00'
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function VideoPlayerOverlay({ video, categories = [], onVideoSelect, onClose }) {
  const ytContainerRef = useRef(null)
  const playerRef = useRef(null)
  const htmlVideoRef = useRef(null)
  const progressIntervalRef = useRef(null)
  const surfaceRef = useRef(null)
  const frameRef = useRef(null)
  const touchStartRef = useRef(null)
  const dragStartRef = useRef(null)
  const dragOffsetRef = useRef(0)
  const dragAnimationRef = useRef(null)
  const virtualListRef = useRef(null)
  const virtualIndicesRef = useRef({ start: 0, end: 0 })
  const autoPlayTimerRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [relatedOpen, setRelatedOpen] = useState(false)
  const [pipMode, setPipMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [countdown, setCountdown] = useState(null)

  const isYouTube =
    video.mediaType?.toUpperCase() === 'YOUTUBE' ||
    /youtube\.com|youtu\.be/.test(video.mediaUrl ?? '')
  const videoId = useMemo(() => extractVideoId(video.mediaUrl || video.slug), [video.mediaUrl, video.slug])
  const updateDragOffset = useCallback((value) => {
    dragOffsetRef.current = value
    if (dragAnimationRef.current) {
      cancelAnimationFrame(dragAnimationRef.current)
    }
    dragAnimationRef.current = requestAnimationFrame(() => {
      setDragOffset(value)
      dragAnimationRef.current = null
    })
  }, [])

  useEffect(() => {
    return () => {
      if (dragAnimationRef.current) cancelAnimationFrame(dragAnimationRef.current)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setPlayerReady(false)
    setIsPlaying(true)
    setCurrentTime(0)
    setDuration(0)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    dragStartRef.current = null
    setIsDragging(false)
    setPipMode(false)
    updateDragOffset(0)
  }, [updateDragOffset, videoId, video.mediaUrl])

  const togglePlay = () => {
    if (isYouTube) {
      const player = playerRef.current
      if (!player || !window.YT) return
      const state = player.getPlayerState()
      if (state === window.YT.PlayerState.PLAYING) {
        player.pauseVideo()
      } else {
        player.playVideo()
      }
      return
    }
    const videoElement = htmlVideoRef.current
    if (!videoElement) return
    if (videoElement.paused) {
      videoElement.play()
    } else {
      videoElement.pause()
    }
  }

  const seekBy = (delta) => {
    const nextTime = Math.min(Math.max((currentTime ?? 0) + delta, 0), duration || 0)
    if (isYouTube) {
      const player = playerRef.current
      if (!player) return
      player.seekTo(nextTime, true)
    } else {
      const videoElement = htmlVideoRef.current
      if (!videoElement) return
      videoElement.currentTime = nextTime
    }
    setCurrentTime(nextTime)
  }

  const handleSeekChange = (event) => {
    const next = Number(event.target.value)
    if (!Number.isFinite(next)) return
    if (isYouTube) {
      playerRef.current?.seekTo(next, true)
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = next
    }
    setCurrentTime(next)
  }
  const progressPercent = duration ? Math.min((currentTime / duration) * 100, 100) : 0

  const relatedCategory = useMemo(() => {
    return (
      categories.find(
        (entry) => entry.name === video.categoryName || entry.slug === video.categorySlug,
      ) || null
    )
  }, [categories, video.categoryName, video.categorySlug])

  const relatedVideos = useMemo(() => {
    return relatedCategory?.videos ?? []
  }, [relatedCategory])

  const handleRelatedSelect = useCallback(
    (nextVideo) => {
      if (!nextVideo || nextVideo.id === video.id) return
      onVideoSelect?.(nextVideo)
    },
    [onVideoSelect, video.id],
  )

  const playNextInCategory = useCallback(() => {
    if (!relatedVideos.length) return
    const currentIndex = relatedVideos.findIndex((item) => item.id === video.id)
    if (currentIndex === -1) return
    const nextVideo = relatedVideos[currentIndex + 1]
    if (nextVideo) {
      handleRelatedSelect(nextVideo)
    }
  }, [handleRelatedSelect, relatedVideos, video.id])
  useEffect(() => {
    if (countdown == null) return
    if (countdown === 0) {
      playNextInCategory()
      setCountdown(null)
      return
    }
    autoPlayTimerRef.current = setTimeout(() => setCountdown((value) => (value ?? 0) - 1), 1000)
    return () => clearTimeout(autoPlayTimerRef.current)
  }, [countdown, playNextInCategory])

  useEffect(() => {
    if (!isYouTube) return
    let isMounted = true
    loadYouTubeAPI()
      .then((YT) => {
        if (!isMounted || !ytContainerRef.current || !YT) return
        playerRef.current = new YT.Player(ytContainerRef.current, {
          videoId,
          playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1 },
          events: {
            onReady: (event) => {
              if (!isMounted) return
              setDuration(event.target.getDuration?.() ?? 0)
              setPlayerReady(true)
              event.target.playVideo()
              progressIntervalRef.current = window.setInterval(() => {
                if (!playerRef.current) return
                const time = playerRef.current.getCurrentTime?.() ?? 0
                setCurrentTime(time)
                const total = playerRef.current.getDuration?.()
                if (total) setDuration(total)
              }, 500)
            },
            onStateChange: (event) => {
              if (!isMounted) return
              const { PlayerState } = window.YT
              if (event.data === PlayerState.PLAYING || event.data === PlayerState.BUFFERING) {
                setIsPlaying(true)
                setCountdown(null)
              } else if (event.data === PlayerState.PAUSED) {
                setIsPlaying(false)
              } else if (event.data === PlayerState.ENDED) {
                setIsPlaying(false)
                setCountdown(2)
              }
            },
          },
        })
      })
      .catch(() => {})

    return () => {
      isMounted = false
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [isYouTube, playNextInCategory, videoId])

  useEffect(() => {
    if (isYouTube) return
    const videoElement = htmlVideoRef.current
    if (!videoElement) return

    const handleLoaded = () => {
      setDuration(videoElement.duration || 0)
      setPlayerReady(true)
      videoElement.play().catch(() => {})
    }
    const handleTime = () => setCurrentTime(videoElement.currentTime || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCountdown(2)
    }

    videoElement.addEventListener('loadedmetadata', handleLoaded)
    videoElement.addEventListener('timeupdate', handleTime)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('ended', handleEnded)

    videoElement.play().catch(() => {})

    return () => {
      videoElement.pause()
      videoElement.removeEventListener('loadedmetadata', handleLoaded)
      videoElement.removeEventListener('timeupdate', handleTime)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('ended', handleEnded)
    }
  }, [isYouTube, playNextInCategory, video.mediaUrl])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const handleWheel = (event) => {
      if (!relatedOpen && event.deltaY > 12) {
        setRelatedOpen(true)
      } else if (relatedOpen && event.deltaY < -12) {
        setRelatedOpen(false)
      }
    }

    const handleTouchStart = (event) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null
    }

    const handleTouchMove = (event) => {
      if (touchStartRef.current == null) return
      const currentY = event.touches[0]?.clientY ?? touchStartRef.current
      const delta = touchStartRef.current - currentY
      if (!relatedOpen && delta > 30) {
        setRelatedOpen(true)
        touchStartRef.current = currentY
      } else if (relatedOpen && delta < -30) {
        setRelatedOpen(false)
        touchStartRef.current = currentY
      }
    }

    surface.addEventListener('wheel', handleWheel, { passive: true })
    surface.addEventListener('touchstart', handleTouchStart, { passive: true })
    surface.addEventListener('touchmove', handleTouchMove, { passive: true })

    const handleVirtualScroll = () => {
      const container = virtualListRef.current
      if (!container) return
      const scrollTop = container.scrollTop
      const visibleCount = Math.ceil(container.clientHeight / VIRTUAL_ITEM_HEIGHT)
      const start = Math.max(0, Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER)
      const end = Math.min(relatedVideos.length, start + visibleCount + VIRTUAL_BUFFER * 2)
      virtualIndicesRef.current = { start, end }
      container.style.setProperty('--virtual-start', `${start * VIRTUAL_ITEM_HEIGHT}px`)
      setRenderTick((tick) => tick + 1)
    }

    const relatedListEl = virtualListRef.current
    relatedListEl?.addEventListener('scroll', handleVirtualScroll, { passive: true })

    return () => {
      surface.removeEventListener('wheel', handleWheel)
      surface.removeEventListener('touchstart', handleTouchStart)
      surface.removeEventListener('touchmove', handleTouchMove)
      relatedListEl?.removeEventListener('scroll', handleVirtualScroll)
    }
  }, [relatedOpen, relatedVideos.length])

  useEffect(() => {
    if (pipMode) {
      setRelatedOpen(false)
    }
  }, [pipMode])

  useEffect(() => {
    if (!isDragging) return
    const handlePointerMove = (event) => {
      if (dragStartRef.current == null) return
      const delta = event.clientY - dragStartRef.current
      if (!pipMode) {
        updateDragOffset(Math.max(0, delta))
      } else {
        updateDragOffset(Math.min(0, delta))
      }
    }

    const handlePointerUp = () => {
      const offset = dragOffsetRef.current
      if (!pipMode && offset > 140) {
        setPipMode(true)
        setRelatedOpen(false)
      } else if (pipMode && offset < -80) {
        setPipMode(false)
      }
      dragStartRef.current = null
      updateDragOffset(0)
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isDragging, pipMode, updateDragOffset])

  const handleDragStart = useCallback(
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const target = event.target
      if (
        target.closest('.player-ui') ||
        target.closest('.player-controls') ||
        target.closest('.player-progress') ||
        target.closest('.related-panel')
      ) {
        return
      }
      dragStartRef.current = event.clientY ?? 0
      setIsDragging(true)
      event.stopPropagation()
      event.preventDefault()
    },
    [],
  )

  useEffect(() => {
    const host = frameRef.current?.closest('.overlay-shell')
    if (!host) return
    host.classList.toggle('pip-floating', pipMode)
    return () => {
      host.classList.remove('pip-floating')
    }
  }, [pipMode])

  const overlayClassName = `player-overlay${pipMode ? ' pip-mode' : ''}`
  const frameClassName = `player-frame${pipMode ? ' pip-active' : ''}${isDragging ? ' dragging' : ''}`
  const frameStyle = { transform: `translate3d(0, ${dragOffset}px, 0)` }

  const toggleFullscreen = () => {
    if (pipMode) {
      setPipMode(false)
      return
    }
    if (isFullscreen) {
      document.exitFullscreen?.()
      return
    }
    const target = surfaceRef.current
    target?.requestFullscreen?.()
  }

  return (
    <div className={overlayClassName} role="dialog" aria-modal="true">
      {!pipMode && (
        <button className="overlay-close" aria-label="Close player" onClick={onClose}>
          ×
        </button>
      )}
      <div
        className={frameClassName}
        style={frameStyle}
        ref={frameRef}
        onPointerDown={pipMode ? handleDragStart : undefined}
      >
        <div className="iframe-shell" ref={surfaceRef}>
          <div className="drag-overlay" onPointerDown={handleDragStart} role="presentation">
            <span />
            <p>{pipMode ? 'Drag up to expand' : 'Drag down for mini player'}</p>
          </div>
          {isYouTube ? (
            <>
              <div ref={ytContainerRef} className="yt-container" />
              {!playerReady && <div className="player-loading">Loading player…</div>}
            </>
          ) : (
            <>
              <video ref={htmlVideoRef} src={video.mediaUrl} playsInline />
              {!playerReady && <div className="player-loading">Loading video…</div>}
            </>
          )}
          <div className="player-ui">
            <div className="player-progress compact">
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Number.isFinite(currentTime) ? currentTime : 0}
                onChange={handleSeekChange}
                disabled={!playerReady || !Number.isFinite(duration) || duration === 0}
                aria-label="Seek"
                style={{ '--progress': `${progressPercent}%` }}
              />
              <div className="timecodes">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          <div className="player-controls compact">
            <button
              className="icon-button secondary"
              onClick={() => seekBy(-10)}
              aria-label="Skip backward 10 seconds"
              >
                <IconSkipBackward />
                <span className="sr-only">Skip backward 10 seconds</span>
              </button>
              <button
                className="icon-button primary"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <IconPause /> : <IconPlay />}
                <span className="sr-only">{isPlaying ? 'Pause video' : 'Play video'}</span>
              </button>
            <button
              className="icon-button secondary"
              onClick={() => seekBy(10)}
              aria-label="Skip forward 10 seconds"
            >
              <IconSkipForward />
              <span className="sr-only">Skip forward 10 seconds</span>
            </button>
            {!pipMode && (
              <button
                className="icon-button secondary fullscreen"
                onClick={() => setPipMode(true)}
                aria-label="Minimize player"
              >
                <IconMini />
                <span className="sr-only">Minimize player</span>
              </button>
            )}
            <button
              className="icon-button secondary fullscreen"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <IconCollapse /> : <IconExpand />}
              <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
            </button>
          </div>
        </div>
          <div className={`related-panel ${relatedOpen ? 'open' : ''}`}>
            <button
              className="panel-toggle"
              onClick={() => setRelatedOpen((prev) => !prev)}
              aria-label={relatedOpen ? 'Hide related videos' : 'Show related videos'}
            >
              <span className="panel-handle" />
              <span className="panel-label">{relatedOpen ? 'Hide list' : 'Up next'}</span>
            </button>
            <div className="panel-inner">
              <div className="related-header">
                <div>
                  <p className="eyebrow">Related</p>
                  <h3>{video.categoryName}</h3>
                </div>
                <span>{relatedVideos.length} videos</span>
              </div>
              <div className="related-list">
                {relatedVideos.map((item) => (
                  <button
                    key={item.id}
                    className={`related-card ${item.id === video.id ? 'active' : ''}`}
                    onClick={() => handleRelatedSelect(item)}
                    disabled={item.id === video.id}
                  >
                    <img src={item.thumbnailUrl} alt="" className="related-thumb" />
                    <div>
                      <p className="related-title">{item.title}</p>
                      <p className="related-meta">{item.duration ?? '—:—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {pipMode && (
            <div className="pip-toolbar">
              <div className="pip-title" title={video.title}>
                {video.title}
              </div>
              <div className="pip-actions">
                <button
                  className="pip-control"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPipMode(false)
                  }}
                >
                  <IconExpand />
                  <span className="sr-only">Expand player</span>
                </button>
                <button
                  className="pip-control"
                  onClick={(event) => {
                    event.stopPropagation()
                    togglePlay()
                  }}
                >
                  {isPlaying ? <IconPause /> : <IconPlay />}
                  <span className="sr-only">{isPlaying ? 'Pause video' : 'Play video'}</span>
                </button>
                <button
                  className="pip-control close"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose()
                  }}
                >
                  ×
                  <span className="sr-only">Close mini player</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="player-meta">
          <span className="category-chip">{video.categoryName}</span>
          <h2>{video.title}</h2>
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
    categorySlug: PropTypes.string,
    slug: PropTypes.string,
    mediaType: PropTypes.string,
  }).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      videos: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          thumbnailUrl: PropTypes.string,
          duration: PropTypes.string,
          mediaUrl: PropTypes.string.isRequired,
          categoryName: PropTypes.string.isRequired,
          categorySlug: PropTypes.string,
        }),
      ),
    }),
  ),
  onVideoSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
