import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'

const buildEmbedUrl = (url) => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtube.com')) {
      let videoId = ''
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/').pop()
      } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? ''
      } else if (parsed.pathname.length > 1) {
        videoId = parsed.pathname.replace('/', '')
      }
      const embedBase = videoId ? `https://www.youtube.com/embed/${videoId}` : url
      const params = new URLSearchParams()
      params.set('autoplay', '1')
      params.set('rel', '0')
      params.set('playsinline', '1')
      return `${embedBase}?${params.toString()}`
    }
    return url
  } catch {
    return url
  }
}

export function VideoPlayerOverlay({ video, onClose }) {
  const embedUrl = useMemo(() => buildEmbedUrl(video.mediaUrl), [video.mediaUrl])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="player-overlay" role="dialog" aria-modal="true">
      <button className="overlay-close" aria-label="Close player" onClick={onClose}>
        ×
      </button>
      <div className="player-frame">
        <div className="iframe-shell">
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="player-meta">
          <span className="category-chip">{video.categoryName}</span>
          <h2>{video.title}</h2>
          <p>Duration {video.duration ?? '—:—'}</p>
        </div>
      </div>
    </div>
  )
}

VideoPlayerOverlay.propTypes = {
  video: PropTypes.shape({
    title: PropTypes.string.isRequired,
    mediaUrl: PropTypes.string.isRequired,
    thumbnailUrl: PropTypes.string.isRequired,
    categoryName: PropTypes.string.isRequired,
    duration: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
}
